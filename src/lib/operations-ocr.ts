/**
 * Optical character recognition for scanned PDFs.
 *
 * A scanned page is a picture of words, so there is nothing for a text reader
 * to extract. This recognises the words from the rendered image and draws them
 * back onto the page as invisible text, which makes the file selectable,
 * searchable and copyable while the scan underneath stays exactly as it was.
 *
 * Everything runs in the browser. Nothing is uploaded, which is the point — a
 * scan is often a passport, a contract or a medical record, and those are the
 * last files anyone should hand to a conversion website.
 */

import type { Color, PDFFont, PDFPage } from "pdf-lib";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { OPS } from "pdfjs-dist";
import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import {
  closeRender,
  loadPdfLib,
  openForEdit,
  openForRender,
  renderPage,
  save,
  toBlobPart,
} from "./pdf";

const PDF_MIME = "application/pdf";

export const OCR_LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "ara", label: "Arabic" },
  { code: "hin", label: "Hindi" },
  { code: "urd", label: "Urdu" },
] as const;

export type OcrLanguage = (typeof OCR_LANGUAGES)[number]["code"];

/**
 * Resolution for the page image handed to the recogniser.
 *
 * Below about 150 DPI there are not enough pixels to tell letters apart; much
 * above 300 and every page takes twice as long for no extra accuracy. A first
 * pass runs here, and only a page that comes back uncertain is retried at the
 * higher resolution.
 */
const FAST_DPI = 150;
const CAREFUL_DPI = 300;

/**
 * Below this confidence a "line" is more likely a smudge than a sentence.
 *
 * It is deliberately low. Tesseract rates a clean line of table figures — a
 * total, a quantity — well below ordinary prose, around 25, while those lines
 * are often the ones worth reading. Cutting at the usual 60 would silently
 * empty out the bottom half of an invoice, which is exactly the part someone
 * opened the file to find. The reported page confidence is what warns the user
 * that a run was shaky.
 */
const MIN_LINE_CONFIDENCE = 20;

/** Below this page confidence the first pass is retried at higher resolution. */
const RETRY_BELOW = 75;

/**
 * How much of a page the largest drawn picture has to cover before the page
 * counts as a scan rather than typeset text.
 *
 * A real scan covers essentially the whole sheet. Letters, logos and rules sit
 * far below this, so anything under it is decoration next to genuine text.
 */
const SCAN_COVERAGE = 0.5;

/**
 * Every operator that paints a bitmap, so a picture can be spotted in the
 * drawing list whatever form it was embedded in.
 */
const IMAGE_OPS: ReadonlySet<number> = new Set([
  OPS.paintImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
]);

export interface OcrOutcome {
  pageCount: number;
  /** Pages that already had real text and were passed straight through. */
  skipped: number;
  /** Pages actually recognised, across the whole run. */
  recognised: number;
  /** Mean confidence across the recognised pages, out of 100. */
  confidence: number;
  result: ResultFile;
}

export async function ocrPdf(
  file: File,
  indexes: number[],
  report: Report,
  onProgress?: (done: number, total: number, page: number) => void,
  language: OcrLanguage = "eng",
): Promise<OcrOutcome> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to run OCR on.");
  }

  report(5, "Loading the text recogniser");
  const createWorker = await loadTesseract();

  report(10, "Reading your PDF");
  const source = await openForRender(file);
  const { doc, pageCount } = await openForEdit(file);

  const wanted = indexes.filter((i) => i >= 0 && i < pageCount);
  if (wanted.length === 0) {
    await closeRender(source);
    return friendly("None of the pages you picked exist in this PDF.");
  }

  const { StandardFonts, rgb } = await loadPdfLib();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let worker: TesseractWorker | null = null;
  let skipped = 0;
  let recognised = 0;
  let confidenceSum = 0;

  try {
    worker = await createWorker(language, 1, {
      // Served from this site rather than a CDN. The recogniser is several
      // megabytes and the whole point of this tool is that a scan never
      // reaches a third party, which would be hard to claim while fetching the
      // model that reads it from jsDelivr.
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      // The language model ships gzipped, which is the worker's default and
      // what it checks the downloaded bytes for before trusting them.
      gzip: true,
    } as never);
    const ocr = worker;

    for (const [order, index] of wanted.entries()) {
      const pageNumber = index + 1;
      report(
        15 + (order / wanted.length) * 75,
        `Reading page ${pageNumber} of ${pageCount}`,
      );

      // A genuinely typeset page does not need recognising, and running OCR
      // over it would only risk degrading text that is already correct. This
      // is what makes the tool usable on a mixed document where some pages were
      // typed and some were scanned.
      if (await pageIsTyped(source, pageNumber)) {
        skipped += 1;
        onProgress?.(order + 1, wanted.length, pageNumber);
        continue;
      }

      const recognition = await recognisePage(ocr, source, pageNumber);
      drawInvisibleText(doc.getPage(index), font, recognition.lines, rgb);

      recognised += 1;
      confidenceSum += recognition.confidence;
      onProgress?.(order + 1, wanted.length, pageNumber);
    }
  } finally {
    await worker?.terminate();
    await closeRender(source);
  }

  if (recognised === 0) {
    return friendly(
      "None of these pages needed OCR. They already had selectable text, so your PDF is already searchable.",
    );
  }

  report(94, "Writing your searchable PDF");
  const bytes = await save(doc);
  const confidence =
    Math.round((confidenceSum / recognised) * 100) / 100;
  const name = sanitizeFilename(file.name, "document");

  return {
    pageCount,
    skipped,
    recognised,
    confidence,
    result: makeResult(toBlobPart(bytes), `${name}-searchable.pdf`, PDF_MIME),
  };
}

