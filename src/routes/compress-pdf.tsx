import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { CompressionComparison } from "#/components/CompressionComparison";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import {
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultStat,
} from "#/components/ToolFeedback";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { MAX_BATCH_BYTES, MAX_BATCH_FILES, validateBatch } from "#/lib/batch";
import { compressPdf, type CompressionLevel } from "#/lib/operations";
import { readCompressionLevel, writeCompressionLevel } from "#/lib/storage";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/compress-pdf");

export const Route = createFileRoute("/compress-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: CompressPage,
});

const LEVELS = [
  {
    value: "strong" as const,
    label: "Strong Compression",
    description: "Smallest file size",
  },
  {
    value: "recommended" as const,
    label: "Recommended",
    description: "Good balance between size and quality",
  },
  {
    value: "basic" as const,
    label: "Basic Compression",
    description: "Higher quality",
  },
];

const FAQ = [
  {
    question: "How much smaller will my PDF get?",
    answer:
      "It depends entirely on what is inside. Scans and photo-heavy documents often drop by 60 to 90 percent. A PDF that is mostly text is already small, so the saving is usually modest. The result screen shows the real before and after sizes every time.",
  },
  {
    question: "Will compressing lower the quality?",
    answer:
      "Strong compression redraws each page as an image at a lower resolution, so fine text can soften and stops being selectable. Recommended keeps a comfortable balance for reading and printing. If neither version comes out smaller than what you started with, we hand back your original file untouched.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Yes, 50 MB per file. The work happens in your browser, so very large documents depend on how much memory your device has available.",
  },
  {
    question: "Can I compress several PDFs together?",
    answer:
      "Yes. Select up to five PDFs with a combined size up to 100 MB. They are compressed one at a time in your browser, and each result is downloaded separately.",
  },
  {
    question: "Do I need an account to compress a PDF?",
    answer:
      "No. There is no signup, no email and no subscription. Open the page, choose a file and compress it.",
  },
  {
    question: "Is my file uploaded anywhere?",
    answer:
      "No. Compression runs inside this browser tab using your own device. The file is never sent to a server, so nothing is stored and nothing is transmitted.",
  },
];

function CompressPage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const [level, setLevel] = useState<CompressionLevel>(readCompressionLevel);
  const [stats, setStats] = useState<ResultStat[]>([]);
  const [note, setNote] = useState<string>();
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pick(incoming: AcceptedFile[]) {
    const issue = validateBatch(incoming);
    if (issue) {
      run.fail(issue);
      return;
    }
    setFiles(incoming);
    setStats([]);
    setNote(undefined);
    run.reset();
  }

  function startOver() {
    setFiles([]);
    setStats([]);
    setNote(undefined);
    run.reset();
  }

  async function compress() {
    if (files.length === 0) return;
    await run.run(async (report) => {
      const outcomes = [];
      for (const [index, item] of files.entries()) {
        const outcome = await compressPdf(item.file, level, (percent, label) =>
          report(
            ((index + percent / 100) / files.length) * 100,
            `${item.name}: ${label ?? "Compressing"}`,
          ),
        );
        outcomes.push(outcome);
      }
      const originalSize = outcomes.reduce((sum, item) => sum + item.originalSize, 0);
      const compressedSize = outcomes.reduce((sum, item) => sum + item.result.size, 0);
      const percent = originalSize > 0
        ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
        : 0;

      setStats([
        { label: "PDFs compressed", value: String(outcomes.length), highlight: true },
        { label: "Original total", value: formatBytes(originalSize) },
        { label: "New total", value: formatBytes(compressedSize) },
        {
          label: "Saved",
          value: percent > 0 ? `${percent}%` : "0%",
          highlight: percent > 0,
        },
      ]);
      const unchanged = outcomes.filter((outcome) => outcome.method === "unchanged").length;
      const rasterized = outcomes.filter((outcome) => outcome.method === "rasterized").length;
      setNote(
        `${unchanged} file${unchanged === 1 ? "" : "s"} already optimised; ${rasterized} file${rasterized === 1 ? "" : "s"} rasterized (text may no longer be selectable).`,
      );
      return outcomes.map((outcome) => outcome.result);
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {files.length === 0 && (
          <FileUploader
            kind="pdf"
            multiple
            toolName={tool.name}
            onFiles={pick}
            onRejected={run.fail}
            label={`Choose up to ${MAX_BATCH_FILES} PDFs to compress together`}
            hint={`Up to ${MAX_BATCH_FILES} files and ${formatBytes(MAX_BATCH_BYTES)} combined. Each PDF may be up to 50 MB.`}
          />
        )}

        {files.length > 0 && run.status !== "done" && (
          <>
            <FileList
              files={files}
              kind="pdf"
              disabled={busy}
              status={busy ? "Processing in order" : "Ready"}
              onRemove={(id) => {
                setFiles((current) => current.filter((item) => item.id !== id));
                run.reset();
              }}
            />
            <p className="text-xs text-ink-500 dark:text-ink-400">
              Batch limit: {MAX_BATCH_FILES} PDFs, {formatBytes(MAX_BATCH_BYTES)} total. Files are processed one at a time on this device.
            </p>

            <OptionGroup
              legend="Compression level"
              hint="Pick how hard to squeeze. You can try another level afterwards."
            >
              <OptionCards
                name="level"
                options={LEVELS}
                value={level}
                onChange={(value) => {
                  setLevel(value);
                  writeCompressionLevel(value);
                }}
                disabled={busy}
              />
            </OptionGroup>

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={compress}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button type="button" onClick={compress} className={button("primary", "lg")}>
                {files.length > 1 ? `Compress ${files.length} PDFs` : "Compress PDF"}
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <>
            <SuccessPanel
              title={files.length > 1 ? "PDFs compressed successfully" : "PDF compressed successfully"}
              stats={stats}
              note={note}
              results={run.results}
              toolName={tool.name}
              onStartOver={startOver}
              startOverLabel="Compress More PDFs"
            />
            <CompressionComparison files={files} results={run.results} />
          </>
        )}

        {run.status === "error" && run.error && (
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
        A PDF gets heavy for one reason more often than any other: the images
        inside it were saved at a far higher resolution than anyone will ever
        look at. Compressing rewrites those pages at a sensible size, which is
        why a 40 MB scan can come back under 4 MB and still read perfectly on
        screen.
      </p>
      <p>
        Choose <strong>Strong</strong> when the file has to fit an upload limit
        and nobody is going to print it. <strong>Recommended</strong> is the one
        to reach for by default. <strong>Basic</strong> keeps more detail for
        documents you will print or archive.
      </p>
      <p>
        Nothing is uploaded. Your browser opens the file, redraws it, and hands
        the smaller version straight back to you, so the document never travels
        across the internet at all.
      </p>
    </>
  );
}
