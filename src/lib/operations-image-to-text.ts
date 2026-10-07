/**
 * Image to text.
 *
 * The same recogniser as OCR PDF, pointed at a picture instead of a page, and
 * the output is text rather than an invisible text layer — the useful shape
 * when the image is a photograph of a screen, a whiteboard or a receipt, where
 * there is no PDF to put a layer inside.
 *
 * Two things the page cannot do and this says so on the page itself: it cannot
 * follow a column, and it cannot read handwriting. What comes out is the
 * recogniser's text in the order it read it, with the confidence reported so a
 * shaky run is visible rather than quietly trusted.
 */

import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadTesseract, type TesseractWorker } from "./operations-ocr";

/**
 * Recognition runs at a fixed size rather than at the image's own.
 *
 * Tesseract wants roughly 30 pixels of letter height. A phone photo of a
 * receipt is several thousand pixels tall, where each character is enormous;
 * handing that over directly makes the recogniser slow without making it more
 * accurate. So large images are scaled down before recognition, and small ones
 * left alone, which is the side where accuracy is actually at risk.
 */
const TARGET_HEIGHT = 1600;

/** Below this a line is more likely a smudge than a sentence. Same rule as OCR PDF. */
const MIN_LINE_CONFIDENCE = 20;

/** How many images to take at once. Each is several seconds of work. */
const MAX_IMAGES = 30;

export type ImageToTextFormat = "txt" | "md";

export interface ImageToTextResult {
  result: ResultFile;
  images: number;
  characters: number;
  words: number;
  /** Mean confidence over the images, out of 100. */
  confidence: number;
  /** Images the recogniser could not read anything from. */
  blank: number[];
}

export async function imageToText(
  files: File[],
  format: ImageToTextFormat,
  report: Report,
): Promise<ImageToTextResult> {
  if (files.length === 0) {
    return friendly("Choose at least one image to read.");
  }
  if (files.length > MAX_IMAGES) {
    return friendly(
      `That is ${files.length} images. Read them ${MAX_IMAGES} at a time — each one takes a few seconds to work on.`,
    );
  }

  report(6, "Loading the text recogniser");
  const createWorker = await loadTesseract();

  let worker: TesseractWorker | null = null;
  const sections: string[] = [];
  const blank: number[] = [];
  let characters = 0;
  let words = 0;
  let confidenceSum = 0;
  let read = 0;

  try {
    worker = await createWorker("eng", 1, {
      // Served from this site rather than a CDN, for the reason OCR PDF gives:
      // the model that reads your image should not be fetched from elsewhere.
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      gzip: true,
    } as never);

    for (const [order, file] of files.entries()) {
      report(
        10 + (order / files.length) * 80,
        `Reading image ${order + 1} of ${files.length}`,
      );

      const read1 = await readImage(worker, file);

      if (read1.text.trim() === "") {
        blank.push(order + 1);
      } else {
        characters += read1.text.length;
        words += read1.text.split(/\s+/).filter(Boolean).length;
        confidenceSum += read1.confidence;
        read += 1;
        sections.push(
          read1.text.trim() === ""
            ? `## ${file.name}\n\n_No text was found in this image._`
            : `## ${file.name}\n\n${read1.text.trim()}`,
        );
      }
    }
  } finally {
    await worker?.terminate();
  }

  if (sections.length === 0) {
    return friendly(
      "No text was found in any of those images. That usually means the picture is too blurry, too dark, or contains handwriting — which this recogniser is not built for. A flat, evenly lit photo of the page works best.",
    );
  }

  report(94, "Writing your text file");
  const confidence = read === 0 ? 0 : Math.round((confidenceSum / read) * 100) / 100;
  const name =
    files.length === 1
      ? sanitizeFilename(files[0].name, "image").replace(/\.[^.]+$/, "")
      : `${sanitizeFilename("images", "images")}`;

  const body =
    format === "md"
      ? `# Extracted text\n\n${sections.join("\n\n---\n\n")}\n`
      : `${sections.map((section) => section.replace(/^##\s+.*\n+/, "")).join("\n\n")}\n`;

  return {
    result: makeResult(
      body,
      `${name}.${format}`,
      format === "md" ? "text/markdown" : "text/plain",
    ),
    images: read,
    characters,
    words,
    confidence,
    blank,
  };
}

interface ReadResult {
  text: string;
  confidence: number;
}

/**
 * Decodes one image and reads it.
 *
 * The bitmap is closed on every path, including the failure inside the try:
 * a decoded image is tens of megabytes for a phone photo, and a batch of
 * thirty left open would take the tab down with it.
 */
async function readImage(worker: TesseractWorker, file: File): Promise<ReadResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return friendly(
      `"${file.name}" could not be opened as an image. Please choose a JPG, PNG or WebP file.`,
    );
  }

  try {
    // Scaled to roughly what the recogniser wants, and never up — blowing a
    // small picture up adds no detail for it to find.
    const scale = bitmap.height > TARGET_HEIGHT ? TARGET_HEIGHT / bitmap.height : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return friendly("This browser could not prepare the image for reading.");

    context.drawImage(bitmap, 0, 0, width, height);

    const { data } = await worker.recognize(
      canvas,
      {},
      { text: true, blocks: true, tsv: false, hocr: false },
    );

    canvas.width = 0;
    canvas.height = 0;

    return { text: flatten(data), confidence: data.confidence };
  } finally {
    bitmap.close();
  }
}

/**
 * Joins the recognised blocks into lines of plain text.
 *
 * The recogniser returns paragraphs of lines with positions, and for this tool
 * the positions are not needed — only the reading order. Blocks and paragraphs
 * are joined with blank lines and lines with single spaces, which is what makes
 * the result usable as text rather than as a pile of fragments.
 */
function flatten(data: { text?: string; blocks?: unknown }): string {
  const blocks = (data.blocks ?? []) as Array<{
    paragraphs?: Array<{ lines?: Array<{ text?: string; confidence?: number }> }>;
  }>;

  const paragraphs: string[] = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      const line = (paragraph.lines ?? [])
        // The same low threshold OCR PDF uses: table figures rate low but are
        // often the part someone opened the image to find.
        .filter((item) => (item.confidence ?? 0) >= MIN_LINE_CONFIDENCE)
        .map((item) => (item.text ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) paragraphs.push(line);
    }
  }

  if (paragraphs.length > 0) return paragraphs.join("\n\n");
  return (data.text ?? "").trim();
}
