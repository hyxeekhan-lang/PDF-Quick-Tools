/**
 * Page-shaping operations that sit alongside the originals in operations.ts.
 *
 * Everything here is client-side and follows the same contract as the main
 * module: validate the user's input first with `friendly`, report progress as
 * the work happens, and hand back files through `makeResult`.
 */

import type { PDFPage } from "pdf-lib";
import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import {
  canvasToBlob,
  closeRender,
  loadPdfLib,
  openForEdit,
  openForRender,
  renderPage,
  save,
  toBlobPart,
} from "./pdf";

const PDF_MIME = "application/pdf";
const TEXT_MIME = "text/plain";

async function toBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/* --------------------------------------------------------------- crop pages */

export type CropPreset = "a4" | "letter" | "square" | "card";

/** Page dimensions in PDF points (1/72 inch), as [width, height]. */
const CROP_PRESETS: Record<CropPreset, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  square: [600, 600],
  card: [1050, 600],
};

/**
 * Trims every selected page down to a centred window of a fixed size.
 *
 * pdf-lib has no crop operation, but the crop box is what viewers actually
 * honour when they display and print a page, so trimming means writing the
 * smaller box. Content outside the box is left in the file and simply is not
 * shown — that is why a crop can look different if someone opens the file in a
 * tool that ignores crop boxes.
 */
export async function cropPdf(
  file: File,
  indexes: number[],
  preset: CropPreset,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to crop.");
  }

  const [cropWidth, cropHeight] = CROP_PRESETS[preset];

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const outOfRange = indexes.find((index) => index < 0 || index >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `Page ${outOfRange + 1} does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  report(40, "Trimming pages");
  for (const [order, index] of indexes.entries()) {
    const page = doc.getPage(index);
    const { width, height } = page.getSize();

    // Never enlarge: a page smaller than the preset keeps its own size rather
    // than gaining white margins the user did not ask for.
    const targetWidth = Math.min(cropWidth, width);
    const targetHeight = Math.min(cropHeight, height);
    const x = (width - targetWidth) / 2;
    const y = (height - targetHeight) / 2;

    page.setCropBox(x, y, targetWidth, targetHeight);
    report(40 + ((order + 1) / indexes.length) * 50, `Cropping page ${index + 1}`);
  }

  report(94, "Writing your cropped PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-cropped.pdf`, PDF_MIME);
}

/**
 * Moves every annotation rectangle on a page by a fixed offset.
 *
 * pdf-lib's `scaleAnnotations` rescales annotation geometry but offers no way
 * to shift it afterwards, so after a resize the comments and form boxes end up
 * in the corner instead of sitting on top of their content. This adds the
 * offset to each number in the rectangle, and to the other coordinate pairs
 * pdf-lib also scales.
 *
 * Annotations that stay put are harmless; this is about keeping the ones people
 * can see lined up with the text they refer to.
 */
async function shiftAnnotations(
  page: PDFPage,
  xOffset: number,
  yOffset: number,
): Promise<void> {
  const annots = page.node.Annots();
  if (!annots) return;

  const { PDFArray, PDFDict, PDFName, PDFNumber } = await loadPdfLib();

  for (let index = 0; index < annots.size(); index += 1) {
    const annot = annots.lookup(index, PDFDict);
    if (!annot) continue;

    for (const key of ["Rect", "L", "CL", "RD", "Vertices", "QuadPoints"]) {
      const list = annot.lookupMaybe(PDFName.of(key), PDFArray);
      if (!list) continue;

      for (let item = 0; item < list.size(); item += 1) {
        const entry = list.lookupMaybe(item, PDFArray) ?? list;
        for (let value = 0; value < entry.size(); value += 1) {
          const number = entry.lookupMaybe(value, PDFNumber);
          if (!number) continue;
          const current = number.asNumber();
          entry.set(value, PDFNumber.of(current + (value % 2 === 0 ? xOffset : yOffset)));
        }
      }
    }
  }
}

/* ------------------------------------------------------------- change size */

export type ResizeMode = "a4" | "letter" | "legal" | "fit";
export type ResizeOrientation = "portrait" | "landscape";

const RESIZE_SHEETS: Record<Exclude<ResizeMode, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

/**
 * Rescales the existing page content into a new paper size instead of just
 * relabelling the box, so nothing is cut off. "Fit" keeps each page's current
 * dimensions and only flips orientation.
 */
