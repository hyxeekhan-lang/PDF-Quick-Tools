/**
 * PDF to Word.
 *
 * This is the reverse of the Word → PDF tool, and it is a reconstruction
 * rather than a copy — because a PDF has no idea what a paragraph is. It
 * stores glyphs at coordinates and nothing else, so a heading, a body line and
 * a table row are the same three things on disk: words at slightly different
 * heights. The document has to be inferred back out of the geometry, which is
 * why the result is editable and readable rather than identical.
 *
 * What is inferred, and how:
 *
 *   - Font size, which is in the text matrix, gives the hierarchy. A line
 *     noticeably larger than the body text is a heading.
 *   - Vertical gaps separate paragraphs. A gap much bigger than the usual
 *     line spacing is a paragraph break; the default is just the next line.
 *   - Left indent marks a list item.
 *
 * What is not recovered, and the page says so: the original fonts (Word gets
 * the text, not the typeface), columns, tables as tables, and anything drawn
 * rather than typed.
 */

import type { Report } from "#/hooks/useToolRun";
import {
  friendly,
  makeResult,
  sanitizeFilename,
  type ResultFile,
} from "./files";
import { extractDocument, type ExtractedLine, type ExtractedPage } from "./office-extract";
import { closeRender, openForRender, toBlobPart } from "./pdf";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * A line at least this many points taller than the body text is a heading.
 *
 * Word's own heading levels run about 1.2× to 2× body size, so the threshold
 * sits below the smallest of those. Anything less is treated as emphasis
 * within a paragraph rather than a heading of its own, which is the safer
 * mistake: a heading that is really body text breaks the document, whereas the
 * reverse merely loses a bit of structure.
 */
const HEADING_RATIO = 1.15;

/**
 * A vertical gap larger than this multiple of the line height is a paragraph
 * break rather than the next line of the same one.
 *
 * Word's default single spacing is about 1.15 the line height, and a space
 * between paragraphs adds roughly that much again, so the threshold sits just
 * above ordinary leading and well below a real blank line.
 */
const PARAGRAPH_GAP = 1.55;

/** Body text size, in points, for a PDF that does not say. */
const FALLBACK_SIZE = 11;

export interface PdfToWordResult {
  result: ResultFile;
  pages: number;
  /** Pages that had no text at all, so a scan can be reported clearly. */
  empty: number[];
  /** Lines that read as headings, as a stat. */
  headings: number;
}

export async function pdfToWord(
  file: File,
  indexes: number[],
  report: Report,
): Promise<PdfToWordResult> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to convert.");
  }

  report(8, "Reading your PDF");
  const doc = await openForRender(file);

  let pages: ExtractedPage[];
  let pageCount: number;
  try {
    pageCount = doc.numPages;
    const wanted = indexes.filter((i) => i >= 0 && i < pageCount);
    if (wanted.length === 0) {
      return friendly("None of the pages you picked exist in this PDF.");
    }

    const read: ExtractedPage[] = [];
    for (const [order, index] of wanted.entries()) {
      report(
        12 + (order / wanted.length) * 68,
        `Reading page ${index + 1} of ${pageCount}`,
      );
      read.push((await extractDocument(doc, pageCount, [index]))[0]);
    }
    pages = read;
  } finally {
    await closeRender(doc);
  }

  const empty = pages.filter((page) => page.characters === 0).map((p) => p.pageNumber);

  if (empty.length === pages.length) {
    return friendly(
      "None of the pages you picked have any text in them. This PDF is a scan or a set of images — run it through OCR PDF first, which will put a text layer on the pages, and then this tool will work on it.",
    );
  }

  report(85, "Writing your Word document");
  const { bytes, headings } = await buildDocx(pages);

  report(96, "Finishing up");
  const name = sanitizeFilename(file.name, "document").replace(/\.pdf$/i, "");
  return {
    result: makeResult(toBlobPart(bytes), `${name}.docx`, DOCX_MIME),
    pages: pages.length - empty.length,
    empty,
    headings,
  };
}

/* ------------------------------------------------------------- the writing */

interface Para {
  text: string;
  /** 0 is body text, 1 is the largest heading. */
  level: number;
  /** Baseline of the last line folded in, for the next gap comparison. */
  lastY: number;
  /** Left edge of the paragraph so far; a line further left continues it. */
  left: number;
}

/**
 * Turns a page's lines into paragraphs.
 *
 * The body size is measured from the page rather than assumed, because a PDF
 * full of 9pt footnotes would otherwise have every line promoted to a heading.
 * The most common size on the page is the body, and anything meaningfully
 * larger than it is a heading.
 */
