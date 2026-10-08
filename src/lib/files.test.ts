import { describe, expect, it } from "vitest";
import { formatBytes, sanitizeFilename, validateFile } from "./files";
import { MAX_FILE_BYTES } from "./site";

function fakeFile(name: string, type: string, size = 1024): File {
  return { name, type, size } as File;
}

describe("formatBytes", () => {
  it("never shows a meaningless size", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(-1)).toBe("0 KB");
    expect(formatBytes(Number.NaN)).toBe("0 KB");
  });

  it("switches units at each boundary", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });

  it("keeps one decimal until 10 KB, then rounds to whole", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(20 * 1024)).toBe("20 KB");
  });

  it("keeps two decimals below 10 MB and one above", () => {
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.50 MB");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25.0 MB");
  });
});

/**
 * These names end up in a `download` attribute and a `saveAs` filename, so a
 * traversal attempt must not survive sanitising.
 */
describe("sanitizeFilename", () => {
  it("keeps an ordinary name", () => {
    expect(sanitizeFilename("Q3 Report.pdf")).toBe("Q3 Report");
  });

  it("strips a directory path", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\Me\\invoice.pdf")).toBe("invoice");
    expect(sanitizeFilename("/var/tmp/report.pdf")).toBe("report");
  });

  it("keeps non-Latin scripts", () => {
    expect(sanitizeFilename("گزارش.pdf")).toBe("گزارش");
    expect(sanitizeFilename("報告書.pdf")).toBe("報告書");
  });

  it("drops characters that could break out of a shell or a path", () => {
    expect(sanitizeFilename("re;port$.pdf")).toBe("report");
    expect(sanitizeFilename("a<b>c.pdf")).toBe("abc");
  });

  it("removes control characters", () => {
    // Built in code rather than pasted literally: raw control bytes in source
    // are invisible and get stripped by editors and formatters.
    const withControl = ["re", "po", "rt.pdf"].join(String.fromCharCode(0));
    expect(sanitizeFilename(withControl)).toBe("report");
  });

  it("does not leave leading dots that would hide the file", () => {
    expect(sanitizeFilename(".hidden.pdf")).toBe("hidden");
    expect(sanitizeFilename("...pdf")).toBe("document");
  });

  it("falls back when nothing usable is left", () => {
    expect(sanitizeFilename("")).toBe("document");
    expect(sanitizeFilename("///")).toBe("document");
    expect(sanitizeFilename("", "scan")).toBe("scan");
  });

  it("caps the length so a long name cannot break the download attribute", () => {
    expect(sanitizeFilename(`${"a".repeat(300)}.pdf`)).toHaveLength(80);
  });
});

describe("validateFile", () => {
  it("accepts a PDF", () => {
    expect(validateFile(fakeFile("a.pdf", "application/pdf"), "pdf")).toBeNull();
  });

  it("rejects a non-PDF wearing a .pdf name", () => {
    expect(validateFile(fakeFile("a.pdf", "text/html"), "pdf")).toMatch(/not a PDF/);
  });

  it("rejects a renamed non-PDF", () => {
    expect(validateFile(fakeFile("virus.exe", "application/x-msdownload"), "pdf")).toMatch(/not a PDF/);
  });

  it("rejects an uppercase extension it should accept case-insensitively", () => {
    expect(validateFile(fakeFile("REPORT.PDF", "application/pdf"), "pdf")).toBeNull();
  });

  it("rejects a file over the size limit and names the limit", () => {
    const big = fakeFile("big.pdf", "application/pdf", MAX_FILE_BYTES + 1);
    expect(validateFile(big, "pdf")).toMatch(/50 MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    const edge = fakeFile("edge.pdf", "application/pdf", MAX_FILE_BYTES);
    expect(validateFile(edge, "pdf")).toBeNull();
  });

  it("checks the size for images too", () => {
    const big = fakeFile("big.png", "image/png", MAX_FILE_BYTES + 1);
    expect(validateFile(big, "image")).toMatch(/50 MB/);
  });

  it("rejects an unsupported image format", () => {
    expect(validateFile(fakeFile("a.gif", "image/gif"), "image")).toBeTruthy();
    expect(validateFile(fakeFile("a.jpg", "image/jpeg"), "image")).toBeNull();
  });

  it("keeps .docx and .doc apart, and says how to convert", () => {
    const zip = "application/zip";
    expect(validateFile(fakeFile("a.doc", zip), "document")).toMatch(/\.docx/);
    expect(validateFile(fakeFile("a.docx", zip), "document")).toBeNull();
  });

  it("returns null rather than throwing, so a batch can report each file", () => {
    expect(() => validateFile(fakeFile("a.pdf", "application/pdf"), "pdf")).not.toThrow();
  });
});