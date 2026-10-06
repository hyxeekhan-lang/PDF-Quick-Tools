import { createFileRoute } from "@tanstack/react-router";
import { VisualPageTool } from "#/components/VisualPageTool";
import { ToolShell } from "#/components/ToolShell";
import { pdfToMarkdown } from "#/lib/operations-extra";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-markdown");

export const Route = createFileRoute("/pdf-to-markdown")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfToMarkdownPage,
});

const FAQ = [
  {
    question: "Will the headings and lists be right?",
    answer:
      "Usually, on simple documents. A PDF records where each piece of text sits but not what role it plays, so headings are guessed from short lines that do not end in punctuation. Clean reports and articles convert well; magazine layouts with pull quotes and sidebars convert approximately.",
  },
  {
    question: "Why did some pages come out empty?",
    answer:
      "Because they have no text layer. A scanned page is a picture of words, and this tool reads text rather than recognising it in images. Those pages are listed in a comment at the end of the Markdown file so you know what is missing.",
  },
  {
    question: "Can I convert a 300-page PDF?",
    answer:
      "You can try. Very large documents are slow in the browser and may need every page ticked. If it stalls, convert the sections you need a few at a time.",
  },
  {
    question: "What can I do with the Markdown afterwards?",
    answer:
      "Anything. Paste it into Obsidian, Notion, a blog editor or a static site generator. The file is standard .md and opens in any text editor.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The text is read and the Markdown is written in this browser tab on your own device.",
  },
];

function PdfToMarkdownPage() {
  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to convert"
        hint="Tick every page you want in the Markdown file."
        actionLabel="Convert to Markdown"
        startOverLabel="Convert Another PDF"
        successTitle="Your Markdown file is ready"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to convert."
        run={async (file, indexes, report) => [
          await pdfToMarkdown(file, indexes, report),
        ]}
        stats={({ selected }) => [
          { label: "Pages converted", value: String(selected.length), highlight: true },
          { label: "Format", value: "Markdown" },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A PDF is a fixed layout: text sits exactly where it was drawn and
        nothing about it says which lines were headings. Markdown is the
        opposite — it is plain text with structure written into it, which is
        why most people keep notes in it.
      </p>
      <p>
        This tool reads your PDF's text layer and rebuilds that structure:
        short lines become headings, list markers are kept, blank lines become
        paragraph breaks. The result is a real .md file you can paste into
        Obsidian, Notion or any site builder.
      </p>
      <p>
        Be honest about the guesswork: a clean report converts well, but a
        magazine page with pull quotes and sidebars will come out approximate.
        Scanned pages have no text to read at all and are listed as skipped.
      </p>
    </>
  );
}
