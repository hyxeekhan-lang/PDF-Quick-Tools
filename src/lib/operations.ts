import type { Report } from "#/hooks/useToolRun";
import {
  friendly,
  makeResult,
  readImageBytes,
  readPdfBytes,
  sanitizeFilename,
  type AcceptedFile,
  type ResultFile,
} from "./files";
import {
  canvasToBlob,
  closeRender,
  embedImage,
  loadPdfLib,
  openForEdit,
  openForRender,
  renderPage,
  save,
  toBlobPart,
} from "./pdf";
import { createZip, type ZipEntry } from "./zip";

const PDF_MIME = "application/pdf";

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/* ------------------------------------------------------------------ compress */

export type CompressionLevel = "strong" | "recommended" | "basic";

const COMPRESSION: Record<CompressionLevel, { scale: number; quality: number }> = {
  strong: { scale: 1.0, quality: 0.5 },
  recommended: { scale: 1.5, quality: 0.7 },
  basic: { scale: 2.0, quality: 0.85 },
};

export interface CompressOutcome {
  result: ResultFile;
  originalSize: number;
  method: "rasterized" | "restructured" | "unchanged";
}

/**
 * Two routes are tried and the smaller file wins.
 *
 * "Restructured" rewrites the PDF's object tables with object streams and drops
 * anything unreferenced — lossless, and often enough on its own. "Rasterized"
 * redraws each page as a JPEG, which is what actually shrinks scans and
 * image-heavy documents. If neither beats the original we hand back the
 * original rather than pretend.
 */
export async function compressPdf(
  file: File,
  level: CompressionLevel,
  report: Report,
): Promise<CompressOutcome> {
  const name = sanitizeFilename(file.name, "compressed");
  const originalBytes = await readPdfBytes(file);
  const originalSize = originalBytes.length;

  report(8, "Reading your PDF");
  const { doc } = await openForEdit(file);
  const restructured = await save(doc);

  report(18, "Redrawing pages");
  const { PDFDocument } = await loadPdfLib();
  const source = await openForRender(file);
  const { scale, quality } = COMPRESSION[level];

  let rasterized: Uint8Array | null = null;
  try {
    const target = await PDFDocument.create();
    const total = source.numPages;

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      const page = await source.getPage(pageNumber);
      const size = page.getViewport({ scale: 1 });
      page.cleanup();

      const canvas = await renderPage(source, pageNumber, { scale, maxWidth: 2400 });
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      canvas.width = 0;
      canvas.height = 0;

      const image = await target.embedJpg(await blobBytes(blob));
      const sheet = target.addPage([size.width, size.height]);
      sheet.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });

      report(18 + (pageNumber / total) * 70, `Compressing page ${pageNumber} of ${total}`);
    }

    rasterized = await save(target);
  } finally {
    await closeRender(source);
  }

  report(95, "Choosing the smallest version");

  const candidates: Array<{ bytes: Uint8Array; method: CompressOutcome["method"] }> = [
    { bytes: originalBytes, method: "unchanged" },
    { bytes: restructured, method: "restructured" },
  ];
  if (rasterized) candidates.push({ bytes: rasterized, method: "rasterized" });

  const best = candidates.reduce((smallest, candidate) =>
    candidate.bytes.length < smallest.bytes.length ? candidate : smallest,
  );

  return {
    result: makeResult(
      toBlobPart(best.bytes),
      `${name}-compressed.pdf`,
      PDF_MIME,
    ),
    originalSize,
    method: best.method,
  };
}

/* --------------------------------------------------------------------- merge */

export async function mergePdfs(
  files: AcceptedFile[],
  report: Report,
): Promise<ResultFile> {
  if (files.length < 2) {
    return friendly("Choose at least two PDFs so there is something to merge.");
  }

  const { PDFDocument } = await loadPdfLib();
  const target = await PDFDocument.create();
  let pagesAdded = 0;

  for (const [index, item] of files.entries()) {
    report(
      (index / files.length) * 90,
      `Adding ${index + 1} of ${files.length}: ${item.name}`,
    );
    const { doc } = await openForEdit(item.file);
    const pages = await target.copyPages(doc, doc.getPageIndices());
    for (const page of pages) target.addPage(page);
    pagesAdded += pages.length;
  }

  if (pagesAdded === 0) {
    return friendly("None of those files had any pages to merge.");
  }

  report(95, "Writing the merged PDF");
  const bytes = await save(target);
  return makeResult(toBlobPart(bytes), "merged.pdf", PDF_MIME);
}

/* ------------------------------------------------------ split / extract / keep */

