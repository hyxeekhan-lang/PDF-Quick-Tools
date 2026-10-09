import type { Report } from "#/hooks/useToolRun";
import { makeResult, readPdfBytes, sanitizeFilename, type ResultFile } from "./files";
import {
  canvasToBlob,
  closeRender,
  loadPdfLib,
  openForRender,
  renderPage,
  save,
  toBlobPart,
} from "./pdf";

/**
 * Exact-size PDF compression.
 *
 * The existing compressor picks whichever of three techniques produces the
 * smallest file. That answers "how small can this get", not "how small does it
 * need to be". Email servers reject an attachment over 1 MB, a university portal
 * caps an upload at 500 KB, and a job application form wants 200 KB — the size
 * is a hard constraint the visitor already knows, and the right answer is the
 * *smallest file that is still legible at that size*, not the smallest file
 * period.
 *
 * So this does a bisection over JPEG quality and render scale, two variables
 * that trade size against legibility in opposite directions. Every candidate is
 * produced by actually rendering the pages; nothing is estimated, and no result
 * is ever reported at a size it did not measure.
 *
 * On honesty about the limit: a PDF is a floor, not a knob. A scanned page has
 * a minimum size below which the text stops being readable, and a document of
 * mostly vector text is often already smaller than the target before any work
 * starts. When the target cannot be met the outcome says so, with the real
 * figure, rather than returning a file that misses the target while implying
 * otherwise.
 */

const PDF_MIME = "application/pdf";

export type ExactQuality = "low" | "balanced" | "high";

/**
 * Starting render scale and JPEG quality per setting.
 *
 * These are the *first* candidate each setting tries, and the bracketing step
 * takes over from there — the setting mainly decides how far down the search is
 * willing to go before it gives up, not what the result looks like.
 */
const QUALITY_SETTINGS: Record<ExactQuality, { scale: number; quality: number; floor: number }> = {
  low: { scale: 1.4, quality: 0.6, floor: 0.18 },
  balanced: { scale: 1.7, quality: 0.72, floor: 0.3 },
  high: { scale: 2.0, quality: 0.85, floor: 0.45 },
};

/**
 * The bottom of the search.
 *
 * Below this the JPEG encoder stops paying for itself — the file stops getting
 * meaningfully smaller and the page stops being readable — so there is nothing
 * to gain by searching further and everything to lose by pretending otherwise.
 * Each setting's `floor` sits above this, so the visitor's quality choice still
 * governs how far down the search is allowed to go.
 */
const MIN_JPEG_SCALE = 0.6;

/**
 * Ceiling on render attempts.
 *
 * Each attempt re-renders every page, so on a 40-page scan this is the number
 * that decides whether the button feels fast or hangs the tab. 14 attempts is
 * enough for the bisection to converge on a target while keeping the worst case
 * bounded — and the bisection narrows its own interval on every step, so it
 * rarely spends all of them.
 */
const MAX_ATTEMPTS = 14;

export const EXACT_PRESETS = [
  { label: "100 KB", bytes: 100 * 1024 },
  { label: "200 KB", bytes: 200 * 1024 },
  { label: "500 KB", bytes: 500 * 1024 },
  { label: "1 MB", bytes: 1024 * 1024 },
] as const;

export interface ExactSizeOutcome {
  result: ResultFile;
  originalSize: number;
  compressedSize: number;
  /** Whether the returned file actually meets `targetBytes`. */
  targetMet: boolean;
  /** True when even the most aggressive setting could not reach the target. */
  impossible: boolean;
  quality: number;
  scale: number;
}

/**
 * Renders the document at one (scale, quality) point and reports the size.
 *
 * A fresh target document is built each time rather than reusing pages between
 * attempts: `PDFDocument.create()` per call keeps a failed or oversized attempt
 * from leaking images into the next one, and the caller needs a complete
 * candidate it can either take or throw away whole.
 */
async function measure(
  file: File,
  scale: number,
  quality: number,
  onPage?: (page: number, total: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const source = await openForRender(file);
  try {
    const target = await PDFDocument.create();
    const total = source.numPages;

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      const page = await source.getPage(pageNumber);
      const size = page.getViewport({ scale: 1 });
      page.cleanup();

      const canvas = await renderPage(source, pageNumber, { scale, maxWidth: 2400 });
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      // A full-page canvas is tens of megabytes; without dropping the
      // dimensions the garbage collector has no reason to have run by the time
      // the next page is rendered, and a long document exhausts the tab.
      canvas.width = 0;
      canvas.height = 0;

      // The one checkpoint that reaches every operation, so cancelling lands
      // between pages rather than after the whole bisection finishes.
      onPage?.(pageNumber, total);

      const image = await target.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const sheet = target.addPage([size.width, size.height]);
      sheet.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });
    }

    return await save(target);
  } finally {
    await closeRender(source);
  }
}

