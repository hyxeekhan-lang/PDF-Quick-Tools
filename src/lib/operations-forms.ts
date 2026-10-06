/**
 * Operations for the form, redaction, highlight, embedding and bookmark tools.
 *
 * All client-side, same contract as the other operation modules: validate the
 * user's input first with `friendly`, report progress as the work happens, and
 * hand files back through `makeResult`.
 */

import type { PDFTextField } from "pdf-lib";
import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadPdfLib, openForEdit, save, toBlobPart } from "./pdf";

const PDF_MIME = "application/pdf";

/**
 * A rectangle drawn over part of a page, in PDF points from the bottom-left.
 * Used by both the redaction and the highlight tool, which differ only in the
 * colour and transparency they fill it with.
 */
export interface PageMark {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ------------------------------------------------------------ fill a form */

/**
 * Writes values into a PDF's existing AcroForm text fields.
 *
 * pdf-lib can create fields but filling one is mostly bookkeeping: the widget
 * annotation has to be found, its value set through the field object, and the
 * appearances regenerated or a viewer will show the old value until the field
 * is clicked.
 */
export async function fillPdfForm(
  file: File,
  values: Record<string, string>,
  report: Report,
): Promise<ResultFile> {
  const fields = Object.entries(values).filter(([, value]) => value.trim().length > 0);
  if (fields.length === 0) {
    return friendly("Fill in at least one field before applying.");
  }

  report(10, "Reading your PDF");
  const { doc } = await openForEdit(file);
  const form = doc.getForm();

  // getField throws rather than returning undefined for a name it does not
  // know, so each lookup is attempted and the result kept. The available set
  // is also what lets the page say "no fillable fields" before trying a write.
  const { PDFTextField } = await loadPdfLib();
  const targets: Array<[string, PDFTextField]> = [];
  for (const [name, value] of fields) {
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) targets.push([value.trim(), field]);
    } catch {
      // Not a field this document knows about.
    }
  }

  if (targets.length === 0) {
    return friendly(
      "This PDF has no fillable text fields matching what you filled in. It is probably a flat file with the boxes drawn in but nothing behind them — nothing to write into.",
    );
  }

  let filled = 0;
  for (const [order, [value, field]] of targets.entries()) {
    try {
      // setText is synchronous in pdf-lib; the await-free call is wrapped in
      // try/catch above only because a locked field can still throw.
      field.setText(value);
      filled++;
      report(30 + ((order + 1) / targets.length) * 60, `Writing field ${filled} of ${targets.length}`);
    } catch {
      // A read-only or otherwise unusable field should not stop the rest.
    }
  }

  if (filled === 0) {
    return friendly(
      "None of the fields you filled in could be written to. They may be locked or read-only in this document.",
    );
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(
    toBlobPart(bytes),
    `${name}-filled.pdf`,
    PDF_MIME,
  );
}

/** Field names a document exposes, paired with their current value. */
export async function readFormFields(
  file: File,
): Promise<Array<{ name: string; value: string }>> {
  const { doc } = await openForEdit(file);
  const { PDFTextField } = await loadPdfLib();
  const out: Array<{ name: string; value: string }> = [];
  doc.getForm().getFields().forEach((field) => {
    const name = field.getName();
    if (!name) return;
    // Only text fields carry a readable value; checkboxes and dropdowns would
    // need their own accessor, so they are left out of the fill-in list.
    const value = field instanceof PDFTextField ? field.getText() ?? "" : "";
    out.push({ name, value });
  });
  return out;
}

/* -------------------------------------------------------------- redaction */

/**
 * Draws opaque boxes over the selected areas of a page.
 *
 * This is a visual cover, not a removal. The text underneath is still in the
 * file and can be selected or searched, which is the difference between this
 * and a real redaction. The UI says so on the page.
 */