/** Builds a new PDF from the given zero-based page indexes, in the order given. */
export async function keepPages(
  file: File,
  indexes: number[],
  report: Report,
  suffix: string,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to keep.");
  }

  report(15, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);

  const outOfRange = indexes.find((index) => index < 0 || index >= pageCount);
  if (outOfRange !== undefined) {
    return friendly(
      `Page ${outOfRange + 1} does not exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    );
  }

  const { PDFDocument } = await loadPdfLib();
  const target = await PDFDocument.create();

  report(45, `Copying ${indexes.length} page${indexes.length === 1 ? "" : "s"}`);
  const pages = await target.copyPages(doc, indexes);
  for (const page of pages) target.addPage(page);

  report(90, "Writing the new PDF");
  const bytes = await save(target);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(
    toBlobPart(bytes),
    `${name}-${suffix}.pdf`,
    PDF_MIME,
  );
}

export async function rearrangePages(
  file: File,
  indexes: number[],
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) return friendly("Add at least one page to the new order.");

  report(15, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  if (indexes.length !== pageCount || new Set(indexes).size !== pageCount) {
    return friendly("Every page must appear exactly once in the new order.");
  }

  const { PDFDocument } = await loadPdfLib();
  const target = await PDFDocument.create();
  report(50, "Reordering your pages");
  const pages = await target.copyPages(doc, indexes);
  for (const page of pages) target.addPage(page);

  report(90, "Writing the reordered PDF");
  const bytes = await save(target);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-rearranged.pdf`, PDF_MIME);
}

/** One separate PDF per selected page. More than one comes back as a zip. */
export async function splitToSinglePages(
  file: File,
  indexes: number[],
  report: Report,
): Promise<ResultFile[]> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to split out.");
  }

  report(10, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const { PDFDocument } = await loadPdfLib();
  const name = sanitizeFilename(file.name, "document");
  const entries: ZipEntry[] = [];
  const single: ResultFile[] = [];

  for (const [position, index] of indexes.entries()) {
    if (index < 0 || index >= pageCount) continue;
    report(
      10 + (position / indexes.length) * 82,
      `Saving page ${index + 1} of ${pageCount}`,
    );
    const target = await PDFDocument.create();
    const [page] = await target.copyPages(doc, [index]);
    target.addPage(page);
    const bytes = await save(target);
    const filename = `${name}-page-${index + 1}.pdf`;
    if (indexes.length > 1) entries.push({ name: filename, data: bytes });
    else single.push(makeResult(toBlobPart(bytes), filename, PDF_MIME));
  }

  if (indexes.length > 1) {
    report(96, "Packing the pages");
    return [makeResult(createZip(entries), `${name}-pages.zip`, "application/zip")];
  }
  if (single.length === 0) {
    return friendly("None of the pages you picked could be saved.");
  }
  return single;
}

export async function deletePages(
  file: File,
  removeIndexes: Set<number>,
  report: Report,
): Promise<ResultFile> {
  report(10, "Reading your PDF");
  const { pageCount } = await openForEdit(file);

  const keep: number[] = [];
  for (let index = 0; index < pageCount; index += 1) {
    if (!removeIndexes.has(index)) keep.push(index);
  }

  if (keep.length === 0) {
    return friendly(
      "That would delete every page. Leave at least one page in the document.",
    );
  }
  if (keep.length === pageCount) {
    return friendly("Select at least one page to delete.");
  }

  return keepPages(file, keep, report, "pages-removed");
}

/* -------------------------------------------------------------------- rotate */

export type RotationAngle = 90 | 180 | 270;

export async function rotatePdf(
  file: File,
  indexes: number[],
  angle: RotationAngle,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to rotate.");
  }

  report(20, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const { degrees } = await loadPdfLib();

  report(55, `Rotating ${indexes.length} page${indexes.length === 1 ? "" : "s"}`);
  for (const index of indexes) {
    if (index < 0 || index >= pageCount) continue;
    const page = doc.getPage(index);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }

  report(90, "Writing the rotated PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(
    toBlobPart(bytes),
    `${name}-rotated.pdf`,
    PDF_MIME,
  );
}

/* ------------------------------------------------------------- page numbers */

export type PageNumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PageNumberOptions {
  position: PageNumberPosition;
  startAt: number;
}

/**
 * Writes sequential page labels onto the selected pages without flattening or
 * re-rendering their existing contents.
 */
export async function addPageNumbers(
  file: File,
  indexes: number[],
  options: PageNumberOptions,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to number.");
  }
  if (!Number.isInteger(options.startAt) || options.startAt < 1) {
    return friendly("Enter a whole starting number of 1 or more.");
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
  const fontSize = 11;
  const edge = 36;

  for (const [order, index] of indexes.entries()) {
    const page = doc.getPage(index);
    const label = String(options.startAt + order);
    const { width } = page.getSize();
    const labelWidth = font.widthOfTextAtSize(label, fontSize);
    const x =
      options.position === "bottom-left"
        ? edge
        : options.position === "bottom-right"
          ? width - labelWidth - edge
          : (width - labelWidth) / 2;

    page.drawText(label, {
      x,
      y: 24,
      size: fontSize,
      font,
      color: rgb(0.2, 0.24, 0.32),
    });
    report(
      18 + ((order + 1) / indexes.length) * 72,
      `Numbering page ${order + 1} of ${indexes.length}`,
    );
  }

  report(94, "Writing your numbered PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-numbered.pdf`, PDF_MIME);
}

/* --------------------------------------------------------------- watermark */

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  angle: number;
  opacity: number;
  color: [number, number, number];
}

