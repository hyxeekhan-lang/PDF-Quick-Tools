/**
 * PDF to Excel.
 *
 * A PDF has no tables in it. It has glyphs at coordinates and, at best, lines
 * drawn on the page — and plenty of PDFs have neither, presenting a table as
 * columns of text with nothing to mark them out. So the columns here are
 * inferred the same way the Word converter infers paragraphs: from where the
 * words actually sit, by finding the vertical gaps that repeat down the page.
 *
 * What comes out is a real .xlsx with real cells, so the numbers are numbers,
 * the columns line up and the totals work. What is not recovered is the
 * page's typography and any merged cells, and the page says so.
 */

import type { Report } from "#/hooks/useToolRun";
import {
  friendly,
  makeResult,
  sanitizeFilename,
  type ResultFile,
} from "./files";
import {
  extractDocument,
  type ExtractedPage,
  type ExtractedWord,
} from "./office-extract";
import { closeRender, openForRender } from "./pdf";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * A gap at least this many times a space's width separates two columns.
 *
 * The extractor's own column split treats a gap this size as a gutter; reusing
 * that figure means a two column article and a wide table row are judged by
 * one rule rather than two that might disagree.
 */
const CELL_GAP = 1.8;

/**
 * How many rows a gap must appear on before it counts as a column boundary.
 *
 * Low enough to catch a short three row table, high enough that an ordinary
 * paragraph — where one line happens to have a wide word space — does not
 * suddenly become a table with the rest of the page as a second column.
 */
const MIN_ROWS_PER_EDGE = 2;

export interface PdfToExcelResult {
  result: ResultFile;
  /** Every table found, in the order they appeared. */
  tables: number;
  /** Longest table, by row count. */
  rows: number;
  /** Widest table, by column count. */
  columns: number;
  /** Pages that had no text at all, so a scan can be reported clearly. */
  empty: number[];
}

export async function pdfToExcel(
  file: File,
  indexes: number[],
  report: Report,
): Promise<PdfToExcelResult> {
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

  report(85, "Writing your Excel workbook");

  const tables: Grid[] = [];
  let rows = 0;
  let columns = 0;
  for (const page of pages) {
    for (const grid of findTables(page)) {
      tables.push(grid);
      rows = Math.max(rows, grid.length);
      columns = Math.max(columns, Math.max(0, ...grid.map((r) => r.length)));
    }
  }

  if (tables.length === 0) {
    return friendly(
      "No tables were found in the pages you picked. This works on tabular data — a page of columns and rows. If your tables are inside a scan, run OCR PDF first so the text can be read.",
    );
  }

  const { bytes } = await buildWorkbook(tables);

  report(96, "Finishing up");
  const name = sanitizeFilename(file.name, "workbook").replace(/\.pdf$/i, "");
  return {
    result: makeResult(toBlobPart(bytes), `${name}.xlsx`, XLSX_MIME),
    tables: tables.length,
    rows,
    columns,
    empty,
  };
}

/* ------------------------------------------------------- finding the tables */

/** One array per row; a ragged row is padded when it is written. */
type Grid = string[][];

/**
 * Splits a page into its tables.
 *
 * The signal is a vertical gap that repeats. In a table, a boundary between
 * two columns appears on every single row, in roughly the same place. In a
 * paragraph of prose, wide gaps land in different places on each line and no
 * edge is ever reinforced. So the page is scanned for x positions that keep
 * recurring, and the text is bucketed by those, rather than by any structure
 * the PDF claims to have.
 *
 * It works from the page's raw words, not from its lines. The lines have
 * already been through a two column split meant for articles, and a row of
 * figures is indistinguishable from a two column layout until it is too late
 * — going through the lines loses two columns out of every four before any of
 * this can run.
 */
