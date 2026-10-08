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
import { insertBlankPages, type BlankPosition } from "#/lib/operations-pages";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/insert-blank-page");

export const Route = createFileRoute("/insert-blank-page")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: InsertBlankPage,
});

const POSITIONS = [
  { value: "end" as const, label: "At the end", description: "A notes page or a spare back sheet" },
  { value: "start" as const, label: "At the start", description: "A cover page" },
  { value: "after-each" as const, label: "After each page", description: "Paper on the back of every sheet" },
];

const FAQ = [
  {
    question: "Why would I want a blank page in the middle?",
    answer:
      "Most often for double-sided printing. When a document has an odd number of pages, the printer puts the last one on its own side of a sheet, so it looks better if there is a blank page to balance it.",
  },
  {
    question: "Will the blank pages be truly empty?",
    answer:
      "Yes. They contain no text and no images, only the page itself. They are exactly the same size as the pages around them.",
  },
  {
    question: "Can I write on the blank pages?",
    answer:
      "Yes, when you open the result in any PDF reader or print it. This tool adds the pages; what you do with them afterwards is up to you.",
  },
  {
    question: "How many pages can I add?",
    answer:
      "As many as you like. Adding a blank page after every page doubles the length, which is exactly the point when you need paper on both sides.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The blank pages are added in this browser tab on your own device as part of the standard workflow.",
  },
];

function InsertBlankPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [position, setPosition] = useState<BlankPosition>("end");
  const [range, setRange] = useState("");
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
      setRange(`1-${count}`);
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

  // Only the "after each page" option needs a selection; the other two work on
  // the whole document.
  const needsSelection = position === "after-each";
  const canInsert =
    Boolean(file) &&
    pageCount > 0 &&
    !reading &&
    (!needsSelection || (pages.length > 0 && problem === null));

  async function insert() {
    if (!file) return;
    await run.run(async (report) => [
      await insertBlankPages(file.file, pages, position, report),
    ]);
  }

  const added = position === "after-each" ? pages.length : pageCount;

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
                <OptionGroup legend="Where should they go?">
                  <OptionCards
                    name="blank-position"
                    options={POSITIONS}
                    value={position}
                    onChange={setPosition}
                    disabled={busy}
                  />
                </OptionGroup>

                {needsSelection && (
                  <PageRangeInput
                    value={range}
                    onChange={setRange}
                    pageCount={pageCount}
                    pages={pages}
                    problem={problem}
                    disabled={busy}
                    label="Pages to add a blank sheet after"
                  />
                )}
              </>
            )}

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={canInsert ? insert : undefined}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button
                type="button"
                onClick={insert}
                disabled={!canInsert}
                className={button("primary", "lg")}
              >
                Insert Blank Pages
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Blank pages added successfully"
            stats={[
              { label: "Blank pages added", value: String(added), highlight: true },
              { label: "New page count", value: String(pageCount + added) },
              { label: "Original document", value: `${pageCount} pages` },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Insert Into Another PDF"
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
        A PDF has no concept of a cover sheet or a spare page for handwriting,
        so those get added by hand and are fiddly to place at the right index.
        This does it properly.
      </p>
      <p>
        The double-sided case is the one people hit most. A 19-page document
        printed double-sided leaves the final page on its own side of a sheet;
        adding one blank page at the end makes it two sides of paper instead.
      </p>
      <p>
        Blank pages match the size of the pages they sit next to, so a mixed-size
        document keeps looking right rather than turning into a folder of
        mismatched sheets.
      </p>
    </>
  );
}