function toParagraphs(lines: ExtractedLine[]): Para[] {
  if (lines.length === 0) return [];

  // Reading order is top to bottom, which for a single column means descending
  // y. The two-column case arrives already split, so it is flattened back into
  // one top-to-bottom sequence before the gaps between lines are measured.
  const ordered = [...lines].sort((a, b) => b.y - a.y || a.x - b.x);
  const body = bodySize(ordered);
  const out: Para[] = [];
  let current: Para | null = null;

  for (const line of ordered) {
    const height = Math.max(line.size, 1);
    const level = headingLevel(line.size, body);

    if (current !== null) {
      // PDF y grows upward, so moving down the page makes it smaller. The gap
      // is the drop from the previous line's baseline to this one.
      const gap = current.lastY - line.y;
      const sameIndent = Math.abs(line.x - current.left) < body * 0.6;
      // A new paragraph is a bigger-than-normal jump, or a change of level,
      // or a line that starts somewhere else entirely.
      const breaks =
        gap > height * PARAGRAPH_GAP ||
        level !== current.level ||
        !sameIndent;

      if (!breaks) {
        // A space, not a template literal that is then trimmed — trimming a
        // leading space removes the very separator being added, which welds
        // consecutive lines into one run-on word at the seam.
        current.text += ` ${line.text}`;
        current.lastY = line.y;
        current.left = Math.min(current.left, line.x);
        continue;
      }
      out.push(current);
    }

    current = { text: line.text, level, lastY: line.y, left: line.x };
  }

  if (current) out.push(current);

  return out;
}

/**
 * The size of the body text on a page, in whole points.
 *
 * Counted per LINE rather than per character, and then taken as the smallest
 * size that still accounts for a decent share of the page.
 *
 * Weighting by characters sounds more robust and is not: a page that is one
 * short 24pt title over two lines of 11pt body has fewer body characters than
 * title characters, so the title wins — and then every real line is "larger
 * than the body" and gets promoted to a heading. Counting lines has the
 * opposite bias, which is the one that helps, because a heading is a line or
 * two and never the bulk of a page.
 */
function bodySize(lines: ExtractedLine[]): number {
  if (lines.length === 0) return FALLBACK_SIZE;

  const counts = new Map<number, number>();
  for (const line of lines) {
    const bucket = Math.max(1, Math.round(line.size));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  // A share of the page, so a page carrying several font sizes still settles
  // on the one doing most of the reading rather than the biggest one present.
  const needed = Math.max(1, Math.ceil(lines.length * 0.4));
  for (const size of [...counts.keys()].sort((a, b) => a - b)) {
    if ((counts.get(size) ?? 0) >= needed) return size;
  }

  return Math.max(...counts.keys());
}

function headingLevel(size: number, bodySize: number): number {
  const ratio = size / bodySize;
  if (ratio < HEADING_RATIO) return 0;
  // Mapped onto Word's six heading levels so the result stays editable in a
  // way that behaves like a document rather than a wall of bold text.
  const level = Math.round(Math.log2(ratio) * 1.6);
  return Math.min(6, Math.max(1, level));
}

async function buildDocx(
  pages: ExtractedPage[],
): Promise<{ bytes: Uint8Array; headings: number }> {
  const { Document, HeadingLevel, Packer, Paragraph } = await import("docx");

  const headingLevels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  let headings = 0;
  const body: InstanceType<typeof Paragraph>[] = [];

  for (const page of pages) {
    const paragraphs = toParagraphs(page.lines);
    for (const para of paragraphs) {
      if (para.level > 0) headings += 1;
      body.push(
        new Paragraph({
          text: para.text,
          ...(para.level > 0 ? { heading: headingLevels[para.level - 1] } : {}),
        }),
      );
    }
    // A page break between pages, so the Word document runs page for page
    // with the PDF rather than flowing into one very long document.
    if (page !== pages[pages.length - 1] && paragraphs.length > 0) {
      body.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }
  }

  const doc = new Document({ sections: [{ children: body }] });

  // The output type is asked for explicitly as an ArrayBuffer rather than
  // through `toBuffer`. The library's Buffer path sniffs for Node's Buffer,
  // and several of its bundled dependencies install a partial shim whose
  // isBuffer reports true in a browser — so the Node path throws "nodebuffer
  // is not supported by this platform" while the ArrayBuffer path works
  // everywhere and is all this tool needs.
  const bytes = new Uint8Array(
    await Packer.toArrayBuffer(doc),
  );

  return { bytes, headings };
}