/* --------------------------------------------------------------- drawing */

/** One recognised line, already converted into PDF page coordinates. */
interface OcrLine {
  text: string;
  /** Distance from the page's left edge, in PDF points. */
  x: number;
  /** Distance from the page's bottom edge, in PDF points. */
  y: number;
  /** Width of the line in PDF points. */
  width: number;
  /** Em size in points, derived from the line's visible cap height. */
  size: number;
}

/**
 * Draws the recognised lines onto a page at zero opacity.
 *
 * Zero opacity rather than PDF's invisible text rendering mode: it needs no
 * raw stream surgery, survives being copied into another PDF, and is
 * selectable and searchable exactly the same way.
 */
function drawInvisibleText(
  page: PDFPage,
  font: PDFFont,
  lines: OcrLine[],
  rgb: (r: number, g: number, b: number) => Color,
): void {
  const black = rgb(0, 0, 0);

  for (const line of lines) {
    // Helvetica cannot encode arbitrary Unicode, and a scan often contains
    // stray marks that would throw rather than draw. A line that will not
    // encode is dropped instead of taking the whole run down with it.
    try {
      font.encodeText(line.text);
    } catch {
      continue;
    }

    // A font draws at its natural width for the given size. If that does not
    // line up with where the words actually sit on the page, the invisible text
    // drifts out of position and selecting a line highlights the wrong words.
    // Scaling the size to match the measured width keeps them together.
    const naturalWidth = font.widthOfTextAtSize(line.text, line.size);
    const size =
      naturalWidth > 0 ? Math.min(line.size * (line.width / naturalWidth), line.size * 3) : line.size;

    page.drawText(line.text, {
      x: line.x,
      y: line.y,
      size,
      font,
      color: black,
      opacity: 0,
    });
  }
}

/* ------------------------------------------------------------- the engine */

/** One recognised page, in PDF coordinates. */
interface PageRecognition {
  lines: OcrLine[];
  confidence: number;
}

interface TesseractBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: TesseractBbox;
}

interface TesseractBlock {
  paragraphs: Array<{ lines: TesseractLine[] }>;
}

export interface TesseractData {
  text: string;
  confidence: number;
  blocks: TesseractBlock[] | null;
}

/** The worker tesseract.js hands back, with the two output fields we read. */
export type TesseractWorker = {
  recognize(
    image: unknown,
    opts?: unknown,
    output?: unknown,
  ): Promise<{ data: TesseractData }>;
  terminate(): Promise<unknown>;
};

let tesseractPromise: Promise<typeof import("tesseract.js").createWorker> | null = null;

/**
 * Loads the recogniser.
 *
 * A dynamic import keeps the several megabytes of model code off every other
 * page on the site — it is only fetched when someone opens this tool.
 */
export async function loadTesseract() {
  tesseractPromise ??= import("tesseract.js").then((mod) => mod.createWorker);
  return tesseractPromise;
}

/**
 * Whether a page is genuinely typed rather than a picture of text.
 *
 * Counting characters is the obvious test and it is the wrong one. A scan
 * carrying nothing but a scanner's footer, a page number or a faint watermark
 * clears any character count, and the page gets skipped — which is how a
 * scanned document came back saying it "already had selectable text" while
 * none of it could be searched.
 *
 * What separates the two is the picture. A scanned page is one large image
 * covering nearly the whole sheet; a typed page has no such image at all. So
 * this measures how much of the page the largest drawn image covers and lets
 * a page through to the recogniser unless it is clearly typeset. When a page
 * has both a real text layer and a big image, it is a scan with an OCR layer
 * someone already ran over it — running again would only stack a second,
 * worse layer on top, so that combination is still passed through.
 */
