/**
 * Word documents (.docx) to PDF.
 *
 * A .docx is a zip of XML, so it can be unpacked in the browser and read
 * without anything being uploaded. `mammoth` does the unpacking and turns the
 * document into HTML; this module then lays that HTML out onto PDF pages.
 *
 * What survives the trip, and what does not, is worth being straight about.
 * Headings, paragraphs, bold, italic, lists and tables all come through, and
 * images are carried over. Precise Word layout does not: Word's column and
 * page-break rules, exact fonts and anything drawn in a text box are not
 * represented, so the PDF is a clean reading of the document rather than a
 * pixel copy of it. That is the honest trade for doing this without a
 * server, and the tool's own FAQ says so in as many words.
 */

import type { PDFFont, PDFImage, PDFDocument } from "pdf-lib";
import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadPdfLib, save, toBlobPart } from "./pdf";

const PDF_MIME = "application/pdf";

/** A4 at 72dpi, which is what Word calls Letter's slightly larger cousin. */
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

/** Only .docx. The old binary .doc is a different format with no browser reader. */
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface WordToPdfResult {
  result: ResultFile;
  /** Pages the produced PDF ended up with, shown to the user as a stat. */
  pages: number;
  /** Images carried over from the document, if any. */
  images: number;
}

export async function wordToPdf(
  file: File,
  report: Report,
): Promise<WordToPdfResult> {
  if (!isDocx(file)) {
    return friendly(
      'This tool reads Word ".docx" files. If yours ends in .doc, open it in Word and use Save As to make a .docx first — the old format is a different kind of file and cannot be read here.',
    );
  }

  report(10, "Reading your Word document");
  const html = await convertDocxToHtml(file, report);

  if (!html.trim()) {
    return friendly(
      "That document did not contain any readable text, so there was nothing to turn into a PDF.",
    );
  }

  report(55, "Laying out your pages");
  const { bytes, pages, images } = await htmlToPdf(html, report);

  report(95, "Writing your PDF");
  const name = sanitizeFilename(file.name.replace(/\.docx$/i, ""), "document");
  return {
    result: makeResult(toBlobPart(bytes), `${name}.pdf`, PDF_MIME),
    pages,
    images,
  };
}

function isDocx(file: File): boolean {
  return (
    file.type === DOCX_MIME ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

/**
 * Unpacks the document and flattens it to HTML.
 *
 * The whole result is asked for in one call — text, styles and images
 * together — because mammoth streams its image converters and dropping them
 * between passes silently produces a document with the pictures missing.
 */
async function convertDocxToHtml(file: File, report: Report): Promise<string> {
  report(25, "Reading your Word document");
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      // Data URIs keep the picture inside the HTML string, so there is no
      // second round trip to unzip the media folder separately.
      convertImage: mammoth.images.dataUri,
    },
  );

  // Warnings here are usually unsupported Word features — a text box, an
  // embedded object. They are worth surfacing rather than swallowing, because
  // their absence is exactly what a user would otherwise report as a bug.
  const messages = (result.messages ?? [])
    .map((message) => String(message?.message ?? ""))
    .filter(Boolean);
  if (messages.length > 0) {
    console.info(
      `[word-to-pdf] ${messages.length} feature(s) in this document were not carried over.`,
    );
  }

  return result.value ?? "";
}

interface StyleFlags {
  bold?: boolean;
  italic?: boolean;
}

/** One laid-out run of text, or a picture, waiting to be placed. */
interface Block {
  kind: "text" | "image";
  lines?: TextLine[];
  dataUri?: string;
}

interface TextLine extends StyleFlags {
  text: string;
  size: number;
  /** Extra space above, in points. Headings and list items carry some. */
  spaceBefore: number;
}

/**
 * Lays HTML out onto PDF pages.
 *
 * The layout is deliberately simple: one column, text wrapped to the page
 * width, flowing onto a new page when it runs out of room. Word's own layout
 * is a great deal more subtle, and pretending to reproduce it here would
 * produce pages that look wrong in ways that are hard to explain.
 */
async function htmlToPdf(html: string, report: Report): Promise<{
  bytes: Uint8Array;
  pages: number;
  images: number;
}> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  const blocks = parseHtml(html);
  let images = 0;

  let page = doc.addPage([A4.width, A4.height]);
  let cursor = A4.height - MARGIN;

  const newPage = () => {
    page = doc.addPage([A4.width, A4.height]);
    cursor = A4.height - MARGIN;
  };

  const ensureRoom = (needed: number) => {
    if (cursor - needed < MARGIN) newPage();
  };

  for (const block of blocks) {
    if (block.kind === "text" && block.lines) {
      for (const line of block.lines) {
        if (line.text.length === 0) {
          cursor -= 6;
          continue;
        }
        cursor -= line.spaceBefore;
        const wrapped = wrapText(
          line.text,
          line.size,
          CONTENT_WIDTH,
          fontFor(line, { regular, bold, italic, boldItalic }),
        );
        for (const piece of wrapped) {
          const height = piece.size * 1.35;
          ensureRoom(height);
          page.drawText(piece.text, {
            x: MARGIN,
            y: cursor - piece.size,
            size: piece.size,
            font: piece.font,
            color: rgb(0.1, 0.1, 0.12),
          });
          cursor -= height;
        }
      }
      continue;
    }

    // A picture. Its height is derived from the pixel size so the PDF keeps
    // the original proportions rather than stretching it to the page width.
    const image = await embedImage(doc, block.dataUri ?? "");
    if (!image) {
      cursor -= 12;
      continue;
    }
    images += 1;
    const scale = Math.min(1, CONTENT_WIDTH / image.width);
    const width = image.width * scale;
    const height = image.height * scale;
    if (height > A4.height - MARGIN * 2) {
      newPage();
    }
    ensureRoom(height);
    page.drawImage(image.image, {
      x: MARGIN,
      y: cursor - height,
      width,
      height,
    });
    cursor -= height + 12;
  }

  report(80, "Writing your PDF");
  return { bytes: await save(doc), pages: doc.getPageCount(), images };
}

