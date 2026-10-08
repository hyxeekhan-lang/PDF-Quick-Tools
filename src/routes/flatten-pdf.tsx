import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { flattenPdf } from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/flatten-pdf");

export const Route = createFileRoute("/flatten-pdf")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: FlattenPage,
});

const FAQ = [
  {
    question: "What does flattening actually change?",
    answer:
      "Form fields, their typed-in values, and any comments or annotations get drawn into the page itself. After that they are part of the picture of the page and cannot be typed into or commented on again.",
  },
  {
    question: "Why would I want that?",
    answer:
      "So a filled-in form looks identical in every reader and can no longer be accidentally edited. It is the usual last step before sending a signed form or a tax document to someone else.",
  },
  {
    question: "Can I undo it afterwards?",
    answer:
      "No. The fields are gone from the file. Keep the original if you may need to change something later.",
  },
  {
    question: "Does flattening a PDF with no forms do anything?",
    answer:
      "Any comments and highlights are still cleared, so it is not a wasted step. If the document has neither, the result is effectively a copy.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. Flattening happens in this browser tab on your own device as part of the standard workflow.",
  },
];

function FlattenPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [formsFlattened, setFormsFlattened] = useState(0);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  const startOver = useCallback(() => {
    setFile(null);
    setFormsFlattened(0);
    run.reset();
  }, [run]);

  function add(files: AcceptedFile[]) {
    setFile(files[0]);
    setFormsFlattened(0);
    run.reset();
  }

  async function flatten() {
    if (!file) return;
    await run.run(async (report) => {
      const outcome = await flattenPdf(file.file, report);
      setFormsFlattened(outcome.formsFlattened);
      return [outcome.result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {run.status !== "done" &&
          (!file ? (
            <>
              <FileUploader
                kind="pdf"
                toolName={tool.name}
                onFiles={add}
                onRejected={run.fail}
                label="Upload a PDF to flatten"
                hint="PDF · The file stays on your device"
              />
              {run.status === "error" && run.error && (
                <ErrorMessage message={run.error} />
              )}
            </>
          ) : (
            <>
              <FileList files={[file]} kind="pdf" disabled={busy} onRemove={startOver} />

              <p className="text-sm text-ink-600 dark:text-ink-400">
                Form fields, their values, comments and highlights will be drawn
                into the pages. This cannot be undone in the downloaded file.
              </p>

              {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

              {run.status === "error" && run.error && (
                <ErrorMessage
                  message={run.error}
                  onRetry={flatten}
                  onStartOver={startOver}
                />
              )}

              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={flatten}
                    className={button("primary", "lg")}
                  >
                    Flatten PDF
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
            </>
          ))}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF flattened successfully"
            stats={[
              {
                label: "Form fields flattened",
                value: String(formsFlattened),
                highlight: true,
              },
              { label: "File size", value: formatBytes(run.results[0].size) },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Flatten Another PDF"
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
        A filled-in form is normally a live document: the boxes are still there,
        and anyone who opens it can change what you typed. That is convenient
        while you are working and a problem the moment you send it.
      </p>
      <p>
        Flattening takes the fields out of the equation. The values and any
        comments are drawn directly onto the page, the box outlines disappear,
        and the file looks the same in every reader regardless of which one
        somebody happens to have installed.
      </p>
      <p>
        Because it removes the fields entirely, this is not reversible in the
        file you download. Keep the original if there is any chance you need to
        correct something.
      </p>
    </>
  );
}