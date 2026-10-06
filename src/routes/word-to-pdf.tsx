import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { EmptyState, ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { wordToPdf, type WordToPdfResult } from "#/lib/operations-word-to-pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/word-to-pdf");

export const Route = createFileRoute("/word-to-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: WordToPdfPage,
});

const FAQ = [
  {
    question: "Which Word files can I convert?",
    answer:
      "The .docx format — what Word calls a Word Document, and what Save As produces by default today. The much older .doc format is a different kind of file that browsers cannot read; open it in Word and use Save As to make a .docx first.",
  },
  {
    question: "Does it look exactly like my Word document?",
    answer:
      "It is a clean reading of the document rather than a pixel-for-pixel copy. Headings, paragraphs, bold, italic, bullet lists, tables and pictures all carry across. What does not is Word's own page layout: exact fonts, text boxes, columns and manual page breaks are not reproduced, so the PDF may be a page longer or shorter than the original.",
  },
  {
    question: "Which fonts does it use?",
    answer:
      "Four standard ones — regular, bold, italic and bold-italic — so the PDF opens identically everywhere and needs no fonts installed. A document set in Calibri or Garamond will come out in Helvetica instead.",
  },
  {
    question: "Do tables survive?",
    answer:
      "Yes, as aligned rows of text with the header row in bold. Borders and shading are dropped, because carrying those across faithfully needs the full Word layout engine this site deliberately does not run.",
  },
  {
    question: "Are my documents uploaded anywhere?",
    answer:
      "No. The .docx is a zip of XML and it is unpacked and read right here in this tab, on your own machine. Nothing is sent to a server, and the file never leaves the page.",
  },
];

function WordToPdfPage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const [outcome, setOutcome] = useState<WordToPdfResult | null>(null);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFiles((current) => [...current, ...incoming]);
    setOutcome(null);
    if (run.status !== "idle") run.reset();
  }

  function remove(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setOutcome(null);
  }

  function startOver() {
    setFiles([]);
    setOutcome(null);
    run.reset();
  }

  async function convert() {
    await run.run(async (report) => {
      const result = await wordToPdf(files[0].file, report);
      setOutcome(result);
      return [result.result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {run.status !== "done" && (
          <FileUploader
            kind="document"
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            compact={files.length > 0}
            label={files.length > 0 ? "Choose a different document" : "Upload a Word document"}
            hint=".docx · Maximum size: 50 MB"
          />
        )}

        {run.status === "error" && files.length === 0 && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {run.status !== "done" &&
          (files.length === 0 ? (
            <EmptyState
              title="No document selected"
              body="Add a Word .docx file and it becomes a PDF that opens the same way on every device."
            />
          ) : (
            <>
              <FileList files={files} kind="document" disabled={busy} onRemove={remove} />

              {busy && <ProgressBar progress={run.progress} />}

              {run.status === "error" && run.error && (
                <ErrorMessage
                  message={run.error}
                  onRetry={convert}
                  onStartOver={startOver}
                />
              )}

              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={convert} className={button("primary", "lg")}>
                    Convert to PDF
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className={button("secondary", "lg")}
                  >
                    Clear
                  </button>
                </div>
              )}
            </>
          ))}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF created successfully"
            stats={[
              { label: "Pages", value: String(outcome?.pages ?? 1), highlight: true },
              {
                label: "Images kept",
                value: String(outcome?.images ?? 0),
              },
              { label: "File size", value: formatBytes(run.results[0].size) },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Convert Another Document"
          />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Word is good at editing and awkward at sharing. Everyone opens a .docx
        differently, it asks for fonts the reader may not have, and on a phone
        it can be close to unreadable. A PDF is frozen: one layout, the same on
        every device, printable without anyone guessing where it will break.
      </p>
      <p>
        This is the ordinary way to send a letter, a report or a set of notes.
        Drop in the document and you get a PDF back with its headings, lists,
        tables and pictures intact — no Word, no account, nothing to install.
      </p>
      <p>
        Worth being straight about the one limitation: what you get is a clean
        reading of the document, not a photocopy of Word's page. Word's exact
        fonts, text boxes, columns and manual page breaks are not reproduced,
        so the PDF can run to a slightly different number of pages. If you need
        a page-identical copy — a contract that must match the original exactly —
        print to PDF from Word itself, which is what this tool is not.
      </p>
      <p>
        And the document never leaves your machine. A .docx is a zip of XML, so
        it can simply be opened and read here in the browser; there is no
        upload step, because there is nowhere for it to go.
      </p>
    </>
  );
}
