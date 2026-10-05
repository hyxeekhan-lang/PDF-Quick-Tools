import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolShell } from "#/components/ToolShell";
import { VisualPageTool } from "#/components/VisualPageTool";
import { grayscalePdf, type GrayscaleQuality } from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/grayscale-pdf");

export const Route = createFileRoute("/grayscale-pdf")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: GrayscalePage,
});

const QUALITIES = [
  { value: "high" as const, label: "High", description: "Best for final printing" },
  { value: "medium" as const, label: "Medium", description: "Smaller file, still clear" },
  { value: "small" as const, label: "Small", description: "Smallest file, screen only" },
];

const FAQ = [
  {
    question: "Will my text still be selectable afterwards?",
    answer:
      "No. Every page has to be redrawn as a picture, because there is no way to recolour content that is already inside a PDF. The output is visual only. If you need selectable text, keep the colour original and ask your printer for black and white.",
  },
  {
    question: "Does it really make the file smaller?",
    answer:
      "Usually, yes. Black and white pages compress much better than colour ones, and photos lose their colour data entirely. The saving depends on how colourful the document is. Use Compress PDF afterwards for more.",
  },
  {
    question: "What about coloured stamps and coloured highlighting?",
    answer:
      "Everything becomes a shade of grey, including stamps, diagrams and highlights. Documents where colour carries meaning, such as charts with several labelled series, will be much harder to read. Check a page before sending it on.",
  },
  {
    question: "Can I convert only some pages?",
    answer: "Yes. Untick the pages you want to leave in colour.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The pages are redrawn in this browser tab on your own device as part of the standard workflow.",
  },
];

function GrayscalePage() {
  const [quality, setQuality] = useState<GrayscaleQuality>("medium");

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to convert"
        hint="Every page starts selected. Untick any page you want to leave in colour."
        actionLabel="Convert to Grayscale"
        startOverLabel="Convert Another PDF"
        successTitle="Grayscale PDF ready"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to convert."
        options={({ disabled }) => (
          <OptionGroup
            legend="Quality"
            hint="Higher quality prints better and produces a larger file."
          >
            <OptionCards
              name="gray-quality"
              options={QUALITIES}
              value={quality}
              onChange={setQuality}
              disabled={disabled}
            />
          </OptionGroup>
        )}
        run={async (file, indexes, report) => [
          await grayscalePdf(file, indexes, quality, report),
        ]}
        stats={({ selected }) => [
          { label: "Pages converted", value: String(selected.length), highlight: true },
          { label: "Quality", value: QUALITIES.find((i) => i.value === quality)?.label ?? "-" },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Black and white pages cost a fraction of what colour ones do to print,
        and photocopiers turn colour documents grey on their own anyway. If you
        are sending a document to be photocopied, doing the conversion yourself
        gives you control over how it looks.
      </p>
      <p>
        The trade-off is that each page is redrawn as a picture, so the text in
        the finished file can no longer be selected, searched or copied. Keep
        the colour original if you need any of that later.
      </p>
    </>
  );
}