export async function redactPdf(
  file: File,
  marks: PageMark[],
  report: Report,
): Promise<ResultFile> {
  if (marks.length === 0) {
    return friendly("Draw at least one box over the text you want to cover.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const outOfRange = marks.find((mark) => mark.page < 0 || mark.page >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `One of your boxes points at page ${outOfRange.page + 1}, which does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  const { rgb } = await loadPdfLib();
  // Walk the pages once, drawing only that page's boxes, so progress can be
  // reported against real page numbers rather than the number of boxes.
  const touched = [...new Set(marks.map((mark) => mark.page))].sort((a, b) => a - b);

  for (const [order, index] of touched.entries()) {
    const page = doc.getPage(index);
    for (const mark of marks.filter((m) => m.page === index)) {
      page.drawRectangle({
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
        color: rgb(0, 0, 0),
      });
    }
    report(25 + ((order + 1) / touched.length) * 65, `Covering page ${index + 1}`);
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-redacted.pdf`, PDF_MIME);
}

/* -------------------------------------------------------------- highlight */

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

/** Fills, in RGB 0-1, matching the four swatches offered on the page. */
const HIGHLIGHT_RGB: Record<HighlightColor, [number, number, number]> = {
  yellow: [1, 0.92, 0.23],
  green: [0.56, 0.93, 0.56],
  blue: [0.55, 0.78, 1],
  pink: [1, 0.68, 0.78],
};

/**
 * Draws a translucent bar behind the given rectangles.
 *
 * Transparency is set through the PDF's blend mode rather than a light colour,
 * so text under the bar stays legible instead of being washed out.
 */
export async function highlightPdf(
  file: File,
  marks: PageMark[],
  color: HighlightColor,
  report: Report,
): Promise<ResultFile> {
  if (marks.length === 0) {
    return friendly("Draw at least one box over the text you want to highlight.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const outOfRange = marks.find((mark) => mark.page < 0 || mark.page >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `One of your boxes points at page ${outOfRange.page + 1}, which does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  const { rgb } = await loadPdfLib();
  const [r, g, b] = HIGHLIGHT_RGB[color];
  const touched = [...new Set(marks.map((mark) => mark.page))].sort((a, b) => a - b);

  for (const [order, index] of touched.entries()) {
    const page = doc.getPage(index);
    for (const mark of marks.filter((m) => m.page === index)) {
      page.drawRectangle({
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
        color: rgb(r, g, b),
        opacity: 0.45,
      });
    }
    report(25 + ((order + 1) / touched.length) * 65, `Highlighting page ${index + 1}`);
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-highlighted.pdf`, PDF_MIME);
}

/* -------------------------------------------------------- embed a file */

/**
 * Tucks another file inside the PDF as an attachment.
 *
 * The embedded copy travels with the PDF but does not display, so this is for
 * packing a document and its supporting files into one thing to send — not for
 * showing the attachment on a page.
 */
export async function embedFile(
  file: File,
  attachments: File[],
  report: Report,
): Promise<ResultFile> {
  if (attachments.length === 0) {
    return friendly("Choose at least one file to embed.");
  }

  report(10, "Reading your PDF");
  const { doc } = await openForEdit(file);

  for (const [order, attachment] of attachments.entries()) {
    report(
      25 + ((order + 1) / attachments.length) * 62,
      `Embedding ${attachment.name}`,
    );
    const bytes = new Uint8Array(await attachment.arrayBuffer());
    await doc.attach(bytes, attachment.name, {
      description: `Attached via ${file.name}`,
      creationDate: new Date(),
    });
  }

  report(94, "Writing your PDF");
  const out = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(out), `${name}-with-attachments.pdf`, PDF_MIME);
}

/* ------------------------------------------------------------- bookmarks */

/**
 * Builds the document outline (the bookmarks panel in a PDF viewer).
 *
 * pdf-lib exposes no outline API, so the catalog dictionaries are written
 * directly against the low-level context. A flat list of entries pointing at
 * their own page is a single-level table of contents; nesting would need a
 * parent/child chain, which is not something this tool offers.
 */
export async function addBookmarks(
  file: File,
  marks: Array<{ page: number; title: string }>,
  report: Report,
): Promise<ResultFile> {
  const kept = marks.filter((mark) => mark.title.trim().length > 0);
  if (kept.length === 0) {
    return friendly("Add at least one bookmark with a title.");
  }

  report(10, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const bad = kept.find((mark) => mark.page < 0 || mark.page >= pageCount);
  if (bad !== undefined) {
    return friendly(
      `Bookmark "${bad.title}" points at page ${bad.page + 1}, which is past the end. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  report(35, "Building the outline");
  // PDFDict's constructor is protected, so dicts are built through the
  // context's `obj` helper instead, which is the supported way to make one.
  const { PDFName, PDFString, PDFDict } = await loadPdfLib();
  const context = doc.context;
  const name = (value: string) => PDFName.of(value);

  const outlinesRef = context.nextRef();
  const outlines = context.obj({ Type: name("Outlines"), Count: kept.length });
  outlines.set(name("First"), context.obj({}));
  outlines.set(name("Last"), context.obj({}));

  let previousRef: ReturnType<typeof context.nextRef> | undefined;

  for (const [order, mark] of kept.entries()) {
    const ref = context.nextRef();
    const pageRef = doc.getPage(mark.page).ref;
    const dict = context.obj({});
    dict.set(name("Title"), PDFString.of(mark.title.trim()));
    dict.set(name("Parent"), outlinesRef);
    dict.set(name("Dest"), context.obj([pageRef, name("XYZ"), null, null, null]));
    if (previousRef) {
      dict.set(name("Prev"), previousRef);
      context.lookup(previousRef, PDFDict).set(name("Next"), ref);
    } else {
      outlines.set(name("First"), ref);
    }
    context.assign(ref, dict);
    previousRef = ref;
    report(35 + ((order + 1) / kept.length) * 55, `Adding "${mark.title.slice(0, 30)}"`);
  }
  outlines.set(name("Last"), previousRef ?? context.obj({}));

  context.assign(outlinesRef, outlines);
  doc.catalog.set(name("Outlines"), outlinesRef);
  doc.catalog.set(name("PageMode"), name("UseOutlines"));

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const safeName = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${safeName}-bookmarked.pdf`, PDF_MIME);
}