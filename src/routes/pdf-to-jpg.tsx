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
import { FriendlyError, formatBytes, revokeResults, type AcceptedFile } from "#/lib/files";
import { MAX_BATCH_BYTES, MAX_BATCH_FILES, validateBatch } from "#/lib/batch";
import { pdfToJpg, type ImageQuality } from "#/lib/operations";
import { getPageCount } from "#/lib/pdf";
import { readImageQuality, writeImageQuality } from "#/lib/storage";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-jpg");
const MAX_BATCH_PAGES = 200;

export const Route = createFileRoute("/pdf-to-jpg")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfToJpgPage,
});

const QUALITIES = [
  { value: "high" as const, label: "High quality", description: "Best detail, largest images" },
  { value: "medium" as const, label: "Balanced", description: "Good for screens and sharing" },
  { value: "small" as const, label: "Small files", description: "Quickest to send" },
];

const FAQ = [
  {
    question: "What image quality should I choose?",
    answer:
      "Balanced suits almost everything you will look at on a screen. Pick high quality when you need to read small print or crop into the image later, and small files when you are sending a page over a chat app.",
  },
  {
    question: "Can I convert only some pages?",
    answer:
      "Yes. Type the pages you want, like 1-4, 9. Leave the whole range in place to convert the entire document.",
  },
  {
    question: "How do I download several images at once?",
    answer:
      "When you convert more than one page, the images come back together in a single zip file so it is one download rather than twenty.",
  },
  {
    question: "Can I convert multiple PDFs in one go?",
    answer:
      "Yes. Choose up to five PDFs with a combined size of 100 MB and up to 200 pages total. Each document is converted into its own ZIP of page images, one file at a time.",
  },
  {
    question: "Is the text still selectable in a JPG?",
    answer:
      "No. A JPG is a picture of the page, so text inside it cannot be selected or searched. That is normal for any PDF to image conversion.",
  },
  {
    question: "Are my pages uploaded to convert them?",
    answer:
      "No. Your browser renders the pages on your own device, so nothing about the document is sent to a server.",
  },
];

