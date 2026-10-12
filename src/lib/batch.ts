import { formatBytes, type AcceptedFile } from "./files";

export const MAX_BATCH_FILES = 5;
export const MAX_BATCH_BYTES = 100 * 1024 * 1024;

export function validateBatch(files: AcceptedFile[]): string | null {
  if (files.length === 0) return "Choose at least one PDF.";
  if (files.length > MAX_BATCH_FILES) {
    return `Choose no more than ${MAX_BATCH_FILES} PDFs at a time.`;
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_BATCH_BYTES) {
    return `The combined file size is ${formatBytes(total)}. The batch limit is ${formatBytes(MAX_BATCH_BYTES)}.`;
  }
  return null;
}
