import { describe, expect, it, vi } from "vitest";
import { EXACT_PRESETS, parseTargetSize } from "./exact-size";

/**
 * The rendering pipeline needs pdf.js and a real canvas, neither of which
 * exists in Node. These tests therefore cover the two pure decisions that carry
 * the feature's contract: how a typed target becomes a byte count, and whether
 * the reported outcome matches the bytes actually produced.
 */

/**
 * Hoisted to module scope because `vi.doMock`'s factory is lifted above the
 * test body, so a local declared inside it would not exist when the factory
 * runs — which is the failure mode where a test passes against an empty mock.
 */
const mocks = vi.hoisted(() => ({
  renderPage: vi.fn(async () => ({ width: 612, height: 792 })),
}));

describe("parseTargetSize", () => {
  it("reads a bare number as bytes", () => {
    expect(parseTargetSize("2048")).toBe(2048);
  });

  it("reads the units a person actually types", () => {
    expect(parseTargetSize("100 KB")).toBe(102400);
    expect(parseTargetSize("1mb")).toBe(1024 * 1024);
    expect(parseTargetSize("1.5 MB")).toBe(Math.round(1.5 * 1024 * 1024));
    expect(parseTargetSize("2 gb")).toBe(2 * 1024 * 1024 * 1024);
    // No space, and the short forms people use in chat.
    expect(parseTargetSize("500KB")).toBe(512000);
    expect(parseTargetSize("500k")).toBe(512000);
  });

  it("ignores thousands separators rather than rejecting the input", () => {
    expect(parseTargetSize("1,024")).toBe(1024);
  });

  it("rejects input that is not a size", () => {
    // NaN would silently become a target of zero and compress everything to
    // garbage, so these must return null rather than a number.
    expect(parseTargetSize("")).toBeNull();
    expect(parseTargetSize("big")).toBeNull();
    expect(parseTargetSize("-5 MB")).toBeNull();
    expect(parseTargetSize("about 1 MB")).toBeNull();
    expect(parseTargetSize("0")).toBeNull();
  });
});

describe("presets", () => {
  it("offers the four sizes an upload form actually caps at", () => {
    expect(EXACT_PRESETS.map((preset) => preset.label)).toEqual([
      "100 KB",
      "200 KB",
      "500 KB",
      "1 MB",
    ]);
  });

  it("maps each label to the byte count that label means", () => {
    // 100 KB must be 102400, not 100000: an email server saying "1 MB" means
    // 1048576, and a preset that used the decimal reading would miss the real
    // limit by 5%.
    expect(EXACT_PRESETS.find((p) => p.label === "100 KB")?.bytes).toBe(100 * 1024);
    expect(EXACT_PRESETS.find((p) => p.label === "1 MB")?.bytes).toBe(1024 * 1024);
  });
});

describe("outcome honesty", () => {
  it("never reports a target as met unless the returned bytes are under it", async () => {
    // The invariant the whole feature rests on. `compressPdfToExactSize` is
    // called with an unreachably small target, so whatever it returns, the
    // claim has to match the size it measured.
    vi.doMock("./pdf", () => ({
      loadPdfLib: () => Promise.resolve({
        PDFDocument: {
          create: () => Promise.resolve({
            addPage: () => ({ drawImage: () => undefined }),
            embedJpg: () => Promise.resolve({}),
          }),
        },
      }),
      openForRender: () => Promise.resolve({
        numPages: 1,
        // The real code asks each page for its untransformed size and then
        // releases it, so the stand-in has to answer both.
        getPage: () => Promise.resolve({
          getViewport: () => ({ width: 612, height: 792 }),
          cleanup: () => undefined,
        }),
      }),
      renderPage: mocks.renderPage,
      closeRender: () => Promise.resolve(),
      canvasToBlob: () => Promise.resolve(new Blob([new Uint8Array(200 * 1024)])),
      save: () => Promise.resolve(new Uint8Array(200 * 1024)),
      toBlobPart: (bytes: Uint8Array) => bytes,
    }));
    vi.resetModules();

    const { compressPdfToExactSize: run } = await import("./exact-size");
    // readPdfBytes validates the %PDF- magic before anything else, so the
    // fixture has to carry a real header — an all-zero buffer is rejected
    // before compression is ever reached.
    const bytes = new Uint8Array(9 * 1024 * 1024);
    bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    const file = new File([bytes], "big.pdf", { type: "application/pdf" });
    const outcome = await run(file, 20 * 1024, "low", () => {});

    // 200 KB of real output against a 20 KB target: it must not be claimed.
    expect(outcome.compressedSize).toBe(200 * 1024);
    expect(outcome.targetMet).toBe(false);
    expect(outcome.impossible).toBe(true);
    // The rendering really ran, so this is not a vacuous pass.
    expect(mocks.renderPage).toHaveBeenCalled();
  });
});