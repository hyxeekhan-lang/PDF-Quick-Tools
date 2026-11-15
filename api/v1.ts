import { createHash, timingSafeEqual } from "node:crypto";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { clientIp, rateLimitHeaders, takeRateLimit } from "./_rate-limit.js";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_PAGES = 100;
const RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 } as const;
const AUTH_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 } as const;
const API_KEY_ENV = "PDF_API_KEY";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const OPERATIONS = [
  { id: "merge", method: "POST", input: "2-10 PDF files in multipart field `files`", output: "application/pdf" },
  { id: "split", method: "POST", input: "1 PDF in multipart field `files`", output: "application/zip (one PDF per page)" },
  { id: "compress", method: "POST", input: "1 PDF in multipart field `files`", output: "application/pdf" },
  { id: "pdf-to-jpg", method: "POST", input: "1 PDF in multipart field `files`", output: "application/zip (one JPG per page)" },
  { id: "jpg-to-pdf", method: "POST", input: "1-10 JPEG files in multipart field `files`", output: "application/pdf" },
] as const;

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    ...CORS_HEADERS,
  });
  new Headers(headers).forEach((value, key) => responseHeaders.set(key, value));
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function isAuthorized(request: Request): boolean {
  const configured = process.env[API_KEY_ENV];
  if (!configured) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) return false;

  const supplied = createHash("sha256").update(match[1]!).digest();
  const expected = createHash("sha256").update(configured).digest();
  return timingSafeEqual(supplied, expected);
}

function requireApiKey(request: Request): Response | null {
  if (!process.env[API_KEY_ENV]) {
    return json({ error: `${API_KEY_ENV} is not configured on the server.` }, 503);
  }

  const ip = clientIp(request);
  const authLimit = takeRateLimit(`pdf-api-auth:${ip}`, AUTH_RATE_LIMIT);
  if (!authLimit.ok) {
    return json(
      { error: "Too many authentication attempts. Try again shortly." },
      429,
      rateLimitHeaders(authLimit, AUTH_RATE_LIMIT.limit),
    );
  }

  if (!isAuthorized(request)) {
    return json({ error: "A valid Bearer API key is required." }, 401);
  }

  const keyHash = createHash("sha256")
    .update(request.headers.get("authorization") ?? "")
    .digest("hex");
  const limit = takeRateLimit(`pdf-api:${keyHash}`, RATE_LIMIT);
  if (!limit.ok) {
    return json(
      { error: "API rate limit reached. Try again shortly." },
      429,
      rateLimitHeaders(limit, RATE_LIMIT.limit),
    );
  }
  return null;
}

function requireMethod(request: Request, allowed: string[]): Response | null {
  if (allowed.includes(request.method)) return null;
  return json({ error: "Method not allowed." }, 405, { Allow: allowed.join(", ") });
}

async function readForm(request: Request): Promise<{ operation: string; files: File[] }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "Send multipart/form-data with an `operation` and `files` field.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES + 32 * 1024) {
    throw new ApiError(413, "Request is too large. The combined file size must be at most 4 MB.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "The multipart request could not be read.");
  }

  const operation = form.get("operation");
  if (typeof operation !== "string" || !OPERATIONS.some((item) => item.id === operation)) {
    throw new ApiError(400, "Choose a supported `operation`. See GET /api/v1 for the operation list.");
  }

  const fileValues = form.getAll("files");
  if (fileValues.length === 0 || fileValues.some((value) => !(value instanceof File))) {
    throw new ApiError(400, "Add input files using the multipart field name `files`.");
  }
  const files = fileValues as File[];
  if (files.length > MAX_FILES) {
    throw new ApiError(400, `A maximum of ${MAX_FILES} files is allowed.`);
  }
  if (files.some((file) => file.size === 0)) {
    throw new ApiError(400, "Empty files are not allowed.");
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_FILE_BYTES) {
    throw new ApiError(413, "The combined file size must be at most 4 MB.");
  }

  return { operation, files };
}

async function readPdf(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(bytes.subarray(0, 1024));
  if (!header.includes("%PDF-")) {
    throw new ApiError(415, `"${file.name}" is not a valid PDF upload.`);
  }
  return bytes;
}