function findTables(page: ExtractedPage): Grid[] {
  if (page.rawWords.length < 2) return [];

  const body = bodySize(page.rawWords.map((w) => w.size));
  const minGap = body * CELL_GAP;

  // Words are grouped into rows by their baseline, then each row is cut into
  // cells wherever the gap between two words is wider than a column's worth of
  // space. Two passes over the same words, both cheap.
  const cells = rowsOfWords(page.rawWords).flatMap((row) => rowToCells(row, minGap));
  if (cells.length === 0) return [];

  // Every position where two cells on the same row leave a gap wider than a
  // space. These are the candidates for a column boundary.
  const edges: number[] = [];
  for (const row of rowsOfWords(cells)) {
    for (let i = 1; i < row.length; i += 1) {
      const gap = row[i].x - (row[i - 1].x + row[i - 1].width);
      if (gap > minGap) edges.push((row[i - 1].x + row[i - 1].width + row[i].x) / 2);
    }
  }
  if (edges.length === 0) return [];

  // An edge is real when it recurs. A boundary seen on only one or two rows is
  // a tab stop or a long word, not a column.
  const clustered = clusterEdges(edges, body * 0.8);
  const repeated = [...clustered.values()].filter(
    (group) => group.count >= MIN_ROWS_PER_EDGE,
  );
  if (repeated.length === 0) return [];

  const boundaries = repeated
    .map((group) => group.mid)
    .sort((a, b) => a - b)
    .filter((edge) => edge > pageMinX(page));

  if (boundaries.length === 0) return [];

  return runGroups(cells, boundaries).filter((grid) => grid.length >= 2);
}

/**
 * The size of the body text on a page, in whole points.
 *
 * Counted per word rather than per character, for the same reason the Word
 * converter counts per line: a page with a short large title over many words
 * of small text has fewer small characters than title characters, and
 * weighting by characters would crown the title as the body size and then
 * promote every real line to a heading.
 */
