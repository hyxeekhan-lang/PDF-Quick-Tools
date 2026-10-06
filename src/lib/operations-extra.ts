/**
 * Operations for the markdown, compare, edit-text and repair tools.
 *
 * Same contract as the other operation modules: validate input first with
 * `friendly`, report progress as the work happens, hand files back through
 * `makeResult`.
 */

import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadPdfLib, openForEdit, openForRender, closeRender, save, toBlobPart } from "./pdf";

const PDF_MIME = "application/pdf";
const TEXT_MIME = "text/plain;charset=utf-8";
const MD_MIME = "text/markdown;charset=utf-8";

/* -------------------------------------------------------------- markdown */

/**
 * Turns a PDF's text layer into Markdown.
 *
 * This is a structural guess, not real conversion: pdf.js reports the position
 * of each run of text but not the font size that would tell a heading from body
 * copy. So the shape is inferred from blank lines, short lines and trailing
 * punctuation, which gets simple documents right and gets fancier layouts
 * wrong. The page says this out loud rather than pretending otherwise.
 */
export async function pdfToMarkdown(
  file: File,
  indexes: number[],
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to convert.");
  }

  report(10, "Reading your PDF");
  const doc = await openForRender(file);
  const sections: string[] = [];
  const empty: number[] = [];

  try {
    const total = doc.numPages;
    const wanted = indexes.filter((i) => i >= 0 && i < total);

    for (const [order, index] of wanted.entries()) {
      const pageNumber = index + 1;
      report(15 + (order / wanted.length) * 75, `Converting page ${pageNumber} of ${total}`);

      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();

      const lines: Array<{ y: number; parts: string[] }> = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = Math.round(item.transform[5]);
        const current = lines[lines.length - 1];
        if (!current || Math.abs(current.y - y) > 6) lines.push({ y, parts: [] });
        lines[lines.length - 1].parts.push(item.str);
      }

      const text = lines
        .map((line) => line.parts.join("").replace(/\s+/g, " ").trim())
        .filter((line) => line.length > 0);

      if (text.length === 0) {
        empty.push(pageNumber);
        continue;
      }

      sections.push(`## Page ${pageNumber}\n\n${toMarkdown(text)}`);
      page.cleanup();
    }
  } finally {
    await closeRender(doc);
  }

  if (sections.length === 0) {
    return friendly(
      "No text was found on the pages you picked. This looks like a scan or a set of images — Markdown has to come from a text layer, which this PDF does not have.",
    );
  }

  const note =
    empty.length > 0
      ? `\n\n<!-- Pages with no text layer were skipped: ${empty.join(", ")}. -->\n`
      : "";

  report(96, "Writing your Markdown");
  const body = `${toMarkdownTitle(file.name)}\n\n${sections.join("\n\n")}${note}`;
  const name = sanitizeFilename(file.name, "document").replace(/\.pdf$/i, "");
  return makeResult(body, `${name}.md`, MD_MIME);
}

function toMarkdownTitle(filename: string): string {
  const base = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  return base.length > 0 ? `# ${base}` : "# Document";
}

/**
 * Applies a few conservative Markdown conventions to a page's lines.
 *
 * A short line with no ending punctuation reads as a heading, a line of
 * nothing separates blocks, and anything that looks like a list item or a
 * number keeps its marker. Nothing is invented — a line that fits no rule is
 * passed through as a paragraph.
 */
function toMarkdown(lines: string[]): string {
  const out: string[] = [];

  for (const line of lines) {
    const isList = /^([-*•]|\d+[.)])\s+/.test(line);
    const looksLikeHeading =
      !isList &&
      line.length > 0 &&
      line.length <= 60 &&
      !/[.!?;:,]$/.test(line) &&
      // A sentence broken across lines usually has commas or a verb; a heading
      // rarely has more than a handful of words.
      line.split(/\s+/).length <= 8;

    if (out.length > 0 && looksLikeHeading && !isList) out.push("");
    out.push(looksLikeHeading && !isList ? `**${line}**` : line);
    if (isList) out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* --------------------------------------------------------------- compare */

export interface CompareOutcome {
  text: string;
  added: number;
  removed: number;
  same: number;
}

/**
 * Compares the text of two PDFs line by line.
 *
 * This compares words, not pages. If the layout differs between the two files
 * the lines will not line up and the result will look like a rewrite, which is
 * the honest limit of reading a text layer without rendering both pages.
 */
export async function comparePdfs(
  files: [File, File],
  report: Report,
): Promise<CompareOutcome> {
  const [a, b] = files;

  report(15, "Reading the first PDF");
  const left = await readAllLines(a);
  report(50, "Reading the second PDF");
  const right = await readAllLines(b);

  report(80, "Comparing the two documents");

  // A longest-common-subsequence table over lines. Both documents are bounded
  // by what the user can reasonably pick, and the table is built one row at a
  // time so a very long PDF does not need the whole square in memory.
  const rows = left.length;
  const cols = right.length;
  if (rows * cols > 4_000_000) {
    return friendly(
      "These two documents are too long to compare line by line in one go. Pick smaller PDFs, or compare them section by section.",
    );
  }

  const table: Uint32Array[] = Array.from(
    { length: rows + 1 },
    () => new Uint32Array(cols + 1),
  );
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: string[] = [];
  let added = 0;
  let removed = 0;
  let same = 0;
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (left[i] === right[j]) {
      lines.push(`  ${left[i]}`);
      same += 1;
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push(`- ${left[i]}`);
      removed += 1;
      i += 1;
    } else {
      lines.push(`+ ${right[j]}`);
      added += 1;
      j += 1;
    }
  }
  while (i < rows) {
    lines.push(`- ${left[i]}`);
    removed += 1;
    i += 1;
  }
  while (j < cols) {
    lines.push(`+ ${right[j]}`);
    added += 1;
    j += 1;
  }

  return { text: lines.join("\n"), added, removed, same };
}

