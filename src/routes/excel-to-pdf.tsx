import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import {
  excelToPdf,
  type ExcelToPdfResult,
  type FitMode,
  type Orientation,
} from "#/lib/operations-excel-to-pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/excel-to-pdf");

export const Route = createFileRoute("/excel-to-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: ExcelToPdfPage,
});

const SHEETS = [
  { value: "all" as const, label: "All sheets", description: "Every sheet in the workbook" },
  { value: "first" as const, label: "First sheet only", description: "Just the one you were looking at" },
];

const ORIENTATIONS = [
  { value: "landscape" as const, label: "Landscape", description: "Better for wide tables" },
  { value: "portrait" as const, label: "Portrait", description: "Better for tall, narrow sheets" },
];

const FITS = [
  { value: "fit" as const, label: "Fit to page", description: "Squeeze columns so nothing is cut off" },
  { value: "actual" as const, label: "As it is", description: "Keep the sheet's own column widths" },
];

const FAQ = [
  {
    question: "Does it print just like Excel does?",
    answer:
      "No, and nothing in a browser can. This draws the cells, the text, the bold, the fills and the column widths onto A4 pages. Page breaks, print areas, repeating rows, charts, images and conditional formatting are not carried over — a chart in a workbook is an object, not text, and there is no way to redraw it here.",
  },
  {
    question: "What happens to a sheet that is longer than the page?",
    answer:
      "It continues onto the next page, and the sheet's heading rows are printed again at the top of each one so the second page is still readable.",
  },
  {
    question: "My formulas will show as text, why?",
    answer:
      "They will not. The formula is replaced by the value Excel last calculated and stored in that cell, which is what the PDF shows. If a formula was never calculated — on a workbook made by a program rather than by Excel — the cached value may be missing and the cell will come out blank.",
  },
  {
    question: "Will dates come out right?",
    answer:
      "Yes, written as day, month and year. Deliberately not in your browser's regional format, so the same workbook prints identically for everyone who opens the PDF.",
  },
  {
    question: "Can I choose the page size?",
    answer:
      "Only A4, in portrait or landscape. Adding a page size picker would mean a dozen near-identical options in the interface for very little difference in the result.",
  },
  {
    question: "Is my spreadsheet uploaded to convert it?",
    answer:
      "No. The workbook is read in your browser and the PDF is built there too, so nothing about your data is sent to a server. That matters more than usual for a spreadsheet.",
  },
];

function ExcelToPdfPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [sheets, setSheets] = useState<"all" | "first">("all");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [fit, setFit] = useState<FitMode>("fit");
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  // Kept out of useToolRun on purpose: that hook only knows about files, and
  // the counts here come from the operation's own return value.
  const [outcome, setOutcome] = useState<ExcelToPdfResult | null>(null);

  const startOver = useCallback(() => {
    setFile(null);
    setOutcome(null);
    run.reset();
  }, [run]);

  async function convert() {
    if (!file) return;
    await run.run(async (report) => {
      const result = await excelToPdf(file.file, { sheets, orientation, fit }, report);
      setOutcome(result);
      return [result.result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="spreadsheet"
            toolName={tool.name}
            onFiles={(files) => {
              run.reset();
              setOutcome(null);
              setFile(files[0]);
            }}
            onRejected={run.fail}
          />
        )}

        {file && run.status !== "done" && (
          <>
            <FileList files={[file]} kind="spreadsheet" disabled={busy} onRemove={startOver} />

            <OptionGroup legend="Sheets" hint="Each sheet starts on its own page.">
              <OptionCards
                name="sheets"
                options={SHEETS}
                value={sheets}
                onChange={setSheets}
                disabled={busy}
              />
            </OptionGroup>

            <OptionGroup legend="Page orientation">
              <OptionCards
                name="orientation"
                options={ORIENTATIONS}
                value={orientation}
                onChange={setOrientation}
                disabled={busy}
              />
            </OptionGroup>

            <OptionGroup
              legend="Columns"
              hint="A sheet with many columns is wider than a page."
            >
              <OptionCards
                name="fit"
                options={FITS}
                value={fit}
                onChange={setFit}
                disabled={busy}
              />
            </OptionGroup>

            {busy && <ProgressBar progress={run.progress} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={file ? convert : undefined}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button type="button" onClick={convert} className={button("primary", "lg")}>
                Convert to PDF
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF created successfully"
            stats={[
              { label: "Sheets", value: String(outcome?.sheets ?? "1"), highlight: true },
              { label: "Pages", value: String(outcome?.pages ?? "1") },
              { label: "Rows drawn", value: String(outcome?.rows ?? "0") },
            ]}
            note={
              fit === "fit"
                ? "Columns were squeezed to fit the page width."
                : "Column widths are the sheet's own, so a wide sheet may run off the page."
            }
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Convert Another Workbook"
          />
        )}

        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} onStartOver={startOver} />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A spreadsheet becomes a PDF by drawing each sheet onto A4 pages: the
        cells, the text in them, the bold, the colours and the column widths the
        sheet asked for. Sheet names become headings, and the first rows of each
        sheet are repeated at the top of every page it runs onto.
      </p>
      <p>
        Sheets that were never formatted get their column widths estimated from
        the text in them, so an untidy export still prints legibly rather than
        collapsing every column to the same width.
      </p>
      <p>
        Your workbook is read and the PDF is written entirely in your browser.
        Nothing is uploaded, which for a spreadsheet — where the numbers are
        usually the sensitive part — is worth saying plainly.
      </p>
    </>
  );
}