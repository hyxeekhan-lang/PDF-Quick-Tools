/**
 * Excel to PDF.
 *
 * A spreadsheet is a grid and a PDF page is a fixed piece of paper, so the work
 * here is entirely about fit: how wide the columns are, how much of the page
 * they take, and what happens to the rows that will not fit on the page they
 * started on. Column widths come from the sheet where it set them and from the
 * text itself where it did not, so a sheet nobody ever formatted still comes
 * out readable.
 *
 * Numbers, bold, alignment and fills are carried over, because a sheet is
 * usually a report and the formatting is part of the report. Formulas are not
 * recalculated — whatever value Excel last stored in a cell is what gets
 * printed, which is right in almost every case and is stated on the page.
 */

import { rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { Cell, Worksheet } from "exceljs";
import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadPdfLib, toBlobPart } from "./pdf";

/** A4 at 72 points to the inch — what a spreadsheet is expected to print on. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 36;

/** Below this a column is not worth printing. */
const MIN_COLUMN = 18;

/** Past this the text has shrunk far enough; the page just stops shrinking. */
const MIN_FONT = 5;

/** Room a page always leaves for the heading rows it repeats. */
const HEADER_ROOM = 26;

/** A book with dozens of sheets is a mistake more often than an intent. */
const MAX_SHEETS = 20;

/** How far down to look for a sheet's headings. */
const HEADER_SCAN_ROWS = 12;

/** Excel measures a column width in characters of the default font. */
const EXCEL_WIDTH_UNIT = 7;

export type Orientation = "portrait" | "landscape";
export type FitMode = "fit" | "actual";

export interface ExcelToPdfResult {
  result: ResultFile;
  sheets: number;
  pages: number;
  rows: number;
  columns: number;
}

export async function excelToPdf(
  file: File,
  options: { sheets: "all" | "first"; orientation: Orientation; fit: FitMode },
  report: Report,
): Promise<ExcelToPdfResult> {
  report(6, "Opening your workbook");

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return friendly(
      "That file could not be read. It may have been moved or renamed since you picked it.",
    );
  }

  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();

  try {
    await book.xlsx.load(bytes);
  } catch {
    return friendly(
      `"${file.name}" could not be opened as an Excel workbook. If it is an old .xls or a .csv, open it in Excel and use Save As to make a .xlsx first.`,
    );
  }

  const filled = book.worksheets.filter((sheet) => sheet.rowCount > 0);
  if (filled.length === 0) {
    return friendly("That workbook has no rows in any of its sheets, so there is nothing to put on a page.");
  }

  const chosen = (options.sheets === "first" ? filled.slice(0, 1) : filled).slice(0, MAX_SHEETS);
  if (filled.length > chosen.length) {
    // Said plainly rather than silently dropping the rest of the book.
    report(10, `${filled.length} sheets found — converting the first ${chosen.length}`);
  }

  report(14, "Laying out the sheets");
  const grids = chosen.map((sheet) => readSheet(sheet));

  if (grids.every((grid) => grid.rows.length === 0)) {
    return friendly("None of the sheets in this workbook have any rows in them.");
  }

  report(22, "Drawing the pages");
  const drawn = await writePdf(grids, options, report);

  if (drawn.pageCount === 0) {
    return friendly("Nothing could be drawn from this workbook.");
  }

  report(96, "Finishing up");
  const name = sanitizeFilename(file.name, "workbook").replace(/\.xlsx$/i, "");

  return {
    result: makeResult(toBlobPart(drawn.bytes), `${name}.pdf`, "application/pdf"),
    sheets: grids.length,
    pages: drawn.pageCount,
    rows: grids.reduce((sum, grid) => sum + grid.rows.length, 0),
    columns: Math.max(...grids.map((grid) => grid.columns)),
  };
}

/* ---------------------------------------------------------- reading a sheet */

/** One cell, flattened into only the fields the writer needs. */
interface FlatCell {
  text: string;
  /** 0 left, 0.5 centre, 1 right; null means the writer decides. */
  align: number | null;
  bold: boolean;
  /** ARGB, or null when the cell has no fill worth drawing. */
  fill: string | null;
}

interface FlatRow {
  cells: FlatCell[];
}

interface Grid {
  name: string;
  rows: FlatRow[];
  columns: number;
  /** Column widths in points, from the sheet where it set them. */
  widths: number[];
}

