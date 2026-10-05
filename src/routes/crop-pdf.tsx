import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolShell } from "#/components/ToolShell";
import { VisualPageTool } from "#/components/VisualPageTool";
import { cropPdf, type CropPreset } from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/crop-pdf");

export const Route = createFileRoute("/crop-pdf")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: CropPage,
});

const PRESETS = [
  { value: "a4" as const, label: "A4", description: "210 × 297 mm" },
  { value: "letter" as const, label: "US Letter", description: "8.5 × 11 in" },
  { value: "square" as const, label: "Square", description: "Equal sides" },
  { value: "card" as const, label: "Business card", description: "Wide and short" },
];

const FAQ = [
  {
    question: "What does cropping actually do to the file?",
    answer:
      "It writes a smaller crop box onto each page, which is what PDF readers use when they display and print. The content outside the box is still inside the file, just not shown. Delete your download if you need the margins back later.",
  },
  {
    question: "Will cropping make my pages smaller?",
    answer:
      "No. The file size barely changes, because the content outside the crop box is still stored. If file size is what you are after, use Compress PDF instead.",
  },
  {
    question: "Can I crop to an exact measurement?",
    answer:
      "This tool offers the fixed sizes people actually need. For an unusual measurement, change the page size first and then crop.",
  },
  {
    question: "Can I crop only some pages?",
    answer:
      "Yes. Untick the pages you want to leave alone before cropping.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. Cropping happens in this browser tab on your own device as part of the standard workflow.",
  },
];

function CropPage() {
  const [preset, setPreset] = useState<CropPreset>("a4");

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to crop"
        hint="Every page starts selected. Untick any page you want to leave as it is."
        actionLabel="Crop PDF"
        startOverLabel="Crop Another PDF"
        successTitle="PDF cropped successfully"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to crop."
        options={({ disabled }) => (
          <OptionGroup
            legend="Crop to"
            hint="The visible area is trimmed to this size and centred on the page."
          >
            <OptionCards
              name="crop-preset"
              options={PRESETS}
              value={preset}
              onChange={setPreset}
              disabled={disabled}
              columns={4}
            />
          </OptionGroup>
        )}
        run={async (file, indexes, report) => [
          await cropPdf(file, indexes, preset, report),
        ]}
        stats={({ selected }) => [
          { label: "Pages cropped", value: String(selected.length), highlight: true },
          {
            label: "Size",
            value: PRESETS.find((item) => item.value === preset)?.label ?? "-",
          },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A scan usually arrives with a wide white border and a crooked edge. Crop
        trims that border away so the page looks like a document rather than a
        photograph of one.
      </p>
      <p>
        It is also the quickest fix for a document that will not print properly,
        and for slides or inserts that need to be cut down to a card before they
        are folded.
      </p>
    </>
  );
}