async function pageIsTyped(
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<boolean> {
  const page = await doc.getPage(pageNumber);
  try {
    const [viewport, content, list] = await Promise.all([
      page.getViewport({ scale: 1 }),
      page.getTextContent(),
      page.getOperatorList(),
    ]);

    const chars = content.items.reduce(
      (total, item) => total + ("str" in item ? item.str.trim().length : 0),
      0,
    );
    const pageArea = Math.abs(viewport.width * viewport.height);
    const coverage = pageArea > 0 ? imageCoverage(list, OPS, pageArea) : 0;

    return chars > 10 && coverage < SCAN_COVERAGE;
  } finally {
    page.cleanup();
  }
}

/**
 * Fraction of the page covered by the largest picture drawn on it.
 *
 * pdf.js hands over a flat list of drawing operators, and the size of an image
 * is not one of them — it lives in the transformation matrix in force at the
 * moment the image is painted. So the matrix has to be carried along the whole
 * operator list the way a graphics stack does, multiplying each `transform`
 * onto the one already in effect and resetting on `save`/`restore`, because
 * that is exactly what those operators do to the real stack.
 *
 * Taking only the most recent transform instead — which is the easy mistake —
 * reports every page as empty, because the matrix is reset immediately before
 * the image is painted.
 */
function imageCoverage(
  list: Awaited<ReturnType<PDFPageProxy["getOperatorList"]>>,
  ops: typeof OPS,
  pageArea: number,
): number {
  let largest = 0;
  // The identity matrix, as pdf.js reports transforms: [a, b, c, d, e, f].
  let ctm: readonly number[] = [1, 0, 0, 1, 0, 0];

  const multiply = (m: readonly number[], n: readonly number[]): number[] => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const apply = (m: readonly number[], x: number, y: number): number[] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];

  for (let i = 0; i < list.fnArray.length; i += 1) {
    const fn = list.fnArray[i];
    if (fn === ops.save || fn === ops.restore) {
      ctm = [1, 0, 0, 1, 0, 0];
    } else if (fn === ops.transform) {
      ctm = multiply(ctm, list.argsArray[i]);
    } else if (IMAGE_OPS.has(fn)) {
      const [x0, y0] = apply(ctm, 0, 0);
      const [x1, y1] = apply(ctm, 1, 1);
      largest = Math.max(largest, Math.abs(x1 - x0) * Math.abs(y1 - y0));
    }
  }

  return pageArea > 0 ? largest / pageArea : 0;
}

/**
 * Recognises one page and converts its lines into PDF coordinates.
 *
 * The transform matters more than it looks. The recogniser works in image
 * pixels from the top-left going down, and PDF wants points from the bottom-left
 * going up. Its font size also has to be derived rather than copied: the
 * recogniser reports a line's bounding box, which measures the visible cap
 * height, while a PDF font size is the em size, roughly a third larger.
 * Getting either wrong leaves the invisible text visibly out of position
 * relative to the scan underneath it.
 */
async function recognisePage(
  worker: TesseractWorker,
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageRecognition> {
  const viewport = (await doc.getPage(pageNumber)).getViewport({ scale: 1 });

  for (const dpi of [FAST_DPI, CAREFUL_DPI]) {
    const canvas = await renderPage(doc, pageNumber, { scale: dpi / 72 });
    // Points per pixel: what the recogniser measures in, converted back into the
  // units a PDF page is drawn in.
  const ratio = viewport.width / canvas.width;

    const { data } = await worker.recognize(
      canvas,
      {},
      { text: true, blocks: true, tsv: false, hocr: false },
    );

    const lines = toPdfLines(data, ratio, viewport.height);
    if (data.confidence >= RETRY_BELOW || dpi === CAREFUL_DPI) {
      // Freeing the canvas here, before the next iteration, is what keeps a
      // long scan from holding every page it has already read.
      canvas.width = 0;
      canvas.height = 0;
      return { lines, confidence: data.confidence };
    }

    canvas.width = 0;
    canvas.height = 0;
  }

  return { lines: [], confidence: 0 };
}

/**
 * Converts the recogniser's word boxes into positioned PDF text.
 *
 * A line is only emitted if it was recognised with some confidence. Below the
 * threshold a "line" is more often a smudge or a piece of the paper than a
 * sentence, and writing it in would put stray words into a document the user is
 * about to trust.
 */
function toPdfLines(
  data: { blocks: TesseractBlock[] | null },
  ratio: number,
  pageHeight: number,
): OcrLine[] {
  const lines: OcrLine[] = [];

  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text.trim();
        if (text.length === 0) continue;
        if (line.confidence < MIN_LINE_CONFIDENCE) continue;

        const { x0, y0, x1, y1 } = line.bbox;
        const boxHeight = y1 - y0;
        if (boxHeight <= 0) continue;

        // The visible height of a line is its cap height, not its em size.
        // Dividing by roughly 0.7 converts one into the other, which keeps the
        // invisible text the same apparent size as the scan beneath it.
        const size = boxHeight * ratio / 0.7;

        lines.push({
          text,
          x: x0 * ratio,
          y: pageHeight - y1 * ratio,
          width: (x1 - x0) * ratio,
          size,
        });
      }
    }
  }

  return lines;
}