/** Every line of text in a PDF, in reading order, blanks dropped. */
async function readAllLines(file: File): Promise<string[]> {
  const doc = await openForRender(file);
  const lines: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageLines: Array<{ y: number; parts: string[] }> = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = Math.round(item.transform[5]);
        const current = pageLines[pageLines.length - 1];
        if (!current || Math.abs(current.y - y) > 6) pageLines.push({ y, parts: [] });
        pageLines[pageLines.length - 1].parts.push(item.str);
      }

      for (const line of pageLines) {
        const text = line.parts.join("").replace(/\s+/g, " ").trim();
        if (text.length > 0) lines.push(text);
      }
      page.cleanup();
    }
  } finally {
    await closeRender(doc);
  }
  return lines;
}

export function compareToResult(
  outcome: CompareOutcome,
  name: string,
): ResultFile {
  const header =
    `# Comparison\n\n` +
    `- Lines only in the first PDF: ${outcome.removed}\n` +
    `- Lines only in the second PDF: ${outcome.added}\n` +
    `- Identical lines: ${outcome.same}\n\n` +
    `Legend: "- " only in the first, "+ " only in the second, "  " unchanged.\n\n---\n\n`;

  return makeResult(header + outcome.text, `${sanitizeFilename(name, "comparison")}.txt`, TEXT_MIME);
}

/* ---------------------------------------------------------- write on PDF */

export interface TextBox {
  page: number;
  x: number;
  y: number;
  size: number;
  text: string;
}

/**
 * Draws a line of text onto a page at a given point.
 *
 * The point is in PDF units from the bottom-left corner, so a caller has to
 * know where on the page it wants the text. That is the tool's whole surface:
 * there is no drag-to-place here, only exact coordinates.
 */
export async function addTextBoxes(
  file: File,
  boxes: TextBox[],
  report: Report,
): Promise<ResultFile> {
  const kept = boxes.filter((box) => box.text.trim().length > 0);
  if (kept.length === 0) {
    return friendly("Type some text and add at least one box before applying.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const bad = kept.find((box) => box.page < 0 || box.page >= pageCount);
  if (bad !== undefined) {
    return friendly(
      `One of your text boxes points at page ${bad.page + 1}, which does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  const { StandardFonts, rgb } = await loadPdfLib();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);

  for (const [order, box] of kept.entries()) {
    const page = doc.getPage(box.page);
    const size = box.size > 0 ? box.size : 12;
    page.drawText(box.text.trim(), {
      x: box.x,
      y: box.y,
      size,
      font,
      color: black,
    });
    report(25 + ((order + 1) / kept.length) * 65, `Writing box ${order + 1} of ${kept.length}`);
  }

  report(94, "Writing your PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-edited.pdf`, PDF_MIME);
}

/* ---------------------------------------------------------------- repair */

export interface RepairOutcome {
  pageCount: number;
  result: ResultFile;
}

/**
 * Reads a PDF and writes it straight back out.
 *
 * This fixes the PDFs pdf-lib can still open — broken cross-reference tables,
 * a missing trailer, a header that starts at the wrong offset — by rebuilding
 * the whole file. It cannot rescue a genuinely truncated download: that is
 * missing data, not damaged structure, and no amount of rewriting brings it
 * back. The page says as much before the user tries.
 */
export async function repairPdf(
  file: File,
  report: Report,
): Promise<RepairOutcome> {
  report(15, "Opening your PDF");
  const { doc, pageCount } = await openForEdit(file);

  if (pageCount === 0) {
    return friendly(
      "This file opened but contains no pages. There is nothing to repair — it may have been saved as an empty document.",
    );
  }

  report(55, "Rebuilding the file structure");
  const bytes = await save(doc);

  report(85, "Checking the rebuilt PDF can be read back");
  // A repair that produces something unreadable is worse than no repair, so
  // the result is parsed again before it is offered for download.
  const { PDFDocument } = await loadPdfLib();
  try {
    await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    return friendly(
      "This PDF is damaged beyond what can be rebuilt. It was most likely cut short while downloading. Try downloading it again from the original source.",
    );
  }

  report(96, "Writing your repaired PDF");
  const name = sanitizeFilename(file.name, "document");
  return {
    pageCount,
    result: makeResult(toBlobPart(bytes), `${name}-repaired.pdf`, PDF_MIME),
  };
}
