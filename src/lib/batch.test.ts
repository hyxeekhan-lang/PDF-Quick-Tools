import { describe, expect, it } from "vitest";
import { MAX_BATCH_BYTES, MAX_BATCH_FILES, validateBatch } from "./batch";
import type { AcceptedFile } from "./files";

function file(name: string, size: number): AcceptedFile {
  return { id: name, file: null as unknown as File, name, size };
}

describe("validateBatch", () => {
  it("requires at least one PDF", () => {
    expect(validateBatch([])).toBe("Choose at least one PDF.");
  });

  it("rejects too many files and combined sizes over the limit", () => {
    expect(
      validateBatch(
        Array.from({ length: MAX_BATCH_FILES + 1 }, (_, index) =>
          file(`${index}.pdf`, 1),
        ),
      ),
    ).toContain(`no more than ${MAX_BATCH_FILES}`);
    expect(validateBatch([file("large.pdf", MAX_BATCH_BYTES + 1)])).toContain(
      "batch limit",
    );
  });

  it("accepts exactly five files and a combined size of 100 MB", () => {
    expect(
      validateBatch([
        file("1.pdf", MAX_BATCH_BYTES / MAX_BATCH_FILES),
        file("2.pdf", MAX_BATCH_BYTES / MAX_BATCH_FILES),
        file("3.pdf", MAX_BATCH_BYTES / MAX_BATCH_FILES),
        file("4.pdf", MAX_BATCH_BYTES / MAX_BATCH_FILES),
        file("5.pdf", MAX_BATCH_BYTES / MAX_BATCH_FILES),
      ]),
    ).toBeNull();
  });
});
