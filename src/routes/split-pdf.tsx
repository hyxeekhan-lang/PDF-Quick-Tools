import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { PageRangeInput, usePageRange } from "#/components/PageRangeInput";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { FriendlyError, type AcceptedFile } from "#/lib/files";
import { keepPages, splitToSinglePages } from "#/lib/operations";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/split-pdf");

export const Route = createFileRoute("/split-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: SplitPage,
});

type Mode = "range" | "singles";

const MODES = [
  {
    value: "range" as const,
    label: "One new PDF",
    description: "All the pages you pick, in a single file",
  },
  {
    value: "singles" as const,
    label: "Separate files",
    description: "Each page saved as its own PDF, in a zip",
  },
];

const FAQ = [
  {
    question: "How do I choose which pages to keep?",
    answer:
      "Type page numbers and ranges separated by commas, like 1-3, 7, 12-14. The page count of your file is shown under the box, and the selection is checked as you type.",
  },
  {
    question: "Can I split a PDF into single pages?",
    answer:
      "Yes. Choose separate files and every page you selected is saved as its own PDF. When there is more than one, they arrive together in a zip so you only download once.",
  },
  {
    question: "Does the page order stay the same?",
    answer:
      "Pages come out in the order you wrote them. If you type 5, 1, 3 the new PDF has those pages in that order, which is a quick way to reorder a document.",
  },
  {
    question: "Do I need an account to split a PDF?",
    answer: "No account, no email and no subscription. Choose a file and split it.",
  },
  {
    question: "Is my file uploaded?",
    answer:
      "No. Your browser does the work on your own device, so the file is never sent anywhere.",
  },
];

function SplitPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [range, setRange] = useState("");
  const [mode, setMode] = useState<Mode>("range");
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const { pages, problem } = usePageRange(range, pageCount);

  const startOver = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRange("");
    run.reset();
  }, [run]);

  async function pick(files: AcceptedFile[]) {
    const chosen = files[0];
    setFile(chosen);
    run.reset();
    setReading(true);
    try {
      const count = await getPageCount(chosen.file);
      setPageCount(count);
      setRange(count > 1 ? `1-${Math.min(count, 3)}` : "1");
    } catch (error) {
      setFile(null);
      run.fail(
        error instanceof FriendlyError
          ? error.message
          : "That PDF could not be opened. It may be damaged or password protected.",
      );
    } finally {
      setReading(false);
    }
  }

  async function split() {
    if (!file) return;
    await run.run(async (report) =>
      mode === "singles"
        ? splitToSinglePages(file.file, pages, report)
        : [await keepPages(file.file, pages, report, "split")],
    );
  }

  const canSplit = Boolean(file) && pages.length > 0 && problem === null && !reading;

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={pick}
            onRejected={run.fail}
          />
        )}

        {file && run.status !== "done" && (
          <>
            <FileList
              files={[file]}
              kind="pdf"
              disabled={busy}
              status={
                reading
                  ? "Reading pages"
                  : pageCount > 0
                    ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
                    : undefined
              }
              onRemove={startOver}
            />

            {pageCount > 0 && (
              <>
                <PageRangeInput
                  value={range}
                  onChange={setRange}
                  pageCount={pageCount}
                  pages={pages}
                  problem={problem}
                  disabled={busy}
                  label="Pages to take out"
                />

                <OptionGroup legend="How should they be saved?">
                  <OptionCards
                    name="mode"
                    options={MODES}
                    value={mode}
                    onChange={setMode}
                    disabled={busy}
                    columns={2}
                  />
                </OptionGroup>
              </>
            )}

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={canSplit ? split : undefined}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button
                type="button"
                onClick={split}
                disabled={!canSplit}
                className={button("primary", "lg")}
              >
                Split PDF
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF split successfully"
            stats={[
              { label: "Pages taken", value: String(pages.length), highlight: true },
              { label: "Original document", value: `${pageCount} pages` },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Split Another PDF"
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
        Splitting is how you send one chapter instead of the whole book. Pull
        out the three pages somebody actually asked for, and the file you email
        is smaller, faster to open and does not expose anything else in the
        document.
      </p>
      <p>
        Ranges are written the way you would say them out loud: 1-3 means the
        first three pages, 7 means just page seven, and 1-3, 7 means both. The
        selection is checked as you type, so an impossible page number is caught
        before anything runs.
      </p>
      <p>
        Everything happens on your device. Pages are copied at their original
        quality, so a split page looks exactly like it did in the file you
        started with.
      </p>
    </>
  );
}
