import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun, type Report } from "#/hooks/useToolRun";
import { formatBytes, revokeResults, type AcceptedFile, type ResultFile } from "#/lib/files";
import { addPageNumbers, compressPdf, type CompressionLevel } from "#/lib/operations";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-workflow");

export const Route = createFileRoute("/pdf-workflow")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfWorkflowPage,
});

const LEVELS = [
  { value: "strong" as const, label: "Strong", description: "Smallest file, softer page images" },
  { value: "recommended" as const, label: "Recommended", description: "Balance size and readability" },
  { value: "basic" as const, label: "Basic", description: "Keep more image detail" },
];

const FAQ = [
  {
    question: "Which steps can I combine?",
    answer:
      "Choose compression, page numbering, or both. The selected steps run in that order and produce one final PDF.",
  },
  {
    question: "Can I change the starting page number?",
    answer: "Yes. Choose any whole starting number of 1 or more before you run the workflow.",
  },
  {
    question: "Is my file uploaded?",
    answer:
      "No. The workflow runs in this browser tab on your device. Your PDF is not uploaded or saved for later.",
  },
];

function PdfWorkflowPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [compress, setCompress] = useState(true);
  const [numberPages, setNumberPages] = useState(true);
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [startAt, setStartAt] = useState("1");
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const validStartAt = /^\d+$/.test(startAt) && Number(startAt) >= 1;

  function reset() {
    setFile(null);
    run.reset();
  }

  async function execute() {
    if (!file || (!compress && !numberPages) || (numberPages && !validStartAt)) return;
    await run.run(async (report) => {
      const stepCount = Number(compress) + Number(numberPages);
      let currentFile = file.file;
      let intermediate: ResultFile | null = null;

      const progressFor = (step: number): Report => (percent, label) =>
        report(((step + percent / 100) / stepCount) * 100, label);

      try {
        let step = 0;
        if (compress) {
          intermediate = (
            await compressPdf(currentFile, level, progressFor(step))
          ).result;
          step += 1;
        }

        if (numberPages) {
          if (intermediate) {
            const response = await fetch(intermediate.url);
            if (!response.ok) throw new Error("The previous workflow step could not be read.");
            const blob = await response.blob();
            currentFile = new File([blob], intermediate.filename, { type: "application/pdf" });
            revokeResults([intermediate]);
            intermediate = null;
          }
          const pageCount = await getPageCount(currentFile);
          intermediate = await addPageNumbers(
            currentFile,
            Array.from({ length: pageCount }, (_, index) => index),
            { position: "bottom-center", startAt: Number(startAt) },
            progressFor(step),
          );
        }

        if (!intermediate) throw new Error("The workflow did not produce an output file.");
        report(100, "Workflow complete");
        const result = intermediate;
        intermediate = null;
        return [result];
      } catch (error) {
        if (intermediate) revokeResults([intermediate]);
        throw error;
      }
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={(incoming) => {
              setFile(incoming[0] ?? null);
              run.reset();
            }}
            onRejected={run.fail}
          />
        )}

        {file && run.status !== "done" && (
          <>
            <FileList
              files={[file]}
              kind="pdf"
              disabled={busy}
              status={busy ? "Running workflow" : formatBytes(file.size)}
              onRemove={reset}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">
                <input
                  type="checkbox"
                  checked={compress}
                  disabled={busy}
                  onChange={(event) => setCompress(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900 dark:text-white">Compress PDF</span>
                  <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                    Reduce size before applying the next step.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">
                <input
                  type="checkbox"
                  checked={numberPages}
                  disabled={busy}
                  onChange={(event) => setNumberPages(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900 dark:text-white">Add page numbers</span>
                  <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                    Number every page after compression.
                  </span>
                </span>
              </label>
            </div>

            {compress && (
              <OptionGroup legend="Compression level">
                <OptionCards
                  name="workflow-compression-level"
                  options={LEVELS}
                  value={level}
                  onChange={setLevel}
                  disabled={busy}
                />
              </OptionGroup>
            )}

            {numberPages && (
              <label className="block max-w-xs text-sm font-medium text-ink-700 dark:text-ink-300">
                Starting page number
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={startAt}
                  disabled={busy}
                  onChange={(event) => setStartAt(event.target.value)}
                  className="mt-1.5 block w-full rounded-xl bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
                />
                {!validStartAt && (
                  <span className="mt-1 block text-xs text-red-700 dark:text-red-300">
                    Enter a whole number greater than zero.
                  </span>
                )}
              </label>
            )}

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}
            {run.status === "error" && run.error && (
              <ErrorMessage message={run.error} onRetry={execute} onStartOver={reset} />
            )}
            {!busy && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={execute}
                  disabled={(!compress && !numberPages) || (numberPages && !validStartAt)}
                  className={button("primary", "lg")}
                >
                  Run Workflow
                </button>
                <button type="button" onClick={reset} className={button("secondary", "lg")}>
                  Choose Another PDF
                </button>
              </div>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Workflow complete"
            results={run.results}
            toolName={tool.name}
            onStartOver={reset}
            startOverLabel="Start Another Workflow"
          />
        )}
        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} onStartOver={reset} />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Pick the steps you need and run them together: compress the PDF, add
        page numbers, or do both in one pass. The steps are applied in a clear,
        fixed order and you get one final document to download.
      </p>
      <p>
        This saves switching between separate tool pages and selecting the
        output file again. Processing stays in your browser; the source and
        intermediate files are not saved after the tab is closed.
      </p>
    </>
  );
}