function readSheet(sheet: Worksheet): Grid {
  const rows: FlatRow[] = [];
  sheet.eachRow((row) => {
    rows.push({ cells: Array.from({ length: row.cellCount }, (_, index) => toCell(row.getCell(index + 1))) });
  });

  // Trim columns empty in every row and rows empty once that is done. A sheet
  // printed as-is often carries a stray column of formatting out at Z with
  // nothing in it, and a page of blank space is a page nobody can read.
  let columns = 0;
  for (const row of rows) columns = Math.max(columns, lastFilled(row.cells));

  const header = headerDepth(rows);
  const trimmed = rows
    .map((row) => ({ cells: row.cells.slice(0, columns) }))
    .filter((row, index) => index < header || row.cells.some((cell) => cell.text.trim() !== ""));

  return { name: sheet.name, rows: trimmed, columns, widths: readWidths(sheet, columns) };
}

/**
 * How many rows at the top of the sheet are headings worth repeating.
 *
 * A sheet almost always opens with a title and a row of column names, and
 * printing those again at the top of page two is the difference between a
 * usable document and a column of unlabelled figures. The scan stops at the
 * second blank row, because below that is data, and repeating data is worse
 * than repeating nothing.
 */
function headerDepth(rows: FlatRow[]): number {
  const limit = Math.min(HEADER_SCAN_ROWS, rows.length);
  let depth = 0;
  let blanks = 0;

  for (let i = 0; i < limit; i += 1) {
    if (rows[i].cells.some((cell) => cell.text.trim() !== "")) {
      depth = i + 1;
      blanks = 0;
    } else if (++blanks >= 2 && depth > 0) {
      break;
    }
  }
  return Math.min(depth, 3);
}

function lastFilled(cells: FlatCell[]): number {
  let last = 0;
  cells.forEach((cell, index) => {
    if (cell.text.trim() !== "") last = index + 1;
  });
  return last;
}

function toCell(cell: Cell): FlatCell {
  const value = cell.value;

  if (value === null || value === undefined) {
    return { text: "", align: null, bold: false, fill: null };
  }
  if (value instanceof Date) {
    return { text: readableDate(value), align: null, bold: false, fill: null };
  }

  return {
    text: cell.text ?? String(value),
    align: alignmentOf(cell.alignment?.horizontal),
    bold: cell.font?.bold === true,
    fill: fillOf(cell),
  };
}

function alignmentOf(horizontal?: string): number | null {
  if (horizontal === "center" || horizontal === "centre") return 0.5;
  if (horizontal === "right") return 1;
  if (horizontal === "left") return 0;
  return null;
}

function fillOf(cell: Cell): string | null {
  const fill = cell.fill;
  if (!fill || fill.type !== "pattern") return null;
  const argb = fill.fgColor?.argb;
  // A white fill is the default, and drawing it only costs bytes.
  if (!argb || argb.toUpperCase() === "FFFFFFFF") return null;
  return argb;
}

/**
 * A date as a person would read it.
 *
 * Written out here rather than through toLocaleDateString, because that follows
 * whatever locale the browser is in — the same workbook would then print
 * differently for two people, which is the opposite of what a PDF is for.
 */
function readableDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function readWidths(sheet: Worksheet, columns: number): number[] {
  const widths = new Array<number>(columns).fill(0);
  sheet.columns?.forEach((column, index) => {
    if (index >= columns) return;
    if (typeof column.width === "number" && column.width > 0) {
      widths[index] = column.width * EXCEL_WIDTH_UNIT;
    }
  });
  return widths;
}

/* --------------------------------------------------------- drawing the PDF */

