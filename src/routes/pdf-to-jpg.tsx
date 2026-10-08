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
import { pdfToJpg, type ImageQuality } from "#/lib/operations";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-jpg");

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
      pdfToJpg(file.file, pages, quality, pages.length > 1, report),
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
                  legend="Image quality"
                  hint="Higher quality means larger JPG files."
                >
                  <OptionCards
                    name="quality"
                    options={QUALITIES}
                    value={quality}
                    onChange={setQuality}
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
                Convert to JPG
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Pages converted successfully"
            stats={[
              { label: "Pages converted", value: String(pages.length), highlight: true },
              { label: "Quality", value: QUALITIES.find((q) => q.value === quality)!.label },
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
