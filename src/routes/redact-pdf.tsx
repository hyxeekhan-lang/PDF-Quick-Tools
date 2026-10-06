import { createFileRoute } from "@tanstack/react-router";
import { ToolShell } from "#/components/ToolShell";
import { MarkEditor } from "#/components/MarkEditor";
import { redactPdf } from "#/lib/operations-forms";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/redact-pdf");

export const Route = createFileRoute("/redact-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: RedactPdfPage,
});

const FAQ = [
  {
    question: "What does redacting actually do?",
    answer:
      "It paints a black rectangle over the part you chose. The text underneath is still there in the file — anyone who finds another way to see it can still read it. Redact PDF is a visual cover, not a removal.",
  },
  {
    question: "How do I redact the most sensitive stuff?",
    answer:
      "PAN numbers, account numbers, phone numbers, addresses and passport or Aadhaar details. Zoom in before you draw, and cover the whole string, not just the digits.",
  },
  {
    question: "Why is the redaction not showing in some apps?",
    answer:
      "Most modern PDF readers show it fine. Older tools sometimes draw the rectangle but fail to paint the cover colour properly, which makes it look blank.",
  },
  {
    question: "Is the redacted part gone forever?",
    answer:
      "No. This tool only draws over it. If you really need text removed and searchable, that is a different workflow and this page does not promise it.",
  },
  {
    question: "Can I edit my boxes before saving?",
    answer:
      "You cannot move or resize them, but you can go back through the pages, draw new boxes over old ones, and re-run the tool before downloading.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The preview and the redacted PDF are created in this browser tab on your own device.",
  },
];

function RedactPdfPage() {
  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <MarkEditor
        toolName={tool.name}
        onDraw={redactPdf}
        markLabel="box"
        actionLabel="Redact PDF"
        successTitle="Your PDF has been redacted"
        startOverLabel="Redact Another PDF"
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Share a screenshot or a document excerpt without sending the identifying
        number on it? Paint a black box over the PAN, account, phone or address
        before you send it.
      </p>
      <p>
        Draw a box over anything on any page — drag across the number, the date,
        the name line — and the tool stamps an opaque rectangle there when you
        apply. Move between pages until every sensitive spot is covered, then
        download one PDF.
      </p>
      <p>
        It is a cover, not a deletion. If a reader extracts the layer, the text
        underneath can still be found, so do not treat it as secure deletion.
      </p>
    </>
  );
}
