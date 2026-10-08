import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { removeMetadata } from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/remove-pdf-metadata");

export const Route = createFileRoute("/remove-pdf-metadata")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: RemoveMetadataPage,
});

const FAQ = [
  {
    question: "What exactly gets removed?",
    answer:
      "The title, author, subject, keywords, the software that created the file, the creation and modification dates, and the XML packet that mirrors all of the same details. It does not touch the text or images on the page.",
  },
  {
    question: "Does this remove hidden text and tracked changes?",
    answer:
      "No. Tracked changes and hidden layers are separate from the document details, and this tool does not touch them. Check the pages yourself before sending anything you would not want read.",
  },
  {
    question: "Does it remove the actual visible content?",
    answer:
      "Never. Only the hidden details about the file are cleared. The pages look exactly the same in the downloaded copy.",
  },
  {
    question: "Will the cleaned file still open properly?",
    answer:
      "Yes. The document information dictionary is optional in a PDF, so a file without one is normal and every reader handles it.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The details are read and cleared in this browser tab on your own device as part of the standard workflow.",
  },
];

function RemoveMetadataPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  const startOver = useCallback(() => {
    setFile(null);
    setRemoved([]);
    run.reset();
  }, [run]);

  function add(files: AcceptedFile[]) {
    setFile(files[0]);
    setRemoved([]);
    run.reset();
  }

  async function clean() {
    if (!file) return;
    await run.run(async (report) => {
      const outcome = await removeMetadata(file.file, report);
      setRemoved(outcome.removed);
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
                label="Upload a PDF to clean"
                hint="PDF · Nothing is uploaded anywhere"
              />
              {run.status === "error" && run.error && (
                <ErrorMessage message={run.error} />
              )}
            </>
          ) : (
            <>
              <FileList files={[file]} kind="pdf" disabled={busy} onRemove={startOver} />

              <p className="text-sm text-ink-600 dark:text-ink-400">
                This clears the author, title, subject, keywords, creator,
                producer and the dates your file records. The pages themselves are
                untouched.
              </p>

              {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

              {run.status === "error" && run.error && (
                <ErrorMessage
                  message={run.error}
                  onRetry={clean}
                  onStartOver={startOver}
                />
              )}

              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={clean} className={button("primary", "lg")}>
                    Remove Metadata
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
            title="PDF metadata removed successfully"
            stats={[
              {
                label: "Fields cleared",
                value: String(removed.length),
                highlight: true,
              },
              { label: "File size", value: formatBytes(run.results[0].size) },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Clean Another PDF"
          />
        )}

        {run.status === "done" && removed.length > 0 && (
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Cleared: {removed.join(", ")}.
          </p>
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Every PDF quietly records who made it, with what software, and when. That
        information sits in the file rather than on the page, so it survives
        every rename and every forward — and it is what identifies the author of
        an anonymous document.
      </p>
      <p>
        It is worth clearing before sending a document outside your own company,
        and it is the difference between a file that says nothing about where it
        came from and one that names your machine, your software and the exact
        minute you exported it.
      </p>
      <p>
        Only the hidden details are removed. Nothing on the page changes, so a
        cleaned document still looks and reads exactly the same.
      </p>
    </>
  );
}