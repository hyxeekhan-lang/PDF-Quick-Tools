import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolShell } from "#/components/ToolShell";
import { VisualPageTool } from "#/components/VisualPageTool";
import {
  changePageSize,
  type ResizeMode,
  type ResizeOrientation,
} from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/change-page-size");

export const Route = createFileRoute("/change-page-size")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: ChangePageSizePage,
});

const MODES = [
  { value: "a4" as const, label: "A4", description: "210 × 297 mm" },
  { value: "letter" as const, label: "US Letter", description: "8.5 × 11 in" },
  { value: "legal" as const, label: "US Legal", description: "8.5 × 14 in" },
  { value: "fit" as const, label: "Keep size", description: "Only change orientation" },
];

const ORIENTATIONS = [
  { value: "portrait" as const, label: "Portrait", description: "Taller than wide" },
  { value: "landscape" as const, label: "Landscape", description: "Wider than tall" },
];

const FAQ = [
  {
    question: "Will my text get cut off?",
    answer:
      "No. The existing page content is scaled down to fit inside the new sheet rather than cropped, so nothing falls outside the page. There may be a little extra white space on one side when the aspect ratios do not match.",
  },
  {
    question: "When should I use keep size?",
    answer:
      "Choose it when the paper is already right and you only need to flip the page from portrait to landscape, for example for a wide table.",
  },
  {
    question: "Which size does my printer want?",
    answer:
      "A4 outside North America, US Letter in the United States and Canada, US Legal for long legal documents. Most printers handle either A4 or Letter automatically, so if you are unsure keep the original setting.",
  },
  {
    question: "Can I change only some pages?",
    answer: "Yes. Untick the pages you want to leave at their current size.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The resize runs in this browser tab on your own device as part of the standard workflow.",
  },
];

function ChangePageSizePage() {
  const [mode, setMode] = useState<ResizeMode>("a4");
  const [orientation, setOrientation] = useState<ResizeOrientation>("portrait");

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to resize"
        hint="Every page starts selected. Untick any page you want to leave alone."
        actionLabel="Change Page Size"
        startOverLabel="Resize Another PDF"
        successTitle="Page size changed successfully"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to resize."
        options={({ disabled }) => (
          <div className="space-y-5">
            <OptionGroup
              legend="New page size"
              hint="Content is scaled to fit the new sheet, so nothing is cut off."
            >
              <OptionCards
                name="resize-mode"
                options={MODES}
                value={mode}
                onChange={setMode}
                disabled={disabled}
                columns={4}
              />
            </OptionGroup>
            <OptionGroup legend="Orientation">
              <OptionCards
                name="resize-orientation"
                options={ORIENTATIONS}
                value={orientation}
                onChange={setOrientation}
                disabled={disabled}
                columns={2}
              />
            </OptionGroup>
          </div>
        )}
        run={async (file, indexes, report) => [
          await changePageSize(file, indexes, mode, orientation, report),
        ]}
        stats={({ selected }) => [
          { label: "Pages resized", value: String(selected.length), highlight: true },
          {
            label: "Size",
            value: MODES.find((item) => item.value === mode)?.label ?? "-",
          },
          { label: "Orientation", value: orientation },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        The most common PDF problem is a page size that does not match the paper
        in the tray. A document laid out for Letter comes out half off the page
        on A4, and the fix is not always obvious from the print dialogue.
      </p>
      <p>
        This tool rewrites the page dimensions and scales the existing content
        to sit properly inside the new sheet. Because it works on the pages
        themselves, the result is what every reader and every printer sees, not
        just a print-time hint.
      </p>
    </>
  );
}