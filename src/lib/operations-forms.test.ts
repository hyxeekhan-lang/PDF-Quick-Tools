import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createFillablePdf } from "./operations-forms";
import { revokeResults } from "./files";

async function blankPdf(): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([400, 600]);
  const bytes = await document.save();
  return new File([bytes.slice().buffer], "blank.pdf", { type: "application/pdf" });
}

describe("createFillablePdf", () => {
  it("adds text and checkbox fields to the requested page", async () => {
    const report = vi.fn();
    const result = await createFillablePdf(await blankPdf(), [
      { name: "Full_Name", type: "text", page: 0, x: 0.1, y: 0.2, width: 0.4, height: 0.06 },
      { name: "Agree", type: "checkbox", page: 0, x: 0.1, y: 0.4, width: 0.05, height: 0.05 },
    ], report);

    expect(result.filename).toBe("blank-fillable.pdf");
    const response = await fetch(result.url);
    const saved = await PDFDocument.load(await response.arrayBuffer());
    expect(saved.getForm().getFields().map((field) => field.getName())).toEqual(["Full_Name", "Agree"]);
    expect(report).toHaveBeenCalled();
    revokeResults([result]);
  });

  it("rejects duplicate names and fields outside the page", async () => {
    const field = { name: "Name", type: "text" as const, page: 0, x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
    await expect(createFillablePdf(await blankPdf(), [field, field], vi.fn()))
      .rejects.toThrow("invalid placement or a duplicate name");
    await expect(createFillablePdf(await blankPdf(), [
      { ...field, name: "Outside", x: 0.9 },
    ], vi.fn())).rejects.toThrow("invalid placement or a duplicate name");
  });
});