export async function watermarkPdf(
  file: File,
  indexes: number[],
  options: WatermarkOptions,
  report: Report,
): Promise<ResultFile> {
  const text = options.text.trim();
  if (indexes.length === 0) return friendly("Select at least one page to watermark.");
  if (!text) return friendly("Enter watermark text before continuing.");

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const { StandardFonts, degrees, rgb } = await loadPdfLib();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const safeSize = Math.min(96, Math.max(8, options.fontSize));
  const safeOpacity = Math.min(1, Math.max(0.05, options.opacity));
  const safeAngle = Math.min(180, Math.max(-180, options.angle));
  const [red, green, blue] = options.color;

  for (const [position, index] of indexes.entries()) {
    if (index < 0 || index >= pageCount) continue;
    const page = doc.getPage(index);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, safeSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: safeSize,
      font,
      rotate: degrees(safeAngle),
      color: rgb(red, green, blue),
      opacity: safeOpacity,
    });
    report(18 + ((position + 1) / indexes.length) * 72, `Watermarking page ${position + 1} of ${indexes.length}`);
  }

  report(94, "Writing your watermarked PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-watermarked.pdf`, PDF_MIME);
}

/* ------------------------------------------------------------------- sign */

async function dataUrlBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
}

export async function signPdf(
  file: File,
  indexes: number[],
  signatureDataUrl: string,
  report: Report,
): Promise<ResultFile> {
  if (indexes.length === 0) return friendly("Select at least one page to sign.");
  if (!signatureDataUrl.startsWith("data:image/png")) {
    return friendly("Draw your signature before continuing.");
  }

  report(12, "Reading your PDF");
  const { doc, pageCount } = await openForEdit(file);
  const signature = await doc.embedPng(await dataUrlBytes(signatureDataUrl));

  for (const [position, index] of indexes.entries()) {
    if (index < 0 || index >= pageCount) continue;
    const page = doc.getPage(index);
    const { width } = page.getSize();
    const signatureWidth = Math.min(180, width * 0.34);
    const signatureHeight = signatureWidth * (signature.height / signature.width);
    page.drawImage(signature, {
      x: width - signatureWidth - 36,
      y: 36,
      width: signatureWidth,
      height: signatureHeight,
    });
    report(18 + ((position + 1) / indexes.length) * 72, `Signing page ${position + 1} of ${indexes.length}`);
  }

  report(94, "Writing your signed PDF");
  const bytes = await save(doc);
  const name = sanitizeFilename(file.name, "document");
  return makeResult(toBlobPart(bytes), `${name}-signed.pdf`, PDF_MIME);
}

/* ---------------------------------------------------------------- pdf to jpg */

export type ImageQuality = "high" | "medium" | "small";

const IMAGE_SETTINGS: Record<ImageQuality, { scale: number; quality: number }> = {
  high: { scale: 2.5, quality: 0.92 },
  medium: { scale: 1.7, quality: 0.82 },
  small: { scale: 1.1, quality: 0.72 },
};

export async function pdfToJpg(
  file: File,
  indexes: number[],
  quality: ImageQuality,
  asZip: boolean,
  report: Report,
): Promise<ResultFile[]> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to convert.");
  }

  const settings = IMAGE_SETTINGS[quality];
  const name = sanitizeFilename(file.name, "page");
  const doc = await openForRender(file);
  const entries: ZipEntry[] = [];
  const results: ResultFile[] = [];

  try {
    for (const [position, index] of indexes.entries()) {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > doc.numPages) continue;

      report(
        (position / indexes.length) * 92,
        `Converting page ${pageNumber} of ${doc.numPages}`,
      );

      const canvas = await renderPage(doc, pageNumber, {
        scale: settings.scale,
        maxWidth: 3000,
      });
      const blob = await canvasToBlob(canvas, "image/jpeg", settings.quality);
      canvas.width = 0;
      canvas.height = 0;

      const filename = `${name}-page-${pageNumber}.jpg`;
      if (asZip) entries.push({ name: filename, data: await blobBytes(blob) });
      else results.push(makeResult(blob, filename, "image/jpeg"));
    }
  } finally {
    await closeRender(doc);
  }

  if (asZip) {
    report(96, "Packing the images");
    const zip = createZip(entries);
    return [makeResult(zip, `${name}-images.zip`, "application/zip")];
  }

  if (results.length === 0) {
    return friendly("None of the pages you picked could be converted.");
  }
  return results;
}

