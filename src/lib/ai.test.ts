import { afterEach, describe, expect, it, vi } from "vitest";
import { processAiDocument, splitAiDocumentText } from "./ai";

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

  it("rejects an invalid chunk size", () => {
    expect(() => splitAiDocumentText("text", 0)).toThrow(/positive integer/);
  });
});

describe("processAiDocument", () => {
  it("sends every text chunk and combines the partial results", async () => {
    const prompts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const payload = JSON.parse(String(init?.body)) as { prompt: string };
        prompts.push(payload.prompt);
        return new Response(JSON.stringify({ text: "partial result" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const result = await processAiDocument(
      "x".repeat(12_001),
      (chunk) => chunk,
      (parts) => `Combine: ${JSON.stringify(parts)}`,
    );

    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toHaveLength(12_000);
    expect(prompts[1]).toBe("x");
    expect(prompts[2]).toBe('Combine: ["partial result","partial result"]');
    expect(result).toBe("partial result");
  });
});
