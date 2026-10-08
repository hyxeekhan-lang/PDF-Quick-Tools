import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import {
  imageToText,
  type ImageToTextFormat,
  type ImageToTextResult,
} from "#/lib/operations-image-to-text";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/image-to-text");

export const Route = createFileRoute("/image-to-text")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: ImageToTextPage,
});

const FORMATS = [
  { value: "txt" as const, label: "Plain text", description: "Just the words, nothing else" },
  { value: "md" as const, label: "Markdown", description: "One heading per image, so you can tell them apart" },
];

const FAQ = [
  {
    question: "What kind of image does this read best?",
    answer:
      "A flat, evenly lit photo of a page or a screen. Straight-on and sharp beats an angled shot of good paper every time — the recogniser reads shapes, and a slanted page turns every letter into a slightly different shape.",
  },
  {
    question: "Can it read handwriting?",
    answer:
      "Not reliably. This is built on Tesseract, which is trained on printed text. Handwriting comes back as a best guess and will often be wrong in a way that looks plausible, so do not rely on it for a handwritten note. Printed forms, receipts, screenshots and typed pages are what it is for.",
  },
  {
    question: "What happens with a page that has two columns?",
    answer:
      "You will get both columns, but the recogniser does not know which one comes first, so it may read across the page rather than down the left column and then the right. If that happens, splitting the image into one column each and running them separately gives a much better result.",
  },
  {
    question: "How accurate is it?",
    answer:
      "The result panel reports the recogniser's own confidence for the run. High confidence on a clean, straight image of typed text is usually accurate; low confidence means check it before you rely on it. Nothing here is guessproof, and a wrong number in an invoice matters.",
  },
  {
    question: "How many images can I do at once?",
    answer:
      "Up to 30. Each takes a few seconds because the recognition happens in your browser, and all the images are read in one go and put into a single text file.",
  },
  {
    question: "Are my images uploaded?",
    answer:
      "No. The recognition runs on this page, in this tab, using a model served from this same site. Nothing about the image is sent anywhere — which matters if it is a passport, a receipt or a document with your details on it.",
  },
];

function ImageToTextPage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const [format, setFormat] = useState<ImageToTextFormat>("txt");
  const run = useToolRun(tool.name);
  const busy = run.status === "working";
  const [outcome, setOutcome] = useState<ImageToTextResult | null>(null);

  const startOver = useCallback(() => {
    setFiles([]);
    setOutcome(null);
    run.reset();
  }, [run]);

  async function convert() {
    if (files.length === 0) return;
    await run.run(async (report) => {
      const result = await imageToText(
        files.map((item) => item.file),
        format,
        report,
      );
      setOutcome(result);
      return [result.result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {files.length === 0 && (
          <FileUploader
            kind="image"
            multiple
            toolName={tool.name}
            onFiles={(incoming) => {
              run.reset();
              setOutcome(null);
              setFiles(incoming);
            }}
            onRejected={run.fail}
          />
        )}

        {files.length > 0 && run.status !== "done" && (
          <>
            <FileList files={files} kind="image" disabled={busy} onRemove={startOver} />

            <OptionGroup legend="Output format" hint="Markdown keeps each image under its own heading.">
              <OptionCards
                name="format"
                options={FORMATS}
                value={format}
                onChange={setFormat}
                disabled={busy}
              />
            </OptionGroup>

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={files.length > 0 ? convert : undefined}
                onStartOver={startOver}
              />
            )}

            {!busy && (
              <button type="button" onClick={convert} className={button("primary", "lg")}>
                Extract Text
              </button>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Text extracted successfully"
            stats={[
              { label: "Images read", value: String(outcome?.images ?? files.length), highlight: true },
              { label: "Words", value: String(outcome?.words ?? "0") },
              { label: "Characters", value: String(outcome?.characters ?? "0") },
              { label: "Confidence", value: `${outcome?.confidence ?? 0}%` },
            ]}
            note={
              outcome && outcome.confidence < 80
                ? "That confidence is on the low side — read the text before you rely on it."
                : outcome && outcome.blank.length > 0
                  ? `No text was found in ${outcome.blank.length} image${outcome.blank.length === 1 ? "" : "s"}.`
                  : undefined
            }
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Read More Images"
          />
        )}

        {run.status === "error" && files.length === 0 && run.error && (
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
        This reads words out of a picture and hands them back as text you can
        copy, paste and search. It is the same recogniser that puts a text layer
        on a scanned PDF, pointed at a photograph instead of a page — which is
        the shape you want when there is no PDF involved: a whiteboard, a
        screenshot, a photo of a printed form.
      </p>
      <p>
        It is honest about its limits. Handwriting is not what it is built for,
        and a two-column page may be read across rather than down. The confidence
        it reports is the recogniser's own judgement of how sure it is, so a low
        number is a reason to check the result rather than a reason to trust it.
      </p>
      <p>
        All of this happens on this page, in this tab. The image is never
        uploaded, which is the only reason this is worth using for anything
        private.
      </p>
    </>
  );
}