/* ------------------------------------------------------------- the parsing */

/** Chooses the matching built-in font for a run. */
function fontFor(
  line: TextLine,
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    boldItalic: PDFFont;
  },
): PDFFont {
  if (line.bold && line.italic) return fonts.boldItalic;
  if (line.bold) return fonts.bold;
  if (line.italic) return fonts.italic;
  return fonts.regular;
}

interface WrappedPiece {
  text: string;
  size: number;
  font: PDFFont;
}

/**
 * Wraps a line to the page width.
 *
 * Built-in PDF fonts have no kerning table and no ligatures, so a word wider
 * than the line — a long URL, say — has to be broken by character or it would
 * run off the page.
 */
function wrapText(
  text: string,
  size: number,
  maxWidth: number,
  font: PDFFont,
): WrappedPiece[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ text: "", size, font }];

  const pieces: WrappedPiece[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line.length === 0 ? word : `${line} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line.length > 0) pieces.push({ text: line, size, font });
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
    } else {
      // A single word too wide for the page: break it by character.
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) {
          pieces.push({ text: chunk, size, font });
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }
  }
  if (line.length > 0) pieces.push({ text: line, size, font });
  return pieces;
}

/**
 * Turns the HTML into a flat list of blocks.
 *
 * The DOM is walked rather than pattern-matched, because Word's HTML is
 * ordinary HTML — tables in particular nest, and a regular expression gets
 * that wrong in ways that are hard to see and easy to hit.
 */
function parseHtml(html: string): Block[] {
  const parser = new DOMParser();
  const dom = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const blocks: Block[] = [];

  const walk = (node: Element, style: StyleFlags, headingSize: number, listDepth: number) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      const nextStyle: StyleFlags = {
        bold: style.bold || tag === "strong" || tag === "b",
        italic: style.italic || tag === "em" || tag === "i",
      };

      if (tag === "img") {
        const src = child.getAttribute("src") ?? "";
        if (src.startsWith("data:")) blocks.push({ kind: "image", dataUri: src });
        continue;
      }

      if (tag === "table") {
        walkTable(child, nextStyle, blocks);
        continue;
      }

      if (tag === "p" || tag === "div" || /^h[1-6]$/.test(tag)) {
        const size = /^h[1-6]$/.test(tag)
          ? Math.max(11, headingSize - (Number(tag[1]) - 1) * 2.5)
          : headingSize;
        const text = textOf(child).trim();
        if (text) {
          blocks.push({
            kind: "text",
            lines: [
              {
                text,
                size,
                spaceBefore: /^h[1-6]$/.test(tag) ? size * 0.6 : listDepth > 0 ? 2 : 8,
                ...nextStyle,
              },
            ],
          });
        }
        walk(child, nextStyle, size, listDepth);
        continue;
      }

      if (tag === "li") {
        const text = textOf(child).trim();
        if (text) {
          const indent = "    ".repeat(listDepth);
          blocks.push({
            kind: "text",
            lines: [
              {
                text: `${indent}•  ${text}`,
                size: headingSize,
                spaceBefore: 3,
                ...nextStyle,
              },
            ],
          });
        }
        walk(child, nextStyle, headingSize, listDepth + 1);
        continue;
      }

      walk(child, nextStyle, headingSize, listDepth);
    }
  };

  walk(dom.body, {}, 11, 0);
  return blocks;
}

/** Lays a table out as rows of monospaced-ish text with column gutters. */
function walkTable(table: Element, style: StyleFlags, blocks: Block[]): void {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return;

  const columns = Math.max(...rows.map((row) => row.querySelectorAll("td, th").length));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("td, th")).map((cell) =>
      textOf(cell).trim(),
    );
    if (cells.every((cell) => cell.length === 0)) continue;
    const isHeader = row.querySelector("th") !== null;
    const line = padCells(cells, columns, isHeader);
    blocks.push({
      kind: "text",
      lines: [{ text: line, size: 10, spaceBefore: 4, ...style, bold: style.bold || isHeader }],
    });
  }
}

/** Spreads cells across the line width using fixed columns. */
function padCells(cells: string[], columns: number, _isHeader: boolean): string {
  if (columns <= 1) return cells.join(" ");
  const width = Math.max(12, Math.floor(78 / columns));
  return cells
    .map((cell, index) => (index === 0 ? cell : cell.padStart(width)))
    .join(" ")
    .trimEnd();
}

/** All the text under a node, with runs kept apart so style can be read. */
function textOf(node: Element): string {
  return (node.textContent ?? "").replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ images */

async function embedImage(
  doc: PDFDocument,
  dataUri: string,
): Promise<{ image: PDFImage; width: number; height: number } | null> {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUri);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  try {
    const image =
      kind === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    return { image, width: image.width, height: image.height };
  } catch {
    // A format pdf-lib will not take — a TIFF, or a WMF that survived as a
    // picture. Skipping it is better than failing the whole document.
    return null;
  }
}