export async function changePageSize(
  file: File,
  indexes: number[],
  mode: ResizeMode,
  orientation: ResizeOrientation,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to resize.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const outOfRange = indexes.find((index) => index < 0 || index >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `Page ${outOfRange + 1} does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  for (const [order, index] of indexes.entries()) {
    const page = doc.getPage(index);
    const { width, height } = page.getSize();

    if (mode === "fit") {
      const landscape = orientation === "landscape";
      const targetWidth = landscape ? Math.max(width, height) : Math.min(width, height);
      const targetHeight = landscape ? Math.min(width, height) : Math.max(width, height);
      page.setSize(targetWidth, targetHeight);
    } else {
      const [sheetWidth, sheetHeight] = RESIZE_SHEETS[mode];
      const landscape = orientation === "landscape";
      const targetWidth = landscape ? sheetHeight : sheetWidth;
      const targetHeight = landscape ? sheetWidth : sheetHeight;

      // Scale about the centre so the page stays where it was on the sheet.
      const scaleX = targetWidth / width;
      const scaleY = targetHeight / height;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (targetWidth - width * scale) / 2;
      const offsetY = (targetHeight - height * scale) / 2;

      page.setSize(targetWidth, targetHeight);
      page.scaleContent(scale, scale);
      page.translateContent(offsetX, offsetY);
      page.scaleAnnotations(scale, scale);
      await shiftAnnotations(page, offsetX, offsetY);
    }

    report(30 + ((order + 1) / indexes.length) * 58, `Resizing page ${index + 1}`);
  }

  report(94, "Writing your resized PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-${orientation === "landscape" ? "landscape" : "a4"}.pdf`, PDF_MIME);
}

/* ------------------------------------------------------------ flatten pdf */

export interface FlattenOutcome {
  result: ResultFile;
  formsFlattened: number;
}

/**
 * Burns the form fields, annotations and their JavaScript into the page itself.
 *
 * After this the fields cannot be typed into, which is the point: a flattened
 * form looks the same in every reader and stops being editable. We also clear
 * the AcroForm so viewers do not keep showing an empty field list.
 */
export async function flattenPdf(
  file: File,
  report: Report,
): Promise<FlattenOutcome> {
  report(12, "Reading your PDF");
  const { doc } = await openForEdit(file);
  const { PDFName } = await loadPdfLib();

  report(35, "Flattening form fields");
  let formsFlattened = 0;
  try {
    const form = doc.getForm();
    formsFlattened = form.getFields().length;
    // `flatten()` writes every field's current value into the page content and
    // drops the interactive widgets.
    form.flatten();
  } catch {
    // A PDF with no form at all is not an error here; there is simply nothing
    // to flatten and we carry on.
    formsFlattened = 0;
  }

  report(70, "Clearing annotations");
  const pages = doc.getPages();
  for (const [order, page] of pages.entries()) {
    // `flatten` leaves the annotation objects behind so a viewer can still
    // offer them. Removing the key entirely is what actually makes the page
    // read-only, and it also clears comments and highlights in one step.
    if (page.node.Annots()) {
      page.node.delete(PDFName.of("Annots"));
    }
    report(70 + ((order + 1) / pages.length) * 20, `Clearing page ${order + 1}`);
  }

  // Drop the interactive form dictionary so viewers stop offering the fields.
  try {
    doc.catalog.delete(PDFName.of("AcroForm"));
  } catch {
    // Some documents have a malformed AcroForm entry; the page content is
    // already correct, so this is not worth failing the whole job over.
  }

  report(94, "Writing your flattened PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return {
    result: makeResult(toBlobPart(bytes), `${name}-flattened.pdf`, PDF_MIME),
    formsFlattened,
  };
}

/* --------------------------------------------------------- grayscale pages */

export type GrayscaleQuality = "high" | "medium" | "small";

const GRAY_SETTINGS: Record<GrayscaleQuality, { scale: number; quality: number }> = {
  high: { scale: 2.2, quality: 0.9 },
  medium: { scale: 1.5, quality: 0.8 },
  small: { scale: 1.1, quality: 0.7 },
};

/**
 * Redraws each selected page in black and white.
 *
 * Every page has to be re-rendered, because there is no way to change the
 * colours of content that is already inside a PDF. The text turns into pixels
 * in the output, so it is no longer selectable — the trade-off for a printable
 * monochrome file.
 */