function PdfToJpgPage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [range, setRange] = useState("");
  const [quality, setQuality] = useState<ImageQuality>(readImageQuality);
  const [batchPages, setBatchPages] = useState(0);
  const file = files[0] ?? null;
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const { pages, problem } = usePageRange(range, pageCount);

  const startOver = useCallback(() => {
    setFiles([]);
    setPageCount(0);
    setRange("");
    setBatchPages(0);
    run.reset();
  }, [run]);

  async function pick(incoming: AcceptedFile[]) {
    const issue = validateBatch(incoming);
    if (issue) {
      run.fail(issue);
      return;
    }
    setFiles(incoming);
    run.reset();
    setPageCount(0);
    setRange("");
    if (incoming.length > 1) {
      setReading(false);
      return;
    }
    const chosen = incoming[0];
    if (!chosen) return;
    setReading(true);
    try {
      const count = await getPageCount(chosen.file);
      setPageCount(count);
      setRange(count > 1 ? `1-${count}` : "1");
    } catch (error) {
      setFiles([]);
      run.fail(
        error instanceof FriendlyError
          ? error.message
          : "That PDF could not be opened. It may be damaged or password protected.",
      );
    } finally {
      setReading(false);
    }
  }

  async function convert() {
    if (!file) return;
    await run.run(async (report) => {
      if (files.length === 1) {
        return pdfToJpg(file.file, pages, quality, pages.length > 1, report);
      }

      const outputs = [];
      let convertedPages = 0;
      try {
        const pageCounts: number[] = [];
        for (const [index, item] of files.entries()) {
          const count = await getPageCount(item.file);
          convertedPages += count;
          if (convertedPages > MAX_BATCH_PAGES) {
            throw new FriendlyError(
              `This batch has more than ${MAX_BATCH_PAGES} pages. Choose fewer pages or convert one PDF at a time.`,
            );
          }
          pageCounts.push(count);
          report(((index + 1) / files.length) * 5, `Checking ${item.name}`);
        }
        convertedPages = 0;
        for (const [index, item] of files.entries()) {
          const count = pageCounts[index]!;
          const result = await pdfToJpg(
            item.file,
            Array.from({ length: count }, (_, page) => page),
            quality,
            true,
            (percent, label) =>
              report(
                ((index + percent / 100) / files.length) * 100,
                `${item.name}: ${label ?? "Converting"}`,
              ),
          );
          outputs.push(...result);
          convertedPages += count;
        }
      } catch (error) {
        revokeResults(outputs);
        throw error;
      }
      setBatchPages(convertedPages);
      return outputs;
    });
  }

  const canConvert =
    Boolean(file) &&
    !reading &&
    (files.length > 1 || (pages.length > 0 && problem === null));

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
            label={`Choose up to ${MAX_BATCH_FILES} PDFs to convert together`}
            hint={`Up to ${MAX_BATCH_FILES} files and ${formatBytes(MAX_BATCH_BYTES)} combined. Each PDF may be up to 50 MB.`}
          />
        )}

        {files.length > 0 && run.status !== "done" && (
          <>
            <FileList
              files={files}
              kind="pdf"
              disabled={busy}
              status={
                files.length > 1
                  ? "Ready for batch conversion"
                  : reading
                  ? "Reading pages"
                  : pageCount > 0
                    ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
                    : undefined
              }
              onRemove={(id) => {
                const remaining = files.filter((item) => item.id !== id);
                if (remaining.length === 0) startOver();
                else void pick(remaining);
              }}
            />
            {files.length > 1 && (
              <p className="text-xs text-ink-500 dark:text-ink-400">
                All pages will be converted; each PDF downloads as its own ZIP. Batch limit: {MAX_BATCH_FILES} files, {formatBytes(MAX_BATCH_BYTES)} combined, {MAX_BATCH_PAGES} pages total.
              </p>
            )}

            {files.length === 1 && pageCount > 0 && (
              <>
                <PageRangeInput
                  value={range}
                  onChange={setRange}
                  pageCount={pageCount}
                  pages={pages}
                  problem={problem}
                  disabled={busy}
                  label="Pages to convert"
                />

                <OptionGroup
                  legend="Image quality"
                  hint="Higher quality means larger JPG files."
                >
                  <OptionCards
                    name="quality"
                    options={QUALITIES}
                    value={quality}
                    onChange={(value) => {
                      setQuality(value);
                      writeImageQuality(value);
                    }}
                    disabled={busy}
                  />
                </OptionGroup>
              </>
            )}

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={canConvert ? convert : undefined}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button
                type="button"
                onClick={convert}
                disabled={!canConvert}
                className={button("primary", "lg")}
              >
                {files.length > 1 ? `Convert ${files.length} PDFs to JPG` : "Convert to JPG"}
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Pages converted successfully"
            stats={files.length > 1
              ? [
                  { label: "PDFs converted", value: String(files.length), highlight: true },
                  { label: "Pages converted", value: String(batchPages) },
                  { label: "Quality", value: QUALITIES.find((q) => q.value === quality)!.label },
                ]
              : [
                  { label: "Pages converted", value: String(pages.length), highlight: true },
                  { label: "Quality", value: QUALITIES.find((q) => q.value === quality)!.label },
                ]}
            note={
              files.length > 1
                ? "Each PDF has its own ZIP of page images, named by page number."
                : pages.length > 1
                  ? "All of the images are inside the zip, named by page number."
                : undefined
            }
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Convert More PDFs"
          />
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
        Turning a PDF page into a JPG is what you want when the page has to go
        somewhere a PDF will not fit: a slide, a chat message, a listing photo,
        a document that only accepts images.
      </p>
      <p>
        Each page is redrawn at the resolution you choose and saved as a JPG
        named after its page number, so a twenty page document comes back as
        twenty clearly labelled images rather than a pile you have to sort.
      </p>
      <p>
        Rendering happens in your browser using the same engine that displays
        PDFs on the web, which is why the images match what you see on screen and
        why nothing needs to be uploaded first.
      </p>
    </>
  );
}
