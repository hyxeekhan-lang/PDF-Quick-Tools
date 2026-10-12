import { afterEach, describe, expect, it, vi } from "vitest";
import { splitAiDocumentText } from "./ai";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("splitAiDocumentText", () => {
  it("preserves all text while splitting at readable boundaries", () => {
    const text = `${"first paragraph. ".repeat(4)}\n\n${"second paragraph. ".repeat(4)}`;
    const chunks = splitAiDocumentText(text, 50);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(text);
    expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
  });

  it("returns no chunks for empty text", () => {
    expect(splitAiDocumentText("")).toEqual([]);
  });

  it("splits long text into multiple small chunks", () => {
    const longText = " ".repeat(200);
    const chunks = splitAiDocumentText(longText, 30);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.join("")).toBe(longText);
  });
});