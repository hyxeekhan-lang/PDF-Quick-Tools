import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { PageRangeInput, usePageRange } from "#/components/PageRangeInput";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { FriendlyError, type AcceptedFile } from "#/lib/files";
import { extractText, textToResult } from "#/lib/operations-pages";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/extract-pdf-text");

export const Route = createFileRoute("/extract-pdf-text")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: ExtractTextPage,
});

const FAQ = [
  {
    question: "Why did some pages come back empty?",
    answer:
      "A page with no text on it is either a scan, a photograph, or a page that is mostly artwork. Those pages have no text layer to read. Turning a picture into readable words is called OCR, and this tool does not do it.",
  },
  {
    question: "Can it read a scanned document?",
    answer:
      "No. Only the text stored in the PDF is read out. If your document is a scan, you need OCR first — run it in a scanner app on your phone or in your PDF reader, then upload the result here.",
  },
  {
    question: "Will the layout be preserved?",
    answer:
      "Mostly, but not perfectly. Tables, columns and floating images are hard to turn back into plain text. You get one reading order with line breaks where the lines were, which is enough for notes, search and pasting.",
  },
  {
    question: "What can I do with the text?",
    answer:
      "Download it as a .txt file, or select it straight from the box above and copy it. It is plain text, so it pastes cleanly into Word, Google Docs, a search box or an email.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The text is read in this browser tab on your own device as part of the standard workflow.",
  },
];

function ExtractTextPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [range, setRange] = useState("");
  const [text, setText] = useState("");
  const [emptyPages, setEmptyPages] = useState<number[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const { pages, problem } = usePageRange(range, pageCount);

  const startOver = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRange("");
    setText("");
    setEmptyPages([]);
    run.reset();
  }, [run]);

  // The result is an object URL. Release it when it is replaced or cleared so a
  // long session does not hold on to the text in memory.
  useEffect(() => {
    return () => {
      for (const result of run.results) URL.revokeObjectURL(result.url);
    };
  }, [run.results]);

  async function pick(files: AcceptedFile[]) {
    const chosen = files[0];
    setFile(chosen);
    setText("");
    setEmptyPages([]);
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

  async function extract() {
    if (!file) return;
    setText("");
    setEmptyPages([]);
    await run.run(async (report) => {
      const outcome = await extractText(file.file, pages, report);
      setText(outcome.text);
      setEmptyPages(outcome.emptyPages);
      return [textToResult(outcome.text, file.name)];
    });
  }

  const canExtract =
    Boolean(file) && pages.length > 0 && problem === null && !reading;

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={pick}
            onRejected={run.fail}
            label="Upload a PDF to read"
            hint="PDF · Text stays on your device"
          />
        )}

        {file && (
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
        )}

        {pageCount > 0 && run.status !== "done" && (
          <PageRangeInput
            value={range}
            onChange={setRange}
            pageCount={pageCount}
            pages={pages}
            problem={problem}
            disabled={busy}
            label="Pages to read"
          />
        )}

        {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

        {run.status === "error" && run.error && (
          <ErrorMessage
            message={run.error}
            onRetry={canExtract ? extract : undefined}
            onStartOver={file ? startOver : undefined}
          />
        )}

        {file && run.status !== "done" && !busy && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={extract}
              disabled={!canExtract}
              className={button("primary", "lg")}
            >
              Extract Text
            </button>
            <button
              type="button"
              onClick={startOver}
              className={button("secondary", "lg")}
            >
              Choose Another PDF
            </button>
          </div>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <>
            {text.length > 0 && (
              <div>
                <label
                  className="block text-sm font-semibold text-ink-900 dark:text-white"
                  htmlFor="extracted-text"
                >
                  Extracted text
                </label>
                <textarea
                  id="extracted-text"
                  readOnly
                  value={text}
                  rows={12}
                  className="mt-2 block w-full resize-y rounded-xl bg-white px-3.5 py-3 font-mono text-sm text-ink-900 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
                />
                <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                  Select the text above to copy it, or download it as a .txt file.
                </p>
              </div>
            )}

            {emptyPages.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No text was found on page{emptyPages.length === 1 ? "" : "s"}{" "}
                {emptyPages.join(", ")}. Those look like scans or images, which
                need OCR to be read.
              </p>
            )}

            <SuccessPanel
              title="Text extracted successfully"
              stats={[
                {
                  label: "Pages read",
                  value: String(pages.length - emptyPages.length),
                  highlight: true,
                },
                {
                  label: "Characters",
                  value: text.length.toLocaleString(),
                },
              ]}
              results={run.results}
              toolName={tool.name}
              onStartOver={startOver}
              startOverLabel="Read Another PDF"
            />
          </>
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Every PDF that was typed rather than scanned has its words stored in the
        file, which means they can be read back out without copying and pasting
        page by page. That is what this does.
      </p>
      <p>
        It is the fastest way to get an article into a notes app, pull a
        reference out of a report, or turn a long document into something you
        can search.
      </p>
      <p>
        Scanned documents are the exception. A scan is a picture of words rather
        than words, so there is nothing to read out. Recognising them is called
        OCR and needs a different kind of tool — this one will tell you plainly
        which pages came back empty rather than returning a blank result.
      </p>
    </>
  );
}