function bodySize(sizes: number[]): number {
  if (sizes.length === 0) return 11;
  const counts = new Map<number, number>();
  for (const size of sizes) {
    const bucket = Math.max(1, Math.round(size));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const needed = Math.max(1, Math.ceil(sizes.length * 0.4));
  for (const size of [...counts.keys()].sort((a, b) => a - b)) {
    if ((counts.get(size) ?? 0) >= needed) return size;
  }
  return Math.max(...counts.keys());
}

/** One word as a table cell: the same fields a Cell needs. */
type Word = ExtractedWord;

/**
 * Groups the page's words into the rows they belong to.
 *
 * Words sharing a baseline are one row. As in the extractor, the row's
 * baseline is fixed by its first word and never averaged, so a row cannot
 * drift down the page and swallow the rows below it.
 */
function rowsOfWords(words: Word[]): Word[][] {
  const rows: Word[][] = [];
  let current: Word[] = [];

  for (const word of [...words].sort((a, b) => b.y - a.y || a.x - b.x)) {
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
  return rows.map((row) => [...row].sort((a, b) => a.x - b.x));
}

/**
 * Cuts one row of words into cells, wherever a gap says a new one starts.
 *
 * A table row is several values that happen to share a baseline, and on the
 * page they only differ by how far apart they are. So a word sitting more than
 * a column's worth of space after the one before it starts a new cell, and the
 * words in between are joined.
 */
function rowToCells(row: Word[], minGap: number): Cell[] {
  if (row.length === 0) return [];

  const groups: Word[][] = [];
  let current: Word[] = [];
  let previousEnd = row[0].x + row[0].width;

  for (const word of row) {
    if (current.length > 0 && word.x - previousEnd > minGap) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    previousEnd = word.x + word.width;
  }
  groups.push(current);

  return groups.map((group) => ({
    text: group.map((w) => w.text).join(" "),
    x: group[0].x,
    y: group[0].y,
    size: group[0].size,
    width: Math.max(
      0,
      group[group.length - 1].x + group[group.length - 1].width - group[0].x,
    ),
  }));
}

interface Cell {
  text: string;
  x: number;
  y: number;
  size: number;
  width: number;
}

function pageMinX(page: ExtractedPage): number {
  return Math.min(...page.rawWords.map((w) => w.x));
}

function clusterEdges(edges: number[], tolerance: number): Map<number, { mid: number; count: number }> {
  const sorted = [...edges].sort((a, b) => a - b);
  const groups: { mid: number; count: number }[] = [];
  for (const edge of sorted) {
    const last = groups[groups.length - 1];
    if (last && edge - last.mid <= tolerance) {
      last.mid = (last.mid * last.count + edge) / (last.count + 1);
      last.count += 1;
    } else {
      groups.push({ mid: edge, count: 1 });
    }
  }
  return new Map(groups.map((group) => [Math.round(group.mid * 100), group]));
}

/**
 * Buckets cells into grids, using the recurring edges as the column dividers.
 *
 * Each cell lands in the column its left edge falls in, which is what keeps a
 * column of numbers right-aligned or centred inside its column instead of
 * drifting: the boundary is the middle of the gap, so a cell that starts
 * anywhere within its own column's space stays in it. A row that has no cell
 * in one of the columns gets an empty cell there, which is what makes the
 * grid rectangular.
 *
 * Runs of consecutive rows become one table, so a page with a table at the top
 * and another below it produces two sheets rather than one grid with a hole in
 * the middle of it.
 */
function runGroups(cells: Cell[], boundaries: number[]): Grid[] {
  const edges = [Number.NEGATIVE_INFINITY, ...boundaries, Number.POSITIVE_INFINITY];
  const grids: Grid[] = [];
  let grid: string[][] = [];
  let previousY: number | null = null;

  for (const row of rowsOfWords(cells)) {
    // A vertical jump much larger than the line spacing ends the table: below
    // it is a heading, a paragraph or a second table, not another row.
    if (previousY !== null && previousY - row[0].y > row[0].size * 3) {
      if (grid.length >= 2) grids.push(grid);
      grid = [];
    }
    previousY = row[0].y;

    const out: string[] = new Array(edges.length - 1).fill("");
    for (const cell of row) {
      const column = columnFor(cell.x, edges);
      if (column !== null) out[column] = cell.text;
    }
    if (out.some((value) => value !== "")) grid.push(out);
  }
  if (grid.length >= 2) grids.push(grid);

  return grids;
}

function columnFor(x: number, edges: number[]): number | null {
  for (let i = 1; i < edges.length - 1; i += 1) {
    if (x < edges[i]) return i - 1;
  }
  return edges.length >= 2 ? edges.length - 2 : null;
}

/* ----------------------------------------------------------- the writing */

async function buildWorkbook(tables: Grid[]): Promise<{ bytes: Uint8Array }> {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.creator = "PDF Quick Tools";
  book.created = new Date();

  // Excel's own names are fixed; a page called "Table 1" must not become a
  // sheet and quietly replace the one that is already there.
  const used = new Set<string>();
  for (const [index, table] of tables.entries()) {
    let name = index === 0 ? "Extracted" : `Table ${index + 1}`;
    let suffix = 2;
    while (used.has(name)) name = `Table ${index + 1}-${suffix++}`;
    used.add(name);

    const sheet = book.addWorksheet(name);
    const width = Math.max(...table.map((row) => row.length));

    sheet.columns = Array.from({ length: width }, () => ({ width: 22 }));

    for (const row of table) {
      const padded = [...row];
      while (padded.length < width) padded.push("");
      sheet.addRow(padded.map(coerce));
    }

    // The first row of an extracted table is nearly always its headings, and
    // marking it bold is what makes the sheet readable at a glance.
    const first = sheet.getRow(1);
    first.font = { bold: true };
    first.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F0FE" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const written = await book.xlsx.writeBuffer();
  return { bytes: new Uint8Array(written as ArrayBuffer) };
}

/**
 * Turns a cell's text into a number when it plainly is one.
 *
 * A PDF cannot say whether "1,200.00" was typed as text or as a currency
 * figure, and the only thing to go on is the characters. So the strict rules
 * win: thousands separators, an optional currency symbol, an optional sign and
 * an optional pair of brackets for negatives. Anything else — a date, a
 * percentage with a stray letter, "N/A" — stays text, because a sheet where
 * a date has silently become the number 45123 is worse than one where it
 * stays readable.
 */
function coerce(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const negative = /^\((.*)\)$/.exec(trimmed);
  const body = negative ? negative[1] : trimmed;
  const cleaned = body.replace(/^[$£€¥₹]\s*/, "").replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return trimmed;

  const number = Number(cleaned);
  if (!Number.isFinite(number)) return trimmed;
  return negative ? -number : number;
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.slice().buffer as ArrayBuffer;
}