async function openPdf(file: File): Promise<PDFDocument> {
  try {
    const document = await PDFDocument.load(await readPdf(file), { updateMetadata: false });
    if (document.getPageCount() === 0) throw new ApiError(422, "The PDF has no pages.");
    if (document.getPageCount() > MAX_PAGES) {
      throw new ApiError(413, `PDFs are limited to ${MAX_PAGES} pages per request.`);
    }
    return document;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "The PDF could not be opened. It may be damaged or password-protected.");
  }
}

async function processOperation(operation: string, files: File[]): Promise<Response> {
  if (operation === "merge") {
    if (files.length < 2) throw new ApiError(400, "Merge requires at least two PDF files.");
    const target = await PDFDocument.create();
    for (const file of files) {
      const source = await openPdf(file);
      const pages = await target.copyPages(source, source.getPageIndices());
      pages.forEach((page) => target.addPage(page));
    }
    return binary(await target.save(), "application/pdf", "merged.pdf");
  }

  if (operation === "split") {
    if (files.length !== 1) throw new ApiError(400, "Split requires exactly one PDF file.");
    const source = await openPdf(files[0]!);
    const zip = new JSZip();
    const pageCount = source.getPageCount();
    for (let index = 0; index < pageCount; index += 1) {
      const pageDocument = await PDFDocument.create();
      const [page] = await pageDocument.copyPages(source, [index]);
      pageDocument.addPage(page!);
      zip.file(`page-${index + 1}.pdf`, await pageDocument.save());
    }
    return binary(
      await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
      "application/zip",
      "split-pages.zip",
    );
  }

  if (operation === "compress") {
    if (files.length !== 1) throw new ApiError(400, "Compress requires exactly one PDF file.");
    const sourceBytes = await readPdf(files[0]!);
    const source = await openPdf(files[0]!);
    const compressed = await source.save({ useObjectStreams: true });
    const isSmaller = compressed.length < sourceBytes.length;
    return binary(
      isSmaller ? compressed : sourceBytes,
      "application/pdf",
      "compressed.pdf",
      { "X-Compression-Result": isSmaller ? "compressed" : "unchanged" },
    );
  }

  if (operation === "jpg-to-pdf") {
    const target = await PDFDocument.create();
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        throw new ApiError(415, `"${file.name}" is not a JPEG image.`);
      }
      const image = await target.embedJpg(bytes);
      const page = target.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    return binary(await target.save(), "application/pdf", "images.pdf");
  }

  if (operation === "pdf-to-jpg") {
    if (files.length !== 1) throw new ApiError(400, "PDF to JPG requires exactly one PDF file.");
    const bytes = await readPdf(files[0]!);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PAGES) {
      await loadingTask.destroy();
      throw new ApiError(413, `PDFs are limited to ${MAX_PAGES} pages per request.`);
    }

    const zip = new JSZip();
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 2000 / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;
        zip.file(`page-${pageNumber}.jpg`, canvas.toBuffer("image/jpeg", 75));
        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }
    return binary(
      await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
      "application/zip",
      "pages-jpg.zip",
    );
  }

  throw new ApiError(400, "Unsupported operation.");
}

function binary(
  bytes: Uint8Array,
  contentType: string,
  filename: string,
  extraHeaders: Record<string, string> = {},
): Response {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new ApiError(413, "The generated file is too large for this API's 4 MB response limit.");
  }
  const headers = new Headers({
    "Cache-Control": "no-store",
    ...CORS_HEADERS,
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(bytes.byteLength),
  });
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(new Uint8Array(bytes).buffer, { status: 200, headers });
}

export function GET(): Response {
  return json({
    name: "PDF Quick Tools API",
    version: "v1",
    status: process.env[API_KEY_ENV] ? "ready" : "needs_configuration",
    authentication: "Authorization: Bearer <PDF_API_KEY>",
    limits: {
      combinedUploadBytes: MAX_FILE_BYTES,
      responseBytes: MAX_FILE_BYTES,
      filesPerRequest: MAX_FILES,
      pagesPerPdf: MAX_PAGES,
      requestsPerMinutePerKey: RATE_LIMIT.limit,
    },
    operations: OPERATIONS,
    privacy: "Files are processed in memory and are not intentionally stored.",
  });
}

export async function POST(request: Request): Promise<Response> {
  const methodError = requireMethod(request, ["POST"]);
  if (methodError) return methodError;

  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const { operation, files } = await readForm(request);
    return await processOperation(operation, files);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("[pdf-api] Request processing failed:", error);
    return json({ error: "The PDF operation failed. Check that the input files are valid and try again." }, 500);
  }
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
    },
  });
}