/* ---------------------------------------------------------------- pdf to png */

/**
 * PNG rather than JPG, on the same renderer.
 *
 * Kept beside the JPG version rather than folded into it as a format option,
 * because the two are genuinely different jobs: JPG throws away detail to get
 * small, PNG keeps every pixel and is the right choice for a page you are
 * going to crop, print or read small print from. PNG files are much larger,
 * so the scales here are lower than the JPG ones — a lossless image does not
 * benefit from being rendered at 2.5×.
 */
const PNG_SCALES: Record<ImageQuality, number> = {
  high: 2,
  medium: 1.4,
  small: 1,
};

export async function pdfToPng(
  file: File,
  indexes: number[],
  quality: ImageQuality,
  asZip: boolean,
  report: Report,
): Promise<ResultFile[]> {
  if (indexes.length === 0) {
    return friendly("Select at least one page to convert.");
  }

  const scale = PNG_SCALES[quality];
  const name = sanitizeFilename(file.name, "page");
  const doc = await openForRender(file);
  const entries: ZipEntry[] = [];
  const results: ResultFile[] = [];

  try {
    for (const [position, index] of indexes.entries()) {
      const pageNumber = index + 1;
      if (pageNumber < 1 || pageNumber > doc.numPages) continue;

      report(
        (position / indexes.length) * 92,
        `Converting page ${pageNumber} of ${doc.numPages}`,
      );

      const canvas = await renderPage(doc, pageNumber, { scale, maxWidth: 3000 });
      // PNG's encode quality is not a dial: it is lossless, so the only choice
      // is the format itself and the call takes no quality argument.
      const blob = await canvasToBlob(canvas, "image/png");
      canvas.width = 0;
      canvas.height = 0;

      const filename = `${name}-page-${pageNumber}.png`;
      if (asZip) entries.push({ name: filename, data: await blobBytes(blob) });
      else results.push(makeResult(blob, filename, "image/png"));
    }
  } finally {
    await closeRender(doc);
  }

  if (asZip) {
    report(96, "Packing the images");
    const zip = createZip(entries);
    return [makeResult(zip, `${name}-images.zip`, "application/zip")];
  }

  if (results.length === 0) {
    return friendly("None of the pages you picked could be converted.");
  }
  return results;
}

/* ---------------------------------------------------------------- jpg to pdf */

export type PageSize = "fit" | "a4" | "letter";
export type PageOrientation = "portrait" | "landscape";

const SHEETS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export async function imagesToPdf(
  files: AcceptedFile[],
  options: { size: PageSize; orientation: PageOrientation; margin: boolean },
  report: Report,
): Promise<ResultFile> {
  if (files.length === 0) {
    return friendly("Add at least one image to convert.");
  }

  const { PDFDocument } = await loadPdfLib();
  const target = await PDFDocument.create();

  for (const [index, item] of files.entries()) {
    report(
      (index / files.length) * 92,
      `Adding image ${index + 1} of ${files.length}`,
    );

    // WebP has no PDF equivalent, and PNG transparency needs a white backing,
    // so everything goes through a canvas and comes out as a JPEG.
    const { bytes, mime, width, height } = await normalizeImage(item.file);
    const image = await embedImage(target, bytes, mime);

    if (options.size === "fit") {
      const page = target.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
      continue;
    }

    const [shortSide, longSide] = SHEETS[options.size];
    const pageWidth = options.orientation === "portrait" ? shortSide : longSide;
    const pageHeight = options.orientation === "portrait" ? longSide : shortSide;
    const page = target.addPage([pageWidth, pageHeight]);

    const padding = options.margin ? 36 : 0;
    const boxWidth = pageWidth - padding * 2;
    const boxHeight = pageHeight - padding * 2;
    const ratio = Math.min(boxWidth / width, boxHeight / height);
    const drawWidth = width * ratio;
    const drawHeight = height * ratio;

    page.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  report(96, "Writing your PDF");
  const bytes = await save(target);
  return makeResult(toBlobPart(bytes), "images.pdf", PDF_MIME);
}

async function normalizeImage(file: File): Promise<{
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
}> {
  if (file.type === "image/jpeg") {
    const bytes = await readImageBytes(file);
    const size = await measureImage(file);
    return { bytes, mime: "image/jpeg", ...size };
  }

  const bitmap = await decodeImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return friendly("Your browser would not let us read that image. Try reloading the page.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  const bytes = await blobBytes(blob);
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, mime: "image/jpeg", width, height };
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    return friendly(
      `"${file.name}" could not be opened as an image. It may be damaged or in an unsupported format.`,
    );
  }
}

async function measureImage(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await decodeImage(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
