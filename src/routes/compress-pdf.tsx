import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
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
import { compressPdf, type CompressionLevel } from "#/lib/operations";
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
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [stats, setStats] = useState<ResultStat[]>([]);
  const [note, setNote] = useState<string>();
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pick(files: AcceptedFile[]) {
    setFile(files[0]);
    run.reset();
  }

  function startOver() {
    setFile(null);
    setStats([]);
    setNote(undefined);
    run.reset();
  }

  async function compress() {
    if (!file) return;
    await run.run(async (report) => {
      const outcome = await compressPdf(file.file, level, report);
      const saved = outcome.originalSize - outcome.result.size;
      const percent =
        outcome.originalSize > 0
          ? Math.round((saved / outcome.originalSize) * 100)
          : 0;

      setStats([
        { label: "Original size", value: formatBytes(outcome.originalSize) },
        { label: "New size", value: formatBytes(outcome.result.size) },
        {
          label: "Saved",
          value: percent > 0 ? `${percent}%` : "0%",
          highlight: percent > 0,
        },
      ]);
      setNote(
        outcome.method === "unchanged"
          ? "This PDF was already well optimised, so we kept your original file rather than making it bigger."
          : outcome.method === "restructured"
            ? "Rewriting the file structure beat redrawing the pages here, so your text stays sharp and selectable."
            : "Pages were redrawn as optimised images, so text in this copy is no longer selectable.",
      );
      return [outcome.result];
    });
  }

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
              status={busy ? "Processing" : "Ready"}
              onRemove={startOver}
            />

            <OptionGroup
              legend="Compression level"
              hint="Pick how hard to squeeze. You can try another level afterwards."
            >
              <OptionCards
                name="level"
                options={LEVELS}
                value={level}
                onChange={setLevel}
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
                Compress PDF
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF compressed successfully"
            stats={stats}
            note={note}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Compress Another PDF"
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
