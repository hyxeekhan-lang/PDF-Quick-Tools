import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolShell } from "#/components/ToolShell";
import { VisualPageTool } from "#/components/VisualPageTool";
import { addHeaderFooter } from "#/lib/operations-pages";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/add-header-footer");

export const Route = createFileRoute("/add-header-footer")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: HeaderFooterPage,
});

const PLACEMENT = [
  { value: "top" as const, label: "Header", description: "Along the top edge" },
  { value: "bottom" as const, label: "Footer", description: "Along the bottom edge" },
];

const FAQ = [
  {
    question: "Is this a real PDF header or just text drawn on the page?",
    answer:
      "It is text drawn on the page, centred, in a small grey font. That means it appears in prints, screenshots and PDF-to-image exports, which is usually what you want. It is not the document title metadata you can change in a PDF header — for that, use Remove PDF Metadata.",
  },
  {
    question: "Can I add a different header to each page?",
    answer:
      "No. Every page you select gets the same line. If you need per-page text, that is a different job and this tool does not do it.",
  },
  {
    question: "The text is overlapping the page content. What do I do?",
    answer:
      "Shorter text, or apply it to fewer pages. The header sits 24 points from the edge, so a page with a margin narrower than that will have the two overlap.",
  },
  {
    question: "Can I use my own font?",
    answer:
      "No. This uses a standard sans-serif face, which is the one thing guaranteed to render without embedding a font file and growing the PDF.",
  },
  {
    question: "Are my files uploaded?",
    answer:
      "No. The header is drawn in this browser tab on your own device as part of the standard workflow.",
  },
];

function HeaderFooterPage() {
  const [text, setText] = useState("");
  const [where, setWhere] = useState<"top" | "bottom">("top");
  const valid = text.trim().length > 0;

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to add it to"
        hint="Every page starts selected. Untick pages that should stay as they are."
        actionLabel="Add Header and Footer"
        startOverLabel="Add To Another PDF"
        successTitle="Header and footer added"
        selectAllByDefault
        emptySelectionMessage="Select at least one page."
        canRun={valid}
        options={({ disabled }) => (
          <div className="space-y-5">
            <OptionGroup legend="Text" hint="Centred on each selected page.">
              <label
                className="block text-sm font-semibold text-ink-900 dark:text-white"
                htmlFor="header-footer-text"
              >
                What should it say?
              </label>
              <input
                id="header-footer-text"
                value={text}
                disabled={disabled}
                onChange={(event) => setText(event.target.value)}
                maxLength={120}
                placeholder="For example: Invoice 2024-118 — Confidential"
                aria-invalid={!valid}
                aria-describedby="header-footer-text-help"
                className="mt-2 block w-full rounded-xl bg-white px-3.5 py-2.5 text-base text-ink-900 ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
              />
              <p
                id="header-footer-text-help"
                className="mt-2 text-sm text-ink-500 dark:text-ink-400"
              >
                {valid
                  ? `${text.trim().length} character${text.trim().length === 1 ? "" : "s"}`
                  : "Enter the text you want to appear on each page."}
              </p>
            </OptionGroup>
            <OptionGroup legend="Place it at the">
              <OptionCards
                name="header-placement"
                options={PLACEMENT}
                value={where}
                onChange={setWhere}
                disabled={disabled}
                columns={2}
              />
            </OptionGroup>
          </div>
        )}
        run={async (file, indexes, report) => [
          await addHeaderFooter(file, indexes, text, where, report),
        ]}
        stats={({ selected }) => [
          { label: "Pages changed", value: String(selected.length), highlight: true },
          { label: "Position", value: where === "top" ? "Top" : "Bottom" },
          { label: "Text", value: text.trim() || "-" },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A file name or a reference number on every page saves a lot of arguing
        later. It is the difference between a printed pile of pages and a
        document that stays in order once it leaves your desk.
      </p>
      <p>
        This is also the usual way to mark a document confidential without
        covering it in a watermark — a single small line along the edge is
        quieter and leaves the page readable.
      </p>
      <p>
        The text is centred in a small grey font near the edge, drawn straight
        onto the page so it survives printing and PDF-to-image conversion.
      </p>
    </>
  );
}