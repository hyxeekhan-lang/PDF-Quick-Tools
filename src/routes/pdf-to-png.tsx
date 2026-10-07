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
import { FriendlyError, type AcceptedFile } from "#/lib/files";
import { pdfToPng, type ImageQuality } from "#/lib/operations";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-png");

export const Route = createFileRoute("/pdf-to-png")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfToPngPage,
});

const QUALITIES = [
  {
    value: "high" as const,
    label: "High resolution",
    description: "2× scale — best for cropping and printing",
  },
  {
    value: "medium" as const,
    label: "Balanced",
    description: "Sharp on screen, sensible file size",
  },
  {
    value: "small" as const,
    label: "Lightweight",
    description: "Quickest to upload or share",
  },
];

const FAQ = [
  {
    question: "How is this different from PDF to JPG?",
    answer:
      "JPG throws away detail to get small — it is right for a photo you are pasting into a document. PNG keeps every pixel, so it is the right choice for a page you need to read small print from, crop into, or put on something that prints well. The cost is file size: a PNG page is usually several times larger than the same page as a JPG.",
  },
  {
    question: "Will the PNG be transparent?",
    answer:
      "No. A PDF page has a white background and the PNG is drawn with that background, so it looks exactly as the page does when you open it.",
  },
  {
    question: "Can I convert only some pages?",
    answer:
      "Yes. Type the pages you want, like 1-4, 9. Leave the whole range in place to convert the entire document.",
  },
  {
    question: "How do I get several images at once?",
    answer:
      "When you convert more than one page the images come back together in a single zip file, named by page number, so it is one download rather than twenty.",
  },
  {
    question: "Is the text still selectable in the PNG?",
    answer:
      "No. A PNG is a picture of the page, so text inside it cannot be selected or searched. That is normal for any PDF to image conversion.",
  },
  {
    question: "Are my pages uploaded to convert them?",
    answer:
      "No. Your browser redraws the pages on your own device, so nothing about the document is sent to a server.",
  },
];

function PdfToPngPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [range, setRange] = useState("");
  const [quality, setQuality] = useState<ImageQuality>("medium");
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const { pages, problem } = usePageRange(range, pageCount);

  const startOver = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRange("");
    run.reset();
  }, [run]);

  async function pick(files: AcceptedFile[]) {
    const chosen = files[0];
    setFile(chosen);
    run.reset();
    setReading(true);
    try {
      const count = await getPageCount(chosen.file);
      setPageCount(count);
      setRange(count > 1 ? `1-${count}` : "1");
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

  async function convert() {
    if (!file) return;
    await run.run((report) =>
      pdfToPng(file.file, pages, quality, pages.length > 1, report),
    );
  }

  const canConvert = Boolean(file) && pages.length > 0 && problem === null && !reading;

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
              status={
                reading
                  ? "Reading pages"
                  : pageCount > 0
                    ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
                    : undefined
              }
              onRemove={startOver}
            />

            {pageCount > 0 && (
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
                  legend="Resolution"
                  hint="Higher resolution means a sharper image and a much bigger file."
                >
                  <OptionCards
                    name="png-quality"
                    options={QUALITIES}
                    value={quality}
                    onChange={setQuality}
                    disabled={busy}
                  />
                </OptionGroup>
              </>
            )}

            {busy && <ProgressBar progress={run.progress} />}

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
                Convert to PNG
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Pages converted successfully"
            stats={[
              { label: "Pages converted", value: String(pages.length), highlight: true },
              {
                label: "Resolution",
                value: QUALITIES.find((q) => q.value === quality)!.label,
              },
            ]}
            note={
              pages.length > 1
                ? "All of the images are inside the zip, named by page number."
                : undefined
            }
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Convert Another PDF"
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
        A PDF page is a drawing, not a picture, so turning it into an image means
        redrawing it. This does that at the resolution you pick and saves each
        page as a PNG named after its page number.
      </p>
      <p>
        PNG is the lossless one. Nothing is thrown away to make the file small,
        which is why a page at high resolution can be a few megabytes where the
        same page as a JPG would be a few hundred kilobytes. If you are after a
        small file rather than a faithful one, use PDF to JPG instead.
      </p>
      <p>
        Rendering happens in your browser using the same engine that displays
        PDFs on the web, which is why the images match what you see on screen and
        why nothing needs to be uploaded first.
      </p>
    </>
  );
}