import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VisualPageTool } from "#/components/VisualPageTool";
import { ToolShell } from "#/components/ToolShell";
import type { ResultStat } from "#/components/ToolFeedback";
import { formatBytes } from "#/lib/files";
import {
  pdfToExcel,
  type PdfToExcelResult,
} from "#/lib/operations-pdf-to-excel";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/pdf-to-excel");

export const Route = createFileRoute("/pdf-to-excel")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: PdfToExcelPage,
});

const FAQ = [
  {
    question: "How does it know where the columns are?",
    answer:
      "A PDF does not record tables, so the columns are found by looking for a gap between values that repeats on row after row. In a table, the gap between two columns lands in roughly the same place on every row. In a paragraph of text, wide gaps land in different places each line. That repeating pattern is what marks out a table, and it is what this uses to place the values into columns.",
  },
  {
    question: "Will it look exactly like the PDF?",
    answer:
      "No, and no honest tool can promise that. What you get is a real .xlsx with the values in the right columns — which is what you need to sum, sort and chart them. The page's fonts, colours, cell borders and shading are not carried over, and merged cells are not reconstructed: a value that was merged across two cells in the PDF will appear in just one of them.",
  },
  {
    question: "Do the numbers stay numbers?",
    answer:
      "Yes. Anything that is plainly a figure — with optional thousands separators, currency symbol, or brackets for a negative — is written into the spreadsheet as a number, so totals and formulas work on it. Anything ambiguous stays as text rather than being guessed at, because a date quietly turned into a number is far more annoying than a date that stayed readable.",
  },
  {
    question: "It says no tables were found — what now?",
    answer:
      "Two likely reasons. If the pages are scans or images, there is no text for the tool to read; run them through OCR PDF first, then convert the result. If they are already text but are laid out as one long list rather than a grid, there are no repeating column gaps to find, and this tool is the wrong one — the PDF to Word tool will read them as a document instead.",
  },
  {
    question: "What about forms and bank statements?",
    answer:
      "Both work well when the numbers are in aligned columns, which they usually are. A statement with a wrapped description column can come out ragged, because a value that wraps onto two lines looks like two rows. Check the result before you rely on it for anything that matters.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The PDF is opened and read right here in this tab, and the .xlsx is written in your browser too. Nothing is sent to a server.",
  },
];

function PdfToExcelPage() {
  const [outcome, setOutcome] = useState<PdfToExcelResult | null>(null);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <VisualPageTool
        toolName={tool.name}
        legend="Pages to convert"
        hint="Tick the pages whose tables you want pulled out."
        actionLabel="Convert to Excel"
        startOverLabel="Convert Another PDF"
        successTitle="Your spreadsheet is ready"
        selectAllByDefault
        emptySelectionMessage="Select at least one page to convert."
        run={async (file, indexes, report) => {
          const result = await pdfToExcel(file, indexes, report);
          setOutcome(result);
          return [result.result];
        }}
        stats={({ results }): ResultStat[] => [
          {
            label: "Tables found",
            value: String(outcome?.tables ?? "—"),
            highlight: true,
          },
          {
            label: "Longest table",
            value: outcome ? `${outcome.rows} rows` : "—",
          },
          {
            label: "Widest table",
            value: outcome ? `${outcome.columns} columns` : "—",
          },
          {
            label: "Pages with no text",
            value: outcome?.empty.length ? outcome.empty.join(", ") : "0",
          },
          { label: "File size", value: results[0] ? formatBytes(results[0].size) : "—" },
        ]}
      />
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A table in a PDF is an illusion. The file has no idea it is looking at
        one — it has letters at coordinates and, often, nothing else. No lines,
        no boxes, no record that these three numbers below are meant to be read
        across. The columns are there on the page and nowhere in the data, so
        anything that wants them has to work them out.
      </p>
      <p>
        That is what this does. It looks for the gaps between values, and keeps
        the ones that land in the same place on row after row. Those are the
        column boundaries. A gap that appears once is a tab stop or a long
        word; a gap that recurs down the whole block is a column. Once the
        boundaries are known, each value goes into the column it sits in, and
        the result is a genuine spreadsheet you can sort and total rather than a
        picture of a spreadsheet.
      </p>
      <p>
        The numbers come out as numbers. A PDF cannot tell you whether
        &ldquo;1,200.00&rdquo; was a figure or a note, but when a cell is plainly
        a number it is written as one, so a column can be summed without you
        retyping it. Where the text is ambiguous it stays as text, on purpose.
      </p>
      <p>
        Being straight about the limits: the page's styling is not carried over
        — no fonts, no colours, no cell borders — and merged cells are not
        reconstructed, so a heading that spanned three columns ends up in one of
        them. A table whose cells wrap onto a second line comes out ragged. The
        values and their columns are right; the appearance of the page is not
        what you get back.
      </p>
      <p>
        And none of it leaves your browser. Statements, invoices and payroll
        files are exactly the sort of thing nobody should have to hand to a
        conversion website, so the PDF is read here in this tab and the
        spreadsheet is written here too.
      </p>
    </>
  );
}