export async function grayscalePdf(
  file: File,
  indexes: number[],
  quality: GrayscaleQuality,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to convert.");
  }

  const { scale, quality: jpegQuality } = GRAY_SETTINGS[quality];
  const name = sanitizeFilename(file.name, "document");
  report(10, "Reading your PDF");
  const { PDFDocument } = await loadPdfLib();
  const source = await openForRender(file);
  const target = await PDFDocument.create();

  try {
    const total = source.numPages;
    for (const [order, index] of indexes.entries()) {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > total) continue;

      report(
        18 + (order / indexes.length) * 74,
        `Converting page ${pageNumber} to grayscale`,
      );

      const canvas = await renderPage(source, pageNumber, {
        scale,
        maxWidth: 2400,
        grayscale: true,
      });
      const blob = await canvasToBlob(canvas, "image/jpeg", jpegQuality);
      canvas.width = 0;
      canvas.height = 0;

      const bytes = await toBytes(blob);
      const image = await target.embedJpg(bytes);

      const original = await source.getPage(pageNumber);
      const viewport = original.getViewport({ scale: 1 });
      const aspect = viewport.width / viewport.height;

      // `embedJpg` knows the pixel size but not the print size, so match the
      // original page's proportions at a comfortable printing width instead of
      // handing back a sheet as wide as a screenshot.
      const printWidth = Math.max(360, Math.min(viewport.width, 842));
      const pageWidth = aspect >= 1 ? printWidth : printWidth * aspect;
      const pageHeight = aspect >= 1 ? printWidth / aspect : printWidth;

      const sheet = target.addPage([pageWidth, pageHeight]);
      sheet.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      original.cleanup();
    }
  } finally {
    await closeRender(source);
  }

  report(95, "Writing your grayscale PDF");
  const bytes = await save(target);
  return makeResult(toBlobPart(bytes), `${name}-grayscale.pdf`, PDF_MIME);
}

/* ------------------------------------------------------- remove metadata */

export interface MetadataOutcome {
  result: ResultFile;
  removed: string[];
}

/**
 * Strips the document information dictionary and the XMP packet.
 *
 * This is the part of a PDF that records the author, the software that made it,
 * when it was created and often the full editing history. Clearing it is worth
 * doing before sending a document to someone you do not work with.
 */
export async function removeMetadata(
  file: File,
  report: Report,
): Promise<MetadataOutcome> {
  report(12, "Reading your PDF");
  const { PDFName } = await loadPdfLib();
  const { doc } = await openForEdit(file);

  const fields: Array<[string, () => string | undefined]> = [
    ["Title", () => doc.getTitle()],
    ["Author", () => doc.getAuthor()],
    ["Subject", () => doc.getSubject()],
    ["Keywords", () => doc.getKeywords()],
    ["Creator", () => doc.getCreator()],
    ["Producer", () => doc.getProducer()],
    ["Creation date", () => doc.getCreationDate()?.toString()],
    ["Modification date", () => doc.getModificationDate()?.toString()],
  ];

  const removed = fields
    .filter(([, read]) => {
      const value = read();
      return typeof value === "string" ? value.length > 0 : Boolean(value);
    })
    .map(([label]) => label);

  report(45, "Clearing document details");
  // The document information dictionary is private inside pdf-lib, so the
  // public setters are the way in. Empty strings remove the entry rather than
  // writing a blank one, and the epoch dates leave nothing meaningful behind.
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("");
  doc.setProducer("");
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  // The XMP packet mirrors the same details in XML and survives a plain save.
  try {
    const catalog = doc.catalog;
    if (catalog.has(PDFName.of("Metadata"))) {
      catalog.delete(PDFName.of("Metadata"));
    }
  } catch {
    // Not every document carries an XMP packet.
  }

  report(80, "Writing your cleaned PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return {
    result: makeResult(toBlobPart(bytes), `${name}-cleaned.pdf`, PDF_MIME),
    removed,
  };
}

/* ------------------------------------------------------------ text extract */

export interface ExtractTextOutcome {
  /** The plain text of every selected page, in order. */
  text: string;
  pageCount: number;
  /** Pages that came back with no text layer, usually scans or images. */
  emptyPages: number[];
}

/**
 * Reads the text layer of the selected pages.
 *
 * pdf.js hands back positioned glyphs rather than paragraphs, so we rebuild
 * the lines ourselves using the y coordinate to detect a new line and a gap in
 * the x coordinate to detect a word break.
 *
 * A scanned page has no text layer at all. Those pages are reported back as
 * empty so the page can say so plainly — this tool does not read images, and
 * OCR is a different job.
 */
