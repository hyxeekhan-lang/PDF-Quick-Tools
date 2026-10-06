import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ToolShell } from "#/components/ToolShell";
import { MarkEditor } from "#/components/MarkEditor";
import { highlightPdf, type HighlightColor } from "#/lib/operations-forms";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/highlight-pdf");

export const Route = createFileRoute("/highlight-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: HighlightPdfPage,
});

const FAQ = [
  {
    question: "What is highlight PDF good for?",
    answer:
      "Marking up study material, reports and meeting notes. A yellow bar behind a sentence keeps it findable — the text is still selectable — so it is handy for revision and review without breaking the original.",
  },
  {
    question: "Can I highlight text on more than one page?",
    answer:
      "Yes. Use the Previous and Next page buttons at the bottom of the canvas and keep drawing; boxes you placed earlier stay put.",
  },
  {
    question: "Why does the text still show under the colour?",
    answer:
      "Highlighting is a translucent overlay. The text stays readable so you can still search and copy it, which is the point of highlighting as opposed to redacting.",
  },
  {
    question: "Will the highlight work on an e-reader or in PowerPoint?",
    answer:
      "It is standard PDF highlight content, so most PDF apps and printers show it. Slideshare and conversion tools that redraw each page sometimes lose the overlay.",
  },
  {
    question: "Can I remove a highlight I drew by mistake?",
    answer:
      "This tool cannot erase an existing box, but you can drag a new box of the same colour over it, or open the original and try again. Save the highlighted copy before re-uploading.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The preview and highlighted PDF are created in this browser tab on your own device.",
  },
];

/** Swatch colours mirrored from HIGHLIGHT_RGB in the highlight operation. */
const SWATCHES: ReadonlyArray<{
  id: HighlightColor;
  label: string;
  css: string;
}> = [
  { id: "yellow", label: "Yellow", css: "rgb(255, 235, 59)" },
  { id: "green", label: "Green", css: "rgb(152, 203, 152)" },
  { id: "blue", label: "Blue", css: "rgb(144, 164, 244)" },
  { id: "pink", label: "Pink", css: "rgb(248, 161, 196)" },
];

function HighlightPdfPage() {
  const [color, setColor] = useState<HighlightColor>("yellow");

  const onDraw = useCallback(
    (file: File, marks: Parameters<typeof highlightPdf>[1], report: Parameters<typeof highlightPdf>[3]) =>
      highlightPdf(file, marks, color, report),
    [color],
  );

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200/80 dark:bg-ink-950/45 dark:ring-ink-800">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">
          Choose a highlight colour
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              onClick={() => setColor(swatch.id)}
              className={`h-10 w-10 rounded-full ring-2 transition-all ${
                color === swatch.id
                  ? "ring-brand-600 shadow-lg"
                  : "ring-transparent hover:scale-105 hover:shadow-md"
              }`}
              style={{ backgroundColor: swatch.css }}
              aria-label={swatch.label}
              aria-pressed={color === swatch.id}
            >
              <span className="sr-only">{swatch.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <MarkEditor
          toolName={tool.name}
          onDraw={onDraw}
          markColor={{
            saved: "rgba(255, 214, 0, 0.45)",
            active: "rgba(255, 214, 0, 0.25)",
          }}
          markLabel="highlight"
          actionLabel="Highlight PDF"
          successTitle="Your PDF has been highlighted"
          startOverLabel="Highlight Another PDF"
        />
      </div>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Study a PDF, review a contract or grade an assignment? Drag a
        translucent bar over the lines that matter. The text underneath stays
        readable and selectable, so you can still search, copy and quote it.
      </p>
      <p>
        Pick a colour and go page by page — yellow for key facts, green for
        agreed terms, blue for questions, pink for things to follow up.
        Everything is drawn in this browser tab on your own device.
      </p>
    </>
  );
}