export async function compressPdfToExactSize(
  file: File,
  targetBytes: number,
  setting: ExactQuality,
  report: Report,
): Promise<ExactSizeOutcome> {
  const name = sanitizeFilename(file.name, "compressed");
  const originalBytes = await readPdfBytes(file);
  const originalSize = originalBytes.length;

  if (targetBytes < 1024) {
    throw new Error("Pick a target of at least 1 KB.");
  }

  const start = QUALITY_SETTINGS[setting];

  // A file already under the target is not compressed. Re-encoding it would
  // make it larger and cost the visitor quality for nothing.
  if (originalSize <= targetBytes) {
    report(100, "Already under your target size");
    return {
      result: makeResult(toBlobPart(originalBytes), `${name}.pdf`, PDF_MIME),
      originalSize,
      compressedSize: originalSize,
      targetMet: true,
      impossible: false,
      quality: 1,
      scale: 1,
    };
  }

  // Maps a page position inside the current render pass onto a slice of the
  // progress bar. Without the per-attempt offset the bar would jump back to
  // the start on every bisection step, which reads as the job restarting
  // rather than advancing.
  const onPage = (page: number, total: number) => {
    const share = Math.min(1, page / total);
    report(15 + (attempts / MAX_ATTEMPTS) * 75 * share, `Rendering page ${page} of ${total}`);
  };

  let attempts = 0;
  let best: { bytes: Uint8Array; size: number; quality: number; scale: number } | null = null;
  let bestFits = false;

  /**
   * Records a candidate if it beats what we hold, and returns whether it fit.
   *
   * A fit is never replaced by a miss: once something met the target, a later
   * candidate has to be *smaller* to be worth taking. Without that rule a
   * bisection that overshoots would discard the working answer it just found.
   */
  function accept(bytes: Uint8Array, quality: number, scale: number): boolean {
    const size = bytes.length;
    const fits = size <= targetBytes;
    if (best === null || (fits && !bestFits) || (fits === bestFits && size < best!.size)) {
      best = { bytes, size, quality, scale };
      bestFits = fits;
    }
    return fits;
  }

  // Step 1: the setting's own starting point. If it already fits, stop — this is
  // the common case for a document that was only slightly over the target, and
  // spending the whole budget bisecting a solved problem wastes the visitor's
  // time and battery.
  report(10, "Rendering at your chosen quality");
  let first = await measure(file, start.scale, start.quality, onPage);
  attempts += 1;
  if (accept(first, start.quality, start.scale)) {
    report(100, "Target reached");
    return finish(best!, originalSize, originalBytes, name, targetBytes);
  }

  // Step 2: bisect. `low` is the most aggressive setting still known to be too
  // big; `high` is the mildest known to be too big — until a fit is found, at
  // which point `high` becomes the best fit and `low` stays the boundary.
  let lowScale = MIN_JPEG_SCALE;
  let lowQuality = start.floor;
  let highScale = start.scale;
  let highQuality = start.quality;

  while (attempts < MAX_ATTEMPTS) {
    // Midpoint of the current bracket. Scale carries more of the size change
    // than quality does, so it is moved first: dropping the resolution is what
    // gets a heavy scan under a tight target, and lowering quality alone on an
    // oversized page mostly just makes it ugly at the same size.
    const scale = (lowScale + highScale) / 2;
    const quality = (lowQuality + highQuality) / 2;

    report(
      15 + Math.round((attempts / MAX_ATTEMPTS) * 75),
      `Trying compression pass ${attempts + 1} of ${MAX_ATTEMPTS}...`,
    );

    const bytes = await measure(file, scale, quality, onPage);
    attempts += 1;

    if (accept(bytes, quality, scale)) {
      // Fits. Try to do better, but never below the floor the visitor's setting
      // implies — going past it would hit the target with unreadable pages,
      // which is not the promise being made here.
      highScale = scale;
      highQuality = quality;
      if (quality <= start.floor || scale <= MIN_JPEG_SCALE) break;
    } else {
      lowScale = scale;
      lowQuality = quality;
      if (scale <= MIN_JPEG_SCALE && quality <= start.floor) break;
    }
  }

  // Nothing met the target. `best` holds the smallest file actually produced,
  // which is the honest answer: here is the smallest legible file we could
  // make, and here is how far it fell short.
  if (best === null) {
    // Only reachable if every attempt failed to produce bytes — measure()
    // propagates errors, so this is a guard rather than an expected path.
    throw new Error("Compression produced no output. Please try again.");
  }
  return finish(best, originalSize, originalBytes, name, targetBytes);
}

/**
 * Builds the outcome, keeping the original whenever compression did not help.
 *
 * A file larger than its input is not a compression result. Handing back the
 * original is the only honest option, and `targetMet` then reports what is
 * actually true about the returned bytes rather than what the search was
 * aiming at.
 */
function finish(
  best: { bytes: Uint8Array; size: number; quality: number; scale: number },
  originalSize: number,
  originalBytes: Uint8Array,
  name: string,
  targetBytes: number,
): ExactSizeOutcome {
  if (best.size >= originalSize) {
    return {
      result: makeResult(toBlobPart(originalBytes), `${name}.pdf`, PDF_MIME),
      originalSize,
      compressedSize: originalSize,
      targetMet: false,
      impossible: true,
      quality: 1,
      scale: 1,
    };
  }

  const targetMet = best.size <= targetBytes;
  return {
    result: makeResult(toBlobPart(best.bytes), `${name}.pdf`, PDF_MIME),
    originalSize,
    compressedSize: best.size,
    targetMet,
    impossible: !targetMet,
    quality: best.quality,
    scale: best.scale,
  };
}

/** Parses a user-typed target such as "500 KB", "1mb" or "1048576". */
export function parseTargetSize(input: string): number | null {
  const trimmed = input.trim().toLowerCase().replace(/,/g, "");
  if (trimmed === "") return null;

  // A bare number is bytes. Zero is rejected here rather than downstream: a
  // target of 0 is not a hard target, it is a mistake, and treating it as a
  // real limit would drive the search to its floor for nothing.
  if (/^\d+$/.test(trimmed)) {
    const bytes = Number(trimmed);
    return bytes > 0 ? bytes : null;
  }

  const match = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb|k|m|g|b)?$/.exec(trimmed);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2] ?? "b";
  const multiplier =
    unit === "kb" || unit === "k" ? 1024
    : unit === "mb" || unit === "m" ? 1024 * 1024
    : unit === "gb" || unit === "g" ? 1024 * 1024 * 1024
    : 1;
  const bytes = Math.round(amount * multiplier);
  return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
}