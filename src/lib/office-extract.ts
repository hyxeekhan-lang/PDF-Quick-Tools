import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Pulling words, with positions, out of a PDF.
 *
 * The Office converters all need the same thing: not just the text, but where
 * each word sat on the page. PDF → Word needs the order. PDF → Excel needs the
 * columns, which only exist as x-coordinates. PDF → PowerPoint needs the box
 * each paragraph filled.
 *
 * So it is read once here, from pdf.js, and shared. pdf.js is used rather than
 * anything else because it is already loaded for page previews, which keeps
 * this off the critical path for a user who has only just dropped a file.
 *
 * The ordering rule matters more than it looks. A PDF stores no reading order
 * at all — a two column page is genuinely just two sets of words at
 * coordinates. The rule here splits a page into vertical bands and reads each
 * band left to right, which recovers the ordinary case. It cannot recover a
 * genuinely ambiguous layout, and pretending otherwise would be worse than
 * saying so in the tool's own FAQ.
 */

/** One word, in PDF coordinates: points from the bottom-left of the page. */
export interface ExtractedWord {
  /** The word as printed. */
  text: string;
  x: number;
  y: number;
  /** Width in points. */
  width: number;
  /** Font height in points, from the text matrix. */
  size: number;
}

/** One line: words already in reading order. */
export interface ExtractedLine {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  /**
   * The words, kept separately with their own positions.
   *
   * The joined `text` is what reading order needs, but a table converter needs
   * the gaps between words — a cell boundary is a wide gap, and once the words
   * have been welded into one string with spaces there is no way to tell a
   * real gap from an inserted one. Keeping both costs nothing at extraction
   * time and saves the table converter from having to re-read the PDF.
   */
  words: ExtractedWord[];
}

/** Everything found on one page. */
export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  lines: ExtractedLine[];
  /** Total characters, used to spot a page with no usable text. */
  characters: number;
  /**
   * Every word on the page, in the order they were drawn.
   *
   * `lines` is the page after reading order has been imposed on it, and for
   * prose that is exactly what a reader wants. A table is the case where it
   * is not: a row of figures looks to the column splitter like a two column
   * article, so it is cut in half and two of the four columns are lost before
   * the table converter ever sees the page. Nothing downstream of a column
   * split can recover that, so the raw words are handed over as well and the
   * table converter works from those.
   */
  rawWords: ExtractedWord[];
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/** Minimum gap, as a multiple of font size, that counts as a column break. */
const COLUMN_GAP = 1.6;

/** Reads one page into positioned lines. */
export async function extractPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<ExtractedPage> {
  const page = await doc.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const words: ExtractedWord[] = [];
    for (const item of content.items as TextItem[]) {
      const text = item.str;
      if (!text || !text.trim()) continue;

      const [, , , , x, y] = item.transform;
      words.push({
        text: text.trim(),
        x,
        // pdf.js hands back a bottom-left origin already, so no flip is needed.
        y,
        width: item.width || 0,
        // The matrix's vertical scale is the rendered font height.
        size: Math.hypot(item.transform[1], item.transform[3]) || item.height || 0,
      });
    }

    // Columns are a property of the words, not of the finished lines: two
    // columns sharing a baseline merge into one line long before anything can
    // tell them apart, so the split has to happen first and each column is
    // then lined up on its own.
    const lines = splitWordsIntoColumns(words).flatMap(groupIntoLines);
    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      lines,
      characters: lines.reduce((total, line) => total + line.text.length, 0),
      rawWords: words,
    };
  } finally {
    page.cleanup();
  }
}

/** Reads every page of a document. */
export async function extractDocument(
  doc: PDFDocumentProxy,
  pageCount: number,
  indexes: number[] | null,
): Promise<ExtractedPage[]> {
  const wanted =
    indexes === null
      ? Array.from({ length: pageCount }, (_, i) => i)
      : indexes;
  const pages: ExtractedPage[] = [];
  for (const index of wanted) {
    pages.push(await extractPage(doc, index + 1));
  }
  return pages;
}

/**
 * Sorts words into reading order and merges them into lines.
 *
 * A PDF has no notion of a paragraph, only of glyphs at coordinates, so the
 * lines have to be reconstructed. Words that share a baseline are one line;
 * baselines are then sorted top to bottom.
 */
