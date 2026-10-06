/**
 * qpdf compiled to WebAssembly, used for the two password tools.
 *
 * Encryption is not something pdf-lib can do, so protect and unlock go
 * through the real qpdf binary instead. It runs in a worker-free WASM
 * instance on the main thread; the job is short and the whole PDF has to be
 * in memory either way, so a worker would only add a copy.
 */

import type { QpdfWasm } from "qpdf-wasm/qpdf.js";
import wasmUrl from "qpdf-wasm/qpdf.wasm?url";

let loaded: Promise<QpdfWasm> | null = null;

export function loadQpdf(): Promise<QpdfWasm> {
  if (!loaded) {
    loaded = import("qpdf-wasm/qpdf.js").then(async (mod) => {
      return mod.default({ locateFile: () => wasmUrl });
    });
  }
  return loaded;
}

export interface QpdfRun {
  bytes: Uint8Array;
  log: string;
}

/**
 * Runs qpdf with the given arguments over a PDF and returns the written file.
 *
 * qpdf reports problems by writing to stderr and exiting non-zero, so the
 * output is captured and turned into an exception with the real message
 * rather than a generic failure.
 */
export async function runQpdf(
  input: Uint8Array,
  args: string[],
  workName = "in.pdf",
): Promise<QpdfRun> {
  const qpdf = await loadQpdf();
  const outName = "out.pdf";
  const log: string[] = [];

  const originalPrint = console.log;
  const originalError = console.error;
  console.log = (...parts: unknown[]) => log.push(parts.join(" "));
  console.error = (...parts: unknown[]) => log.push(parts.join(" "));

  try {
    qpdf.FS.writeFile(workName, input);
    try {
      qpdf.callMain([workName, outName, ...args]);
    } catch (caught) {
      const status = (caught as { status?: number }).status;
      // qpdf exits 3 for a warning-level error, which still leaves a usable
      // output file, and non-zero for a real failure.
      if (status !== 0 && status !== 3) {
        throw new Error(log.join("\n").trim() || "qpdf could not process this file.");
      }
    }
    return { bytes: qpdf.FS.readFile(outName), log: log.join("\n") };
  } finally {
    console.log = originalPrint;
    console.error = originalError;
    try {
      qpdf.FS.unlink(workName);
      qpdf.FS.unlink(outName);
    } catch {
      // Nothing to clean up if qpdf never wrote both files.
    }
  }
}