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
import type { AcceptedFile } from "#/lib/files";
import { comparePdfs, compareToResult } from "#/lib/operations-extra";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/compare-pdf");

export const Route = createFileRoute("/compare-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: ComparePage,
});

const FAQ = [
  {
    question: "What exactly gets compared?",
    answer:
      "Every line of text in both files, in order. Lines only in the original are marked with a minus, lines only in the new version with a plus, and lines that match are left unmarked.",
  },
  {
    question: "Will it spot a changed table or a moved paragraph?",
    answer:
      "No. This compares text, not layout or graphics. A table that got reformatted reads as a rewrite even if the numbers did not change, and an image swap is invisible to it.",
  },
  {
    question: "Why does a line-by-line compare matter for two versions of a contract?",
    answer:
      "Because a redlined contract is mostly small wording changes, and a visual side-by-side makes you read both versions to spot them. This hands you the changed lines directly.",
  },
  {
    question: "How long a document can it handle?",
    answer:
      "Around four million line pairs. That covers almost any contract, report or thesis. Longer than that it tells you to compare in smaller sections rather than freezing your browser.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. Both PDFs are read in this browser tab on your own device, and the comparison never leaves your machine.",
  },
];

function ComparePage() {
  const [original, setOriginal] = useState<AcceptedFile | null>(null);
  const [revised, setRevised] = useState<AcceptedFile | null>(null);
  const [stats, setStats] = useState<ResultStat[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pickOriginal(files: AcceptedFile[]) {
    setOriginal(files[0] ?? null);
    setStats([]);
    run.reset();
  }

  function pickRevised(files: AcceptedFile[]) {
    setRevised(files[0] ?? null);
    setStats([]);
    run.reset();
  }

  function startOver() {
    setOriginal(null);
    setRevised(null);
    setStats([]);
    run.reset();
  }

  async function start() {
    if (!original || !revised) return;
    await run.run(async (report) => {
      const outcome = await comparePdfs([original.file, revised.file], report);
      setStats([
        { label: "Added", value: String(outcome.added), highlight: true },
        { label: "Removed", value: String(outcome.removed), highlight: true },
        { label: "Unchanged", value: String(outcome.same) },
      ]);
      return [compareToResult(outcome, original.name)];
    });
  }

  const ready = Boolean(original && revised);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Upload the older version first, then the newer one. Every line that
          changed will be marked.
        </p>

        {!original && (
          <FileUploader
            kind="pdf"
            toolName={`${tool.name} (original)`}
            onFiles={pickOriginal}
            onRejected={run.fail}
            label="Upload the original PDF"
            hint="The version you already have"
          />
        )}

        {original && !revised && (
          <div className="mt-4 space-y-4">
            <FileList
              files={[original]}
              kind="pdf"
              disabled={busy}
              status="Original"
              onRemove={() => setOriginal(null)}
            />
            <FileUploader
              kind="pdf"
              toolName={`${tool.name} (revised)`}
              onFiles={pickRevised}
              onRejected={run.fail}
              label="Upload the revised PDF"
              hint="The newer version to check it against"
            />
          </div>
        )}

        {original && revised && run.status !== "done" && (
          <>
            <div className="mt-4 space-y-3">
              <FileList
                files={[original, revised]}
                kind="pdf"
                disabled={busy}
                status="Both files ready"
                onRemove={startOver}
              />
            </div>

            {busy && <ProgressBar progress={run.progress} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={ready ? start : undefined}
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
                  Compare PDFs
                </button>
                <button
                  type="button"
                  onClick={startOver}
                  className={button("secondary", "lg")}
                >
                  Start Over
                </button>
              </div>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Comparison complete"
            stats={stats}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Compare Another Pair"
            note="This compares the text of both documents. Layout, images and tables are not part of the comparison."
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
        Two versions of a contract, a revised report, a draft that came back
        from a client. Reading both side by side to spot the changes is
        slow and easy to get wrong, because a redline is mostly small wording
        differences buried in pages of identical text.
      </p>
      <p>
        This tool lines the two documents up and marks what moved: a minus for
        a line that only the original had, a plus for one only the new version
        has, and nothing for the lines that match. Download it and you have a
        plain list of every change.
      </p>
      <p>
        It compares text, not layout. A reformatted table or a swapped image
        will not register, and a document with a very different page design
        will look like a rewrite. Knowing a clause changed is what this is for;
        knowing the font moved is not.
      </p>
    </>
  );
}
