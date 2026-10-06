import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import {
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultStat,
} from "#/components/ToolFeedback";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { repairPdf } from "#/lib/operations-extra";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/repair-pdf");

export const Route = createFileRoute("/repair-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: RepairPage,
});

const FAQ = [
  {
    question: "What kinds of broken PDF can this fix?",
    answer:
      "Files whose structure is damaged but whose content is intact — broken cross-reference tables, a missing trailer, a bad start offset. These are the errors that stop a PDF opening at all.",
  },
  {
    question: "Can it recover a download that was cut short?",
    answer:
      "No. A truncated file is missing data, not damaged structure, and no rebuild can bring back bytes that were never written. If your download was interrupted, fetch it again from the source.",
  },
  {
    question: "Will repairing reduce quality or change the pages?",
    answer:
      "No. The pages are copied through untouched. Only the file's internal structure is rebuilt, so text stays selectable and images stay sharp.",
  },
  {
    question: "Does it work on encrypted PDFs?",
    answer:
      "No. An encrypted file has to be decrypted before it can be rebuilt, and this tool has no password prompt.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The file is opened and rewritten in this browser tab on your own device.",
  },
];

function RepairPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [stats, setStats] = useState<ResultStat[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pick(files: AcceptedFile[]) {
    setFile(files[0] ?? null);
    setStats([]);
    run.reset();
  }

  function startOver() {
    setFile(null);
    setStats([]);
    run.reset();
  }

  async function start() {
    if (!file) return;
    await run.run(async (report) => {
      const outcome = await repairPdf(file.file, report);
      setStats([
        { label: "Pages kept", value: String(outcome.pageCount) },
        { label: "Original size", value: formatBytes(file.size) },
        { label: "Repaired size", value: formatBytes(outcome.result.size) },
      ]);
      return [outcome.result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Upload a PDF that will not open or that shows an error. This tool
          rebuilds the file structure and hands back a working copy.
        </p>

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
              status={busy ? "Rebuilding" : "Ready to repair"}
              onRemove={startOver}
            />

            {busy && <ProgressBar progress={run.progress} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={start}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={start}
                  className={button("primary", "lg")}
                >
                  Repair PDF
                </button>
                <button
                  type="button"
                  onClick={startOver}
                  className={button("secondary", "lg")}
                >
                  Choose Another File
                </button>
              </div>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Your PDF has been repaired"
            stats={stats}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Repair Another PDF"
            note="The pages were copied through untouched, so text and images are exactly as they were."
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
        A PDF that will not open is usually damaged rather than lost. Broken
        cross-reference tables, a missing trailer, a header that starts at the
        wrong byte — all of these stop a reader from loading a file whose actual
        content is perfectly fine.
      </p>
      <p>
        This tool opens the file as far as it can and writes a new one out with
        a clean structure. Your pages are copied through untouched, so text
        stays selectable and images stay sharp.
      </p>
      <p>
        It cannot recover a download that was cut short. That file is missing
        data rather than having damaged data, and no rebuild can bring back
        bytes that were never written — fetch it again from the source instead.
      </p>
    </>
  );
}