async function writePdf(
  grids: Grid[],
  options: { orientation: Orientation; fit: FitMode },
  report: Report,
): Promise<{ pageCount: number; bytes: Uint8Array }> {
  const { PDFDocument, StandardFonts } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setProducer("PDF Quick Tools");

  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const landscape = options.orientation === "landscape";
  const pageWidth = landscape ? PAGE.height : PAGE.width;
  const pageHeight = landscape ? PAGE.width : PAGE.height;
  const usable = pageWidth - MARGIN * 2;

  let pageCount = 0;

  for (const [index, grid] of grids.entries()) {
    report(24 + (index / grids.length) * 64, `Drawing ${grid.name}`);

    const header = headerDepth(grid.rows);

    // Widths from the sheet where it gave them, else the widest value in the
    // column — capped, so one cell with a paragraph in it cannot take the page.
    const natural = grid.widths.map((width, column) =>
      width > 0 ? width : estimatedWidth(grid, column),
    );
    const total = natural.reduce((sum, width) => sum + width, 0);

    // "Fit to page" squeezes the columns so the whole sheet fits across.
    // "As it is" keeps the sheet's own widths and lets a wide sheet run off the
    // edge, which is what printing it on a narrow page really does.
    const squeeze = options.fit === "fit" && total > usable ? usable / total : 1;
    const wanted = natural.map((width) => Math.max(MIN_COLUMN, width * squeeze));
    const wantedTotal = wanted.reduce((sum, width) => sum + width, 0);

    // Scaled up again to fill the width exactly, so the columns plus the
    // margins reach the right-hand edge rather than stopping short of it.
    const laid = wanted.map((width) => (width * usable) / wantedTotal);
    const gaps = laid.map((width) => Math.min(5, width * 0.06));
    const fontSize = Math.max(MIN_FONT, Math.min(9, 10 * squeeze));
    const rowHeight = fontSize * 1.7;

    let page = doc.addPage([pageWidth, pageHeight]);
    pageCount += 1;
    let y = pageHeight - MARGIN;

    // The sheet's name, once, above its first page.
    page.drawText(grid.name, {
      x: MARGIN,
      y: y - fontSize * 1.6,
      size: Math.max(MIN_FONT + 1, fontSize * 1.4),
      font: fonts.bold,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= fontSize * 3;

    const heading = grid.rows.slice(0, header);

    for (const [rowIndex, row] of grid.rows.entries()) {
      const repeating = rowIndex < header;
      if (!repeating && y - rowHeight < MARGIN + (header > 0 ? HEADER_ROOM : 0)) {
        page = doc.addPage([pageWidth, pageHeight]);
        pageCount += 1;
        y = pageHeight - MARGIN;
        // The heading again, so a second page is not a list of numbers with
        // nothing to say what they are.
        for (const head of heading) {
          drawRow(page, head, laid, gaps, y, fonts, fontSize, rowHeight);
          y -= rowHeight;
        }
      }

      drawRow(page, row, laid, gaps, y, fonts, fontSize, rowHeight);
      y -= rowHeight;
    }
  }

  return { pageCount, bytes: await doc.save() };
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function drawRow(
  page: PDFPage,
  row: FlatRow,
  widths: number[],
  gaps: number[],
  y: number,
  fonts: Fonts,
  fontSize: number,
  rowHeight: number,
): void {
  let x = MARGIN;

  for (const [column, cell] of row.cells.entries()) {
    const width = widths[column];
    if (width === undefined) break;

    if (cell.fill) {
      page.drawRectangle({ x, y: y - 3, width, height: rowHeight, color: toRgb(cell.fill) });
    }

    if (cell.text.trim() !== "") {
      const font = cell.bold ? fonts.bold : fonts.regular;
      const available = width - gaps[column] - 4;

      // Numbers go right unless the sheet said otherwise, which is what makes a
      // column of figures line up on their decimal points by themselves.
      const align = cell.align ?? (/^-?[\d,.]+%?$/.test(cell.text.trim()) ? 1 : 0);
      const drawn = font.widthOfTextAtSize(cell.text, fontSize);
      const offset =
        align === 1
          ? width - gaps[column] - drawn
          : align === 0.5
            ? (width - drawn) / 2
            : gaps[column] / 2;

      page.drawText(clip(cell.text, font, fontSize, available), {
        x: x + offset,
        y,
        size: fontSize,
        font,
        color: toRgb("FF1A1A1E"),
      });
    }

    x += width;
  }
}

/** Fits text into a width, with an ellipsis when it cannot all go. */
function clip(text: string, font: PDFFont, size: number, available: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (available <= 0) return "";
  if (font.widthOfTextAtSize(clean, size) <= available) return clean;

  let end = clean.length;
  while (end > 1 && font.widthOfTextAtSize(`${clean.slice(0, end)}…`, size) > available) {
    end -= 1;
  }
  return `${clean.slice(0, end).trimEnd()}…`;
}

/** The widest value in a column, for a sheet that set no width of its own. */
function estimatedWidth(grid: Grid, column: number): number {
  let widest = 0;
  for (const row of grid.rows) {
    const text = row.cells[column]?.text ?? "";
    if (text.length > widest) widest = text.length;
  }
  // Characters run about half a point wide at 10pt, plus a little air each side.
  return Math.min(190, Math.max(34, widest * 5.4 + 12));
}

/**
 * An ARGB string from the sheet as a pdf-lib colour.
 *
 * The alpha byte is dropped: pdf-lib has no transparency on a drawn rectangle,
 * so only the three channels mean anything here.
 */
function toRgb(argb: string): ReturnType<typeof rgb> {
  const hex = argb.replace(/^#/, "").slice(-6);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return rgb(0, 0, 0);
  return rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  );
}