import { MAX_FILE_BYTES, MAX_FILE_LABEL } from "./site";

export const PDF_ACCEPT = "application/pdf,.pdf";
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** The modern Word format. The old .doc is a different container entirely. */
export const DOCX_ACCEPT =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx";

/** The modern Excel format. .xls is a different container entirely. */
export const XLSX_ACCEPT =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

/**
 * Filenames from a picker are user input and end up in a download attribute, so
 * strip paths, control characters and anything that could be read as a path.
 */
export function sanitizeFilename(name: string, fallback = "document"): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const cleaned = withoutExt
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} ._-]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 80)
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export class FriendlyError extends Error {}

/** Throws a message that is safe and useful to show a person. */
export function friendly(message: string): never {
  throw new FriendlyError(message);
}

export interface AcceptedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `f${counter}_${Date.now().toString(36)}`;
}

export type FileKind = "pdf" | "image" | "document" | "spreadsheet";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
const DOCX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Some systems hand a .docx over with the generic zip type attached.
  "application/zip",
]);
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

function extensionOf(name: string): string {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Checks type, extension and size before anything is read. Returns a friendly
 * message instead of throwing so a multi-file drop can report per file.
 */
export function validateFile(file: File, kind: FileKind): string | null {
  const ext = extensionOf(file.name);

  if (kind === "pdf") {
    const typeOk = file.type === "application/pdf" || file.type === "";
    if (!typeOk || ext !== "pdf") {
      return `"${file.name}" is not a PDF. Please choose a file ending in .pdf.`;
    }
  } else if (kind === "document") {
    const typeOk = DOCX_TYPES.has(file.type) || file.type === "";
    if (!typeOk || ext !== "docx") {
      return `"${file.name}" is not a Word document. Please choose a file ending in .docx. If it ends in .doc, open it in Word and use Save As to make a .docx first.`;
    }
  } else if (kind === "spreadsheet") {
    const typeOk = XLSX_TYPES.has(file.type) || file.type === "";
    if (!typeOk || ext !== "xlsx") {
      return `"${file.name}" is not an Excel workbook. Please choose a file ending in .xlsx. If it ends in .xls or .csv, open it in Excel and use Save As to make a .xlsx first.`;
    }
  } else {
    const typeOk = IMAGE_TYPES.has(file.type) || file.type === "";
    if (!typeOk || !IMAGE_EXTS.has(ext)) {
      return `"${file.name}" is not a supported image. Use a JPG, PNG or WebP file.`;
    }
  }

  if (file.size === 0) {
    return `"${file.name}" is empty. Please choose a different file.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. The limit is ${MAX_FILE_LABEL} per file.`;
  }
  return null;
}

export function toAcceptedFile(file: File): AcceptedFile {
  return { id: nextId(), file, name: file.name, size: file.size };
}

/**
 * Reads the bytes and confirms the file really starts with %PDF. The picker's
 * MIME type is supplied by the OS and is not evidence on its own.
 */
export async function readPdfBytes(file: File): Promise<Uint8Array> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return friendly(
      "That file could not be read. It may have been moved or renamed since you picked it.",
    );
  }
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 5) {
    return friendly("That PDF looks empty. Please choose a different file.");
  }
  const header = bytes.subarray(0, 1024);
  let offset = -1;
  for (let i = 0; i <= header.length - 4; i += 1) {
    if (
      header[i] === PDF_MAGIC[0] &&
      header[i + 1] === PDF_MAGIC[1] &&
      header[i + 2] === PDF_MAGIC[2] &&
      header[i + 3] === PDF_MAGIC[3]
    ) {
      offset = i;
      break;
    }
  }
  if (offset === -1) {
    return friendly(
      `"${file.name}" does not look like a valid PDF. It may be damaged or saved in another format.`,
    );
  }
  return bytes;
}

export async function readImageBytes(file: File): Promise<Uint8Array> {
  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return friendly(
      "That image could not be read. It may have been moved or renamed since you picked it.",
    );
  }
}

export interface ResultFile {
  filename: string;
  url: string;
  size: number;
}

export function makeResult(
  data: BlobPart,
  filename: string,
  mime: string,
): ResultFile {
  const blob = new Blob([data], { type: mime });
  return { filename, url: URL.createObjectURL(blob), size: blob.size };
}

export function revokeResults(results: ResultFile[]): void {
  for (const result of results) URL.revokeObjectURL(result.url);
}

export function triggerDownload(result: ResultFile): void {
  const link = document.createElement("a");
  link.href = result.url;
  link.download = result.filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
