import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import {
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultStat,
} from "#/components/ToolFeedback";
import { button, cx } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import { addTextBoxes, type TextBox } from "#/lib/operations-extra";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/edit-pdf");

export const Route = createFileRoute("/edit-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: EditPage,
});

const FAQ = [
  {
    question: "How do I know where to put the coordinates?",
    answer:
      "The origin is the bottom-left corner of the page, the same convention PDF itself uses. So x is how far from the left edge, y is how far up from the bottom. A standard A4 page is about 595 by 842 points, so x = 56 and y = 780 puts text near the top-left, inside a normal margin.",
  },
  {
    question: "What font size should I use?",
    answer:
      "12 is a normal body size and 18 to 24 reads as a heading. Going much smaller than 8 makes the text illegible when printed, and much larger than 36 will run off the edge of most pages.",
  },
  {
    question: "Can I change or delete the text already in the PDF?",
    answer:
      "No. This adds text to the page; it does not rewrite the content underneath. If you need to replace existing text, use the redact tool first to cover it, then add the new text on top.",
  },
  {
    question: "Why did my text come out as question marks or blanks?",
    answer:
      "Only the standard Helvetica fonts are available, so characters outside the Latin alphabet — Urdu, Chinese, some symbols — cannot be drawn. Latin text in the English alphabet works normally.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The PDF is edited in this browser tab on your own device and never leaves your machine.",
  },
];

let boxId = 0;

function EditPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [counting, setCounting] = useState(false);
  const [boxes, setBoxes] = useState<TextBox[]>([
    { page: 0, x: 56, y: 780, size: 12, text: "" },
  ]);
  const [stats, setStats] = useState<ResultStat[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pick(files: AcceptedFile[]) {
    const chosen = files[0] ?? null;
    setFile(chosen);
    setBoxes([{ page: 0, x: 56, y: 780, size: 12, text: "" }]);
    setStats([]);
    run.reset();
    if (!chosen) return;
    setCounting(true);
    getPageCount(chosen.file).then(
      (count) => {
        setPageCount(count);
        setCounting(false);
      },
      () => setCounting(false),
    );
  }

  function startOver() {
    setFile(null);
    setPageCount(0);
    setBoxes([{ page: 0, x: 56, y: 780, size: 12, text: "" }]);
    setStats([]);
    run.reset();
  }

  function update(id: number, patch: Partial<TextBox>) {
    setBoxes((all) =>
      all.map((box) => (box === all[id] ? { ...box, ...patch } : box)),
    );
  }

  function addBox() {
    setBoxes((all) => [
      ...all,
      { page: 0, x: 56, y: 700, size: 12, text: "" },
    ]);
  }

  function removeBox(index: number) {
    setBoxes((all) => all.filter((_, i) => i !== index));
  }

  async function start() {
    if (!file) return;
    await run.run(async (report) => [
      await addTextBoxes(file.file, boxes, report),
    ]);
  }

  const filled = boxes.filter((box) => box.text.trim().length > 0);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Add text to an existing PDF. Position is measured in PDF points from
          the bottom-left corner of the page, so x counts from the left edge and
          y counts up from the bottom.
        </p>

        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={pick}
            onRejected={run.fail}
          />
        )}

        {file && run.status !== "done" && (
          <>
            <FileList
              files={[file]}
              kind="pdf"
              disabled={busy}
              status={busy ? "Writing your text" : "Ready to edit"}
              onRemove={startOver}
            />

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {!busy && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Your text boxes
                </h3>

                {boxes.map((box, index) => (
                  <div
                    key={boxId + index}
                    className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        Box {index + 1}
                      </span>
                      {boxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBox(index)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <textarea
                      value={box.text}
                      onChange={(event) => update(index, { text: event.target.value })}
                      rows={2}
                      placeholder="Text to add"
                      className="mt-2 w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    />

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Field label="Page">
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, pageCount)}
                          value={box.page + 1}
                          disabled={counting}
                          onChange={(event) =>
                            update(index, { page: Math.max(0, Number(event.target.value) - 1) })
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="X">
                        <input
                          type="number"
                          value={box.x}
                          onChange={(event) =>
                            update(index, { x: Number(event.target.value) })
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Y">
                        <input
                          type="number"
                          value={box.y}
                          onChange={(event) =>
                            update(index, { y: Number(event.target.value) })
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Size">
                        <input
                          type="number"
                          min={4}
                          max={72}
                          value={box.size}
                          onChange={(event) =>
                            update(index, { size: Number(event.target.value) })
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBox}
                  className={button("secondary")}
                >
                  Add Another Box
                </button>

                {run.status === "error" && run.error && (
                  <ErrorMessage
                    message={run.error}
                    onRetry={start}
                    onStartOver={startOver}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={start}
                    disabled={filled.length === 0}
                    className={cx(button("primary", "lg"), filled.length === 0 && "opacity-50")}
                  >
                    Apply Text to PDF
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className={button("secondary", "lg")}
                  >
                    Start Over
                  </button>
                </div>

                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {pageCount > 0
                    ? `This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}. Only the standard Helvetica font is available, so characters outside the Latin alphabet will not render.`
                    : "Only the standard Helvetica font is available, so characters outside the Latin alphabet will not render."}
                </p>
              </div>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Your text has been added"
            stats={[
              { label: "Boxes written", value: String(filled.length), highlight: true },
              ...stats,
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Edit Another PDF"
            note="The new text is drawn on top of the existing pages. Nothing underneath was changed."
          />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
      {label}
      {children}
    </label>
  );
}

function About() {
  return (
    <>
      <p>
        Adding a note, a date, a signature line or a corrected total to a PDF
        usually means opening an editor that wants a subscription. This tool
        does the one job that is actually hard to fake: it writes text onto the
        page at an exact position, with an exact size.
      </p>
      <p>
        You give it coordinates. The origin is the bottom-left corner of the
        page — the same convention PDF itself uses — so x is the distance from
        the left edge and y is the distance up from the bottom. A standard A4
        page is about 595 by 842 points, which puts x = 56 and y = 780 in a
        sensible top-left margin.
      </p>
      <p>
        Be clear about the limit: this adds text, it does not rewrite text that
        is already there. To replace something, cover it with the redact tool
        and write the new line on top. And because only the standard fonts are
        available, non-Latin scripts will not render.
      </p>
    </>
  );
}