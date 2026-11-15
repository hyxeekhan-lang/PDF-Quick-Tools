import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { GET, OPTIONS, POST } from "./v1";

const API_KEY = "test-pdf-api-key";

async function makePdf(pages = 2): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let page = 0; page < pages; page += 1) document.addPage([200 + page, 300]);
  return document.save();
}

function makeRequest(
  operation: string,
  files: Array<{ name: string; type: string; bytes: Uint8Array }>,
  apiKey = API_KEY,
): Request {
  const form = new FormData();
  form.set("operation", operation);
  for (const file of files) {
    const data = new Uint8Array(file.bytes.length);
    data.set(file.bytes);
    form.append("files", new File([data.buffer], file.name, { type: file.type }));
  }
  return new Request("https://pdfpilot.site/api/v1", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

async function responsePdf(response: Response): Promise<PDFDocument> {
  return PDFDocument.load(new Uint8Array(await response.arrayBuffer()));
}

beforeEach(() => {
  vi.stubEnv("PDF_API_KEY", API_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/v1", () => {
  it("lists available operations and limits", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({ status: "ready" });
  });

  it("answers CORS preflight requests", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("requires a configured, matching API key before accepting files", async () => {
    const request = makeRequest("merge", [], "wrong-key");
    expect((await POST(request)).status).toBe(401);

    vi.stubEnv("PDF_API_KEY", "");
    const unconfigured = makeRequest("merge", []);
    expect((await POST(unconfigured)).status).toBe(503);
  });

  it("merges uploaded PDFs and returns a downloadable PDF", async () => {
    const response = await POST(
      makeRequest("merge", [
        { name: "first.pdf", type: "application/pdf", bytes: await makePdf(2) },
        { name: "second.pdf", type: "application/pdf", bytes: await makePdf(3) },
      ]),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect((await responsePdf(response)).getPageCount()).toBe(5);
  });

  it("splits a PDF into one PDF per page", async () => {
    const response = await POST(
      makeRequest("split", [
        { name: "source.pdf", type: "application/pdf", bytes: await makePdf(2) },
      ]),
    );

    expect(response.status).toBe(200);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["page-1.pdf", "page-2.pdf"]);
    for (const file of Object.values(zip.files)) {
      expect((await PDFDocument.load(await file.async("uint8array"))).getPageCount()).toBe(1);
    }
  });

  it("returns a valid PDF from compression, even if it cannot shrink the input", async () => {
    const response = await POST(
      makeRequest("compress", [
        { name: "source.pdf", type: "application/pdf", bytes: await makePdf() },
      ]),
    );

    expect(response.status).toBe(200);
    expect(["compressed", "unchanged"]).toContain(response.headers.get("X-Compression-Result"));
    expect((await responsePdf(response)).getPageCount()).toBe(2);
  });

  it("converts JPEG input to PDF", async () => {
    const canvas = createCanvas(8, 8);
    const jpg = canvas.toBuffer("image/jpeg");
    const response = await POST(
      makeRequest("jpg-to-pdf", [
        { name: "image.jpg", type: "image/jpeg", bytes: new Uint8Array(jpg) },
      ]),
    );

    expect(response.status).toBe(200);
    expect((await responsePdf(response)).getPageCount()).toBe(1);
  });

  it("converts PDF pages to JPEG files", async () => {
    const response = await POST(
      makeRequest("pdf-to-jpg", [
        { name: "source.pdf", type: "application/pdf", bytes: await makePdf(1) },
      ]),
    );

    expect(response.status).toBe(200);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const jpg = await zip.file("page-1.jpg")!.async("uint8array");
    expect(jpg.slice(0, 3)).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });

  it("rejects a PDF upload with a non-PDF payload", async () => {
    const response = await POST(
      makeRequest("compress", [
        { name: "fake.pdf", type: "application/pdf", bytes: new Uint8Array([1, 2, 3]) },
      ]),
    );

    expect(response.status).toBe(415);
  });
});
