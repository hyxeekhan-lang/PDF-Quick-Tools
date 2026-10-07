import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VisualPageTool } from "#/components/VisualPageTool";
import { ToolShell } from "#/components/ToolShell";
import type { ResultStat } from "#/components/ToolFeedback";
import { pdfToWord, type PdfToWordResult } from "#/lib/operations-pdf-to-word";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-word");

export const Route = createFileRoute("/pdf-to-word")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfToWordPage,
});

const FAQ = [
  {
    question: "Will the document look exactly like the PDF?",
    answer:
      "No, and no honest tool can promise that. A PDF does not record what a paragraph, a heading or a font is — it records where each letter was drawn. This reads that geometry back and rebuilds headings and paragraphs from it, so the text and its structure survive and the document is genuinely editable. The typeface is not recovered; Word gets a clean standard font.",
  },
  {
    question: "What is not carried across?",
    answer:
      "Columns are read in order but not rebuilt as columns. Tables come out as lines of text rather than table cells. Images, footnotes, text boxes, headers and footers are not carried over. If you only need to edit the wording, this is the right tool; if you need the page to look identical, print to Word from the original.",
  },
  {
    question: "It says no text was found — what does that mean?",
    answer:
      "That PDF is a scan, or a set of images, so there are no letters for the tool to read. Run it through OCR PDF first. That puts a text layer onto the scanned pages, and this tool can then convert the result.",
  },
  {
    question: "Can I choose which pages to convert?",
    answer:
      "Yes. Pick any combination of pages on the preview and only those are converted. Useful when a document has a few text pages buried among scans.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The PDF is opened and read right here in this tab, and the .docx is written in your browser too. Nothing is sent to a server.",
  },
];

function PdfToWordPage() {
  const [outcome, setOutcome] = useState<PdfToWordResult | null>(null);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to convert"
        hint="Tick the pages you want turned into an editable Word document."
        actionLabel="Convert to Word"
        startOverLabel="Convert Another PDF"
        successTitle="Your Word document is ready"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to convert."
        run={async (file, indexes, report) => {
          const result = await pdfToWord(file, indexes, report);
          setOutcome(result);
          return [result.result];
        }}
        stats={({ selected, results }): ResultStat[] => [
          { label: "Pages converted", value: String(outcome?.pages ?? selected.length), highlight: true },
          { label: "Headings found", value: String(outcome?.headings ?? 0) },
          {
            label: "Pages skipped",
            value: outcome?.empty.length ? outcome.empty.join(", ") : "0",
          },
          { label: "File size", value: results[0] ? formatSize(results[0].size) : "—" },
        ]}
      />
    </ToolShell>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function About() {
  return (
    <>
      <p>
        A PDF is a picture of a document. That is exactly why it looks the same
        on every device — and exactly why you cannot correct a typo in it. If
        someone sends you a PDF and asks you to change a sentence, your options
        are to print it, or to rebuild it. This rebuilds it.
      </p>
      <p>
        It works out what is what from the page geometry. A line of text that is
        noticeably larger than the rest is a heading; a jump in the vertical
        spacing is a new paragraph; a page with a wide gap down the middle is
        two columns and is read left column first, then right. From that it
        writes a real .docx, with real Word headings, so the navigation pane and
        the table of contents work and the rest of Word treats it normally.
      </p>
      <p>
        Being straight about the limits, because they are real and no tool gets
        around them: the original typeface is not recovered, tables arrive as
        lines of text rather than cells, and images and text boxes do not come
        across. Two columns are read in the right order but come out as one.
        This is a faithful, editable document — it is not a photocopy of the
        page.
      </p>
      <p>
        And the whole thing happens in this tab. A PDF is often a contract or a
        report you are not supposed to hand to a conversion website, and nothing
        here is ever uploaded: the file is read in your browser and the .docx is
        written in your browser.
      </p>
    </>
  );
}
