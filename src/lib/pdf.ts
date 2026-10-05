import type { PDFDocument, PDFImage } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { friendly, readPdfBytes } from "./files";

/**
 * Everything here runs in the browser and every heavy import is dynamic, so
 * pdf-lib and pdf.js are only fetched once a tool actually needs them. The
 * home page never downloads either.
 */

type PdfLib = typeof import("pdf-lib");
type PdfJs = typeof import("pdfjs-dist");

let pdfLibPromise: Promise<PdfLib> | null = null;
let pdfJsPromise: Promise<PdfJs> | null = null;

export function loadPdfLib(): Promise<PdfLib> {
  pdfLibPromise ??= import("pdf-lib");
  return pdfLibPromise;
}

export function loadPdfJs(): Promise<PdfJs> {
  pdfJsPromise ??= (async () => {
    const [pdfjs, workerUrl] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((mod) => mod.default),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
  })();
  return pdfJsPromise;
}

function describeLoadFailure(error: unknown, filename: string): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/encrypt|password/i.test(message)) {
    return friendly(
      `"${filename}" is password protected. Remove the password in your PDF reader, then try again.`,
    );
  }
  return friendly(
    `"${filename}" could not be opened. The file may be damaged or only partly downloaded.`,
  );
}

/** Opens a PDF for editing with pdf-lib. */
export async function openForEdit(
  file: File,
): Promise<{ doc: PDFDocument; pageCount: number }> {
  const bytes = await readPdfBytes(file);
  const { PDFDocument: Doc } = await loadPdfLib();
  try {
    const doc = await Doc.load(bytes, { updateMetadata: false });
    const pageCount = doc.getPageCount();
    if (pageCount === 0) {
      return friendly(`"${file.name}" has no pages in it.`);
    }
    return { doc, pageCount };
  } catch (error) {
    return describeLoadFailure(error, file.name);
  }
}

export async function getPageCount(file: File): Promise<number> {
  const { pageCount } = await openForEdit(file);
  return pageCount;
}

/** Opens a PDF for rendering with pdf.js. Remember to call `destroy()`. */
export async function openForRender(file: File): Promise<PDFDocumentProxy> {
  const bytes = await readPdfBytes(file);
  const pdfjs = await loadPdfJs();
  try {
    return await pdfjs.getDocument({
      // pdf.js transfers the buffer, so hand it a copy we do not reuse.
      data: bytes.slice(),
      disableAutoFetch: true,
    }).promise;
  } catch (error) {
    return describeLoadFailure(error, file.name);
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

/**
 * Paints the whole canvas in one colour using the source pixels' brightness.
 *
 * `filter: "grayscale(1)"` on the 2D context is the built-in way to do this and
 * is hardware accelerated where the browser supports it. Where it is not
 * supported the property is simply ignored, so we fall back to reading every
 * pixel back and converting it here rather than shipping a colour PDF that was
 * supposed to be black and white.
 */
function toGrayscale(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const supported = context.filter;
  if (supported !== undefined && supported !== "none") {
    context.filter = "grayscale(1)";
    return;
  }

  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;
  for (let i = 0; i < pixels.length; i += 4) {
    // Rec. 601 luma, which is closer to perceived brightness than a flat average.
    const luma = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
    pixels[i] = luma;
    pixels[i + 1] = luma;
    pixels[i + 2] = luma;
  }
  context.putImageData(frame, 0, 0);
}

/** Renders one page of a pdf.js document onto a fresh canvas. */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: { scale?: number; maxWidth?: number; grayscale?: boolean } = {},
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  let scale = options.scale ?? 1;
  if (options.maxWidth && base.width * scale > options.maxWidth) {
    scale = options.maxWidth / base.width;
  }
  const viewport = page.getViewport({ scale });
  const canvas = makeCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return friendly(
      "Your browser would not give this page a drawing surface. Try reloading the page.",
    );
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  page.cleanup();
  if (options.grayscale) toGrayscale(context, canvas);
  return canvas;
}

/** Releases the pdf.js worker behind a rendered document. */
export async function closeRender(doc: PDFDocumentProxy): Promise<void> {
  await doc.loadingTask.destroy();
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      type,
      quality,
    );
  });
}

/** A small preview of every page, for the visual page pickers. */
export interface PageThumb {
  pageNumber: number;
  url: string;
  width: number;
  height: number;
}

export async function renderThumbnails(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ pageCount: number; thumbs: PageThumb[] }> {
  const doc = await openForRender(file);
  const thumbs: PageThumb[] = [];
  try {
    const total = doc.numPages;
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      const canvas = await renderPage(doc, pageNumber, { maxWidth: 260 });
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.7);
      thumbs.push({
        pageNumber,
        url: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
      });
      canvas.width = 0;
      canvas.height = 0;
      onProgress?.(pageNumber, total);
    }
    return { pageCount: total, thumbs };
  } finally {
    await closeRender(doc);
  }
}

export function revokeThumbnails(thumbs: PageThumb[]): void {
  for (const thumb of thumbs) URL.revokeObjectURL(thumb.url);
}

/** Saves a pdf-lib document, using object streams to keep the file small. */
export async function save(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

/**
 * Copies bytes into a plain ArrayBuffer. TypeScript will not accept a
 * `Uint8Array<ArrayBufferLike>` as a `BlobPart`, and a copy is the honest fix.
 */
export function toBlobPart(bytes: Uint8Array): BlobPart {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function embedImage(
  doc: PDFDocument,
  bytes: Uint8Array,
  mime: string,
): Promise<PDFImage> {
  if (mime === "image/png") return doc.embedPng(bytes);
  return doc.embedJpg(bytes);
}