function groupIntoLines(words: ExtractedWord[]): ExtractedLine[] {
  if (words.length === 0) return [];

  // Group by baseline. Words of a similar size that sit on the same y are the
  // same line; the tolerance is the taller of the two font sizes, which keeps
  // a superscript from being pulled onto the line under it.
  const sorted = [...words].sort((a, b) => b.y - a.y);
  const rows: ExtractedWord[][] = [];
  let current: ExtractedWord[] = [];

  for (const word of sorted) {
    // Compare against the row that is being built, and never move that row's
    // baseline. A row is formed and then closed the moment a word clearly sits
    // below it; averaging the baseline as words arrive would let a row drift
    // down the page until it swallowed the ones after it.
    const anchor = current.length === 0 ? word.y : current[0].y;
    const tolerance = Math.max(word.size, 4) * 0.6;
    if (current.length === 0 || Math.abs(word.y - anchor) <= tolerance) {
      current.push(word);
    } else {
      rows.push(current);
      current = [word];
    }
  }
  if (current.length) rows.push(current);

  // Reading order within a row is left to right, and rows are read in the
  // order they were built, which is already top to bottom.
  return rows.map((row) => {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const text = joinWithSpaces(ordered);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    return {
      text,
      x: first.x,
      y: first.y,
      width: Math.max(0, last.x + last.width - first.x),
      size: ordered.reduce((max, w) => Math.max(max, w.size), 0),
      words: ordered,
    };
  });
}

/**
 * Rejoins words that were split mid-word by the PDF.
 *
 * A PDF generator is free to store "Northgate" as three separate draw calls, so
 * a line can come back as "North gate Sup plies". Words that touch, or that
 * are separated by less than a fraction of a space's width, were one word.
 */
function joinWithSpaces(words: ExtractedWord[]): string {
  let out = "";
  let previousEnd = 0;
  for (const word of words) {
    if (out.length > 0) {
      const gap = word.x - previousEnd;
      // A space in a proportional font is roughly a quarter of its em size.
      out += gap > word.size * 0.18 ? " " : "";
    }
    out += word.text;
    previousEnd = word.x + word.width;
  }
  return out.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------- two columns */

/**
 * Splits a page's words into columns, left to right.
 *
 * A single column returns one group. Two return two, the left one first,
 * which is what makes a two column article come out in the right sequence
 * instead of alternating across the page line by line.
 *
 * The boundary is the widest repeated horizontal gap between words sharing a
 * baseline. A gap wide enough to be a gutter cannot be an ordinary space,
 * because a space is a fraction of the font size.
 */
function splitWordsIntoColumns(words: ExtractedWord[]): ExtractedWord[][] {
  if (words.length === 0) return [];

  const byRow: ExtractedWord[][] = [];
  let current: ExtractedWord[] = [];
  for (const word of [...words].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const anchor = current.length === 0 ? word.y : current[0].y;
    if (current.length === 0 || Math.abs(word.y - anchor) <= Math.max(word.size, 4) * 0.6) {
      current.push(word);
    } else {
      byRow.push(current);
      current = [word];
    }
  }
  if (current.length) byRow.push(current);

  const bodySize = words.reduce((max, w) => Math.max(max, w.size), 0) || 10;
  const minGap = COLUMN_GAP * bodySize;

  // A gutter repeats. One wide gap is usually a tab stop, a stray number or a
  // table column; a real text column shows much the same gap on most rows.
  const edges: number[] = [];
  for (const row of byRow) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    for (let i = 1; i < ordered.length; i += 1) {
      const gap = ordered[i].x - (ordered[i - 1].x + ordered[i - 1].width);
      if (gap > minGap) edges.push(ordered[i - 1].x + ordered[i - 1].width + gap / 2);
    }
  }
  if (edges.length < 3) return [words];

  const edge = median(edges);
  const left = words.filter((w) => w.x + w.width / 2 < edge);
  const right = words.filter((w) => w.x + w.width / 2 >= edge);
  if (left.length === 0 || right.length === 0) return [words];

  // A lopsided split is a caption beside the text, not two columns.
  const share = Math.min(left.length, right.length) / Math.max(left.length, right.length);
  if (share < 0.25) return [words];

  return [left, right];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Exposed so its rules can be tested directly against the built module. */
export { splitWordsIntoColumns };
