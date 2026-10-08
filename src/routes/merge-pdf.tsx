import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { EmptyState, ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { mergePdfs } from "#/lib/operations";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/merge-pdf");

export const Route = createFileRoute("/merge-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: MergePage,
});

const FAQ = [
  {
    question: "Can I merge more than two PDFs?",
    answer:
      "Yes. Add as many files as you need, up to 50 MB each. They are combined top to bottom in the order shown on screen.",
  },
  {
    question: "How do I change the order of the files?",
    answer:
      "Each file in the list has an up and a down arrow. Move them until the order matches the document you want, then merge. The arrows work with a keyboard too.",
  },
  {
    question: "Does merging change the pages themselves?",
    answer:
      "No. Pages are copied across exactly as they are, at their original size and quality. Nothing is re-encoded and nothing is resized.",
  },
  {
    question: "Do I need an account to merge PDFs?",
    answer:
      "No. There is no signup and no email required. Choose your files and merge them.",
  },
  {
    question: "Are my files uploaded to a server?",
    answer:
      "Most regular merge operations happen in this browser tab on your own device, so the files are not uploaded to a server as part of the standard workflow.",
  },
];

function MergePage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFiles((current) => [...current, ...incoming]);
    if (run.status !== "idle") run.reset();
  }

  function remove(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    if (run.status !== "idle") run.reset();
  }

  function move(id: string, direction: -1 | 1) {
    setFiles((current) => {
      const index = current.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index === -1 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function startOver() {
    setFiles([]);
    run.reset();
  }

  async function merge() {
    await run.run(async (report) => [await mergePdfs(files, report)]);
  }

  const totalSize = files.reduce((sum, item) => sum + item.size, 0);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {run.status !== "done" && (
          <FileUploader
            kind="pdf"
            multiple
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            compact={files.length > 0}
            label={files.length > 0 ? "Add more PDFs" : "Upload PDFs"}
          />
        )}

        {/* A rejected file is reported even when nothing has been added yet. */}
        {run.status === "error" && files.length === 0 && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {run.status !== "done" &&
          (files.length === 0 ? (
            <EmptyState
              title="No PDFs selected"
              body="Add two or more PDFs and they will be combined in the order you arrange them."
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                  <span className="font-normal text-ink-500">{formatBytes(totalSize)}</span>
                </p>
                {files.length > 1 && (
                  <p className="text-xs text-ink-500 dark:text-ink-500">
                    Merged top to bottom
                  </p>
                )}
              </div>

              <FileList
                files={files}
                kind="pdf"
                disabled={busy}
                onRemove={remove}
                onMove={move}
              />

              {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

              {run.status === "error" && run.error && (
                <ErrorMessage
                  message={run.error}
                  onRetry={files.length >= 2 ? merge : undefined}
                  onStartOver={startOver}
                />
              )}

              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={merge}
                    disabled={files.length < 2}
                    className={button("primary", "lg")}
                  >
                    Merge PDF
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className={button("secondary", "lg")}
                  >
                    Clear Files
                  </button>
                </div>
              )}

              {files.length === 1 && !busy && (
                <p className="text-sm text-ink-500 dark:text-ink-500">
                  Add one more PDF to enable merging.
                </p>
              )}
            </>
          ))}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDFs merged successfully"
            stats={[
              { label: "Files combined", value: String(files.length) },
              { label: "New file size", value: formatBytes(run.results[0].size) },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Merge More PDFs"
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
        Merging is the fix for the most ordinary paperwork problem there is:
        four separate attachments that should have been one document. Add the
        files, put them in the right order, and you get a single PDF that opens
        the way a reader expects.
      </p>
      <p>
        Pages are copied across untouched. A signed contract, a scanned receipt
        and an exported spreadsheet all keep their own page sizes inside the
        merged file, so nothing is stretched or re-encoded on the way in.
      </p>
      <p>
        If a file has a password on it, remove the password in your PDF reader
        first. A locked document cannot be opened for copying, by this tool or
        any other.
      </p>
    </>
  );
}
