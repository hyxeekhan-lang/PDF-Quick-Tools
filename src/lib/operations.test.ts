import { beforeAll, describe, expect, it } from "vitest";
import type { PDFDocument } from "pdf-lib";
import { loadPdfLib } from "./pdf";
import { deletePages, keepPages, mergePdfs, rearrangePages, rotatePdf, splitToSinglePages } from "./operations";
import { FriendlyError, toAcceptedFile, type ResultFile } from "./files";
import type { Report } from "#/hooks/useToolRun";

/**
 * These exercise the real pdf-lib round trip rather than mocks: the failure
 * that matters on this site is a tool producing a corrupt or wrong-order file,
 * and only an actual save/load proves otherwise.
 */

const noop: Report = () => {};

/**
 * Builds a PDF with `count` pages, each carrying a distinct page width.
 *
 * The identity is stored in the MediaBox rather than as drawn text: text lives
 * in a compressed content stream, so reading it back is not reliable in a test.
 * A page's width survives any reordering, so this is exactly what a wrong-order
 * bug would corrupt.
 */
const BASE_WIDTH = 200;
async function makePdf(count: number, name = "test.pdf"): Promise<File> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) {
    doc.addPage([BASE_WIDTH + (i + 1), 200]);
  }
  const bytes = await doc.save();
  return new File([bytes.buffer as ArrayBuffer], name, { type: "application/pdf" });
}

/** The page number stamped by `makePdf`, in document order. */
function widthToPage(width: number): number {
  return width - BASE_WIDTH;
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

/**
 * A tool hands back an object URL rather than the bytes, so the tests read it
 * back the same way the download button does. Reading through the URL also
 * means a result that cannot be fetched is caught here, not in the browser.
 */
async function resultBytes(result: ResultFile): Promise<Uint8Array> {
  const response = await fetch(result.url);
  return new Uint8Array(await response.arrayBuffer());
}

async function reopen(result: ResultFile): Promise<PDFDocument> {
  const { PDFDocument } = await loadPdfLib();
  return PDFDocument.load(await resultBytes(result));
}

/** Which original page each output page came from, in document order. */
async function pageMarkers(result: ResultFile): Promise<number[]> {
  const doc = await reopen(result);
  return doc.getPages().map((page) => widthToPage(page.getWidth()));
}

let ready = false;
beforeAll(async () => {
  await loadPdfLib();
  ready = true;
});

describe("test fixtures", () => {
  it("builds a readable multi-page PDF", async () => {
    const file = await makePdf(3);
    expect(await pageCount(new Uint8Array(await file.arrayBuffer()))).toBe(3);
    expect(ready).toBe(true);
  });
});

describe("mergePdfs", () => {
  it("concatenates every file in the order given", async () => {
    const files = [
      toAcceptedFile(await makePdf(2, "a.pdf")),
      toAcceptedFile(await makePdf(3, "b.pdf")),
    ];
    const result = await mergePdfs(files, noop);
    expect(await pageCount(await resultBytes(result))).toBe(5);
  });

  it("refuses a single file, which is not a merge", async () => {
    await expect(
      mergePdfs([toAcceptedFile(await makePdf(2))], noop),
    ).rejects.toThrow(FriendlyError);
  });

  it("refuses an empty selection", async () => {
    await expect(mergePdfs([], noop)).rejects.toThrow(FriendlyError);
  });
});

describe("keepPages", () => {
  it("keeps the chosen pages in the order requested", async () => {
    const file = await makePdf(5);
    const result = await keepPages(file, [4, 0, 2], noop, "extract");
    expect(await pageCount(await resultBytes(result))).toBe(3);
    expect(await pageMarkers(result)).toEqual([5, 1, 3]);
  });

  it("allows the same page twice, which is how you duplicate one", async () => {
    const file = await makePdf(3);
    const result = await keepPages(file, [1, 1], noop, "extract");
    expect(await pageMarkers(result)).toEqual([2, 2]);
  });

  it("rejects an empty selection rather than returning a 0-page PDF", async () => {
    await expect(keepPages(await makePdf(3), [], noop, "x")).rejects.toThrow(FriendlyError);
  });

  it("rejects an index past the end instead of writing a broken file", async () => {
    await expect(keepPages(await makePdf(3), [0, 5], noop, "x")).rejects.toThrow(/does not exist/);
  });

  it("names the output after the input", async () => {
    const result = await keepPages(await makePdf(2, "My Report.pdf"), [0], noop, "extract");
    expect(result.filename).toBe("My Report-extract.pdf");
  });
});

describe("deletePages", () => {
  it("removes exactly the listed pages", async () => {
    const result = await deletePages(await makePdf(5), new Set([1, 3]), noop);
    expect(await pageMarkers(result)).toEqual([1, 3, 5]);
  });

  it("refuses to delete every page, which would leave nothing", async () => {
    await expect(deletePages(await makePdf(3), new Set([0, 1, 2]), noop)).rejects.toThrow(FriendlyError);
  });

  it("refuses a selection that removes nothing, so it cannot loop", async () => {
    await expect(deletePages(await makePdf(3), new Set(), noop)).rejects.toThrow(FriendlyError);
  });
});

describe("rearrangePages", () => {
  it("puts the pages in the order given", async () => {
    const result = await rearrangePages(await makePdf(4), [3, 2, 1, 0], noop);
    expect(await pageMarkers(result)).toEqual([4, 3, 2, 1]);
  });

  it("rejects a partial order, which would silently drop pages", async () => {
    await expect(rearrangePages(await makePdf(4), [0, 1], noop)).rejects.toThrow(FriendlyError);
  });

  it("rejects an order that repeats a page", async () => {
    await expect(rearrangePages(await makePdf(3), [0, 0, 1], noop)).rejects.toThrow(FriendlyError);
  });
});

describe("splitToSinglePages", () => {
  it("produces one single-page PDF per requested page", async () => {
    const parts = await splitToSinglePages(await makePdf(3), [0, 2], noop);
    expect(parts).toHaveLength(1);
    // More than one page is packed into a zip rather than returned loose.
    expect(parts[0]!.filename).toMatch(/\.zip$/);
  });

  it("returns a bare PDF when only one page is split out", async () => {
    const parts = await splitToSinglePages(await makePdf(3), [1], noop);
    expect(parts).toHaveLength(1);
    expect(await pageCount(await resultBytes(parts[0]!))).toBe(1);
    expect(await pageMarkers(parts[0]!)).toEqual([2]);
  });

  it("rejects an empty selection", async () => {
    await expect(splitToSinglePages(await makePdf(3), [], noop)).rejects.toThrow(FriendlyError);
  });
});

describe("rotatePdf", () => {
  it("sets the rotation on every selected page", async () => {
    const result = await rotatePdf(await makePdf(3), [0, 2], 90, noop);
    const doc = await reopen(result);
    expect(doc.getPages().map((page) => page.getRotation().angle)).toEqual([90, 0, 90]);
  });

  it("accepts a 180-degree turn", async () => {
    const result = await rotatePdf(await makePdf(2), [0], 180, noop);
    const doc = await reopen(result);
    expect(doc.getPages()[0]!.getRotation().angle).toBe(180);
  });

  it("rejects an empty selection", async () => {
    await expect(rotatePdf(await makePdf(2), [], 90, noop)).rejects.toThrow(FriendlyError);
  });
});