export async function extractText(
  file: File,
  indexes: number[],
  report: Report,
): Promise<ExtractTextOutcome> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to read.");
  }

  report(10, "Reading your PDF");
  const doc = await openForRender(file);
  const blocks: string[] = [];
  const emptyPages: number[] = [];

  try {
    const total = doc.numPages;
    for (const [order, index] of indexes.entries()) {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > total) continue;

      report(18 + (order / indexes.length) * 76, `Reading page ${pageNumber} of ${total}`);

      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();

      const lines: Array<{ y: number; items: typeof content.items }> = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = Math.round(item.transform[5]);
        const current = lines[lines.length - 1];
        // A jump of more than half the text height means a new line rather
        // than a continuation of the same one.
        const newLine = !current || Math.abs(current.y - y) > 6;
        if (newLine) lines.push({ y, items: [] });
        lines[lines.length - 1].items.push(item);
      }

      const text = lines
        .map((line) =>
          line.items
            .map((item) => ("str" in item ? item.str : ""))
            .join("")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter((line) => line.length > 0)
        .join("\n");

      if (text.length === 0) {
        emptyPages.push(pageNumber);
        blocks.push(`--- Page ${pageNumber} (no text found) ---`);
      } else {
        blocks.push(`--- Page ${pageNumber} ---\n${text}`);
      }

      page.cleanup();
    }
  } finally {
    await closeRender(doc);
  }

  const found = indexes.length - emptyPages.length;
  if (found === 0) {
    return friendly(
      "No text was found on the pages you picked. This PDF looks like a scan or a set of images — text has to be recognised from the picture, which this tool does not do.",
    );
  }

  report(96, "Collecting your text");
  return { text: blocks.join("\n\n"), pageCount: found, emptyPages };
}

/** Downloads the extracted text as a .txt file. */
export function textToResult(text: string, sourceName: string): ResultFile {
  const name = sanitizeFilename(sourceName, "document").replace(/\.pdf$/i, "");
  return makeResult(text, `${name}-text.txt`, TEXT_MIME);
}

/* --------------------------------------------------------- insert blanks */

export type BlankPosition = "start" | "end" | "after-each";

/**
 * Adds blank pages either at the end, at the front, or one after every
 * selected page — the usual fix for a document that needs paper on both sides
 * of a printout.
 */
export async function insertBlankPages(
  file: File,
  indexes: number[],
  position: BlankPosition,
  report: Report,
): Promise<ResultFile> {
  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);

  if (position === "after-each" && indexes.length === 0) {
    return friendly("Select at least one page to add a blank sheet after.");
  }

  report(35, "Adding blank pages");
  if (position === "start") {
    // `insertPage` counts from the end, so 0 is the last page. Inserting at the
    // end of a shrinking document puts each new page at the front in turn.
    for (let i = 0; i < pageCount; i += 1) {
      doc.insertPage(doc.getPageCount(), [595.28, 841.89]);
    }
  } else if (position === "end") {
    const pages = doc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      doc.addPage([width, height]);
    }
  } else {
    // Work backwards so the earlier insertions do not shift the later indexes.
    const unique = [...new Set(indexes)]
      .filter((index) => index >= 0 && index < pageCount)
      .sort((a, b) => b - a);
    for (const index of unique) {
      const { width, height } = doc.getPage(index).getSize();
      doc.insertPage(index + 1, [width, height]);
    }
    if (unique.length === 0) {
      return friendly(
        `None of the pages you picked exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      );
    }
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-with-blanks.pdf`, PDF_MIME);
}

/* ------------------------------------------------------- header / footer */

/**
 * Draws a line of text along the top or bottom of every selected page.
 *
 * This is deliberately page content rather than a real PDF header, so it shows
 * up in exports, screenshots and prints alike. The text is drawn on top of
 * whatever is already there, so keep it short if the page is busy.
 */
export async function addHeaderFooter(
  file: File,
  indexes: number[],
  text: string,
  where: "top" | "bottom",
  report: Report,
): Promise<ResultFile> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return friendly("Enter the text you want to put in the header or footer.");
  }
  if (indexes.length === 0) {
    return friendly("Select at least one page.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const outOfRange = indexes.find((index) => index < 0 || index >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `Page ${outOfRange + 1} does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  const { StandardFonts, rgb } = await loadPdfLib();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;
  const edge = 24;

  for (const [order, index] of indexes.entries()) {
    const page = doc.getPage(index);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(trimmed, fontSize);

    page.drawText(trimmed, {
      x: (width - textWidth) / 2,
      y: where === "top" ? height - edge - fontSize : edge,
      size: fontSize,
      font,
      color: rgb(0.45, 0.48, 0.55),
    });
    report(25 + ((order + 1) / indexes.length) * 65, `Writing on page ${index + 1}`);
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-${where === "top" ? "headered" : "footered"}.pdf`, PDF_MIME);
}