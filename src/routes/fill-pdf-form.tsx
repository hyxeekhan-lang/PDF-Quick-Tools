import { createFileRoute } from "@tanstack/react-router";
import { ToolShell } from "#/components/ToolShell";
import { FormFiller } from "#/components/FormFiller";
import { fillPdfForm } from "#/lib/operations-forms";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/fill-pdf-form");

export const Route = createFileRoute("/fill-pdf-form")({
  head: () =>
    pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: FormFillPage,
});

const FAQ = [
  {
    question: "What counts as a fillable form field?",
    answer:
      "Text boxes, check boxes and radio buttons built into the PDF as real form objects. If you typed into a form on a computer before but nothing stayed when you re-opened it, the boxes are just drawings and this tool cannot fill them.",
  },
  {
    question: "Can I save a form I filled in and reuse it later?",
    answer:
      "Not from this page. Every run edits the file you uploaded. Download the result and keep it yourself; the page resets afterward.",
  },
  {
    question: "My form asks for a signature. Does that work?",
    answer:
      "Only if it is an actual signature form field. Most signature lines on downloaded forms are just lines drawn on the page — those cannot be signed with this tool.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The form is filled in this browser tab on your own device as part of the standard workflow.",
  },
];

function FormFillPage() {
  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <FormFiller
        toolName={tool.name}
        onRun={fillPdfForm}
        successTitle="Form fields filled"
        startOverLabel="Fill Another PDF"
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A bank, government or college form is only useful once every box is
        filled. This tool writes straight into the form fields that the PDF was
        built with, so the result is a proper filled document, not a printed
        copy.
      </p>
      <p>
        It reads the field names from your uploaded file, so you see exactly
        which fields exist. Anything that is not a real field in the browser is
        not a field this tool can write to.
      </p>
      <p>
        Every change happens in this browser tab on your own device. The file
        never leaves your computer.
      </p>
    </>
  );
}
