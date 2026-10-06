import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VisualPageTool } from "#/components/VisualPageTool";
import { ToolShell } from "#/components/ToolShell";
import type { ResultStat } from "#/components/ToolFeedback";
import { ocrPdf, type OcrOutcome } from "#/lib/operations-ocr";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/ocr-pdf");

export const Route = createFileRoute("/ocr-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: OcrPage,
});

const FAQ = [
  {
    question: "What does OCR actually change in my PDF?",
    answer:
      "Nothing you can see. The scan stays exactly as it is, and the recognised words are drawn back onto the page invisibly, sitting precisely on top of the letters in the image. That is what makes the text selectable, searchable and copyable.",
  },
  {
    question: "How accurate is it?",
    answer:
      "On a clean typed scan it reads around 95% of words correctly, and the tool shows you the confidence it achieved. It struggles the way any scanner does: fancy fonts, low contrast, a page sitting crooked, handwriting, small print in tables.",
  },
  {
    question: "How long does it take?",
    answer:
      "Roughly three seconds per page, so a ten page scan is about half a minute and a fifty page scan a few minutes. It runs entirely on your own machine, so a long job just keeps going.",
  },
  {
    question: "What languages can it read?",
    answer:
      "English only at the moment. Urdu, Arabic, Chinese and Hindi need their own recognition model, which would add several more megabytes to the download.",
  },
  {
    question: "My PDF already has text — will it break it?",
    answer:
      "No. Pages that already contain real selectable text are detected and passed through untouched. Only genuinely image-only pages get read, so it is safe to run on a document that mixes typed and scanned pages.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No, and that matters more here than anywhere else on this site. A scan is often a passport, a contract or a medical record. This is read in your browser and the recognition model is served from this site, not a third party.",
  },
];

function OcrPage() {
  const [outcome, setOutcome] = useState<OcrOutcome | null>(null);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to read"
        hint="Tick the scanned pages you want to make searchable."
        actionLabel="Make PDF Searchable"
        startOverLabel="Read Another PDF"
        successTitle="Your PDF is now searchable"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to read."
        run={async (file, indexes, report) => {
          const result = await ocrPdf(file, indexes, report);
          setOutcome(result);
          return [result.result];
        }}
        stats={({ selected }): ResultStat[] => [
          { label: "Pages read", value: String(outcome?.recognised ?? selected.length), highlight: true },
          { label: "Already had text", value: String(outcome?.skipped ?? 0) },
          { label: "Confidence", value: outcome ? `${outcome.confidence}%` : "—" },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A scanned document is a photograph of a document. The words are visibly
        there, but as far as a computer is concerned they are just grey shapes,
        which is why you cannot search it, cannot select the text and cannot
        read it aloud.
      </p>
      <p>
        Optical character recognition reads those shapes and works out what they
        say. This tool then draws the recognised words back onto the page
        invisibly, lined up exactly on top of the letters in the image. The scan
        looks untouched; it just happens to be searchable now.
      </p>
      <p>
        Being honest about the limits: this reads English, and it reads typed
        text. Handwriting, a page photographed at an angle, faint or low-contrast
        print, and small text in dense tables are where it struggles — the same
        places any scanner does. The confidence score it reports tells you how
        well it actually went on your particular file.
      </p>
      <p>
        And it all happens in this tab. A scan is usually the most personal
        document a person owns, and this one never leaves your machine — the
        recognition model is served from this site rather than a third party,
        so there is nothing to trust but us.
      </p>
    </>
  );
}