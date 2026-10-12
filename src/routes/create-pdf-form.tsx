import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState, type PointerEvent } from "react";
import { ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button, muted } from "#/components/ui";
import { usePageThumbs } from "#/hooks/usePageThumbs";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import { createFillablePdf, type NewFormField } from "#/lib/operations-forms";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/create-pdf-form");

export const Route = createFileRoute("/create-pdf-form")({
  head: () => pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: CreatePdfFormPage,
});

const FAQ = [
  { question: "What fields can I add?", answer: "This first version adds interactive text boxes and checkboxes that can be filled in common PDF readers." },
  { question: "Does the original file leave my device?", answer: "No. Form fields are created in your browser and the new PDF is downloaded directly." },
  { question: "How do I place a field?", answer: "Choose text or checkbox, then tap or click on the page preview. You can move the field later by dragging it." },
];

function CreatePdfFormPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [fieldType, setFieldType] = useState<NewFormField["type"]>("text");
  const [fields, setFields] = useState<NewFormField[]>([]);
  const [activePage, setActivePage] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const thumbs = usePageThumbs();
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  const reset = useCallback(() => {
    setFile(null);
    setFields([]);
    setActivePage(0);
    thumbs.clear();
    run.reset();
  }, [run, thumbs]);

  async function pick(files: AcceptedFile[]) {
    const chosen = files[0];
    if (!chosen) return;
    setFile(chosen);
    setFields([]);
    setActivePage(0);
    run.reset();
    await thumbs.load(chosen.file);
  }

  function place(event: PointerEvent<HTMLDivElement>) {
    if (busy || fields.length >= 100 || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(0.72, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(0.92, Math.max(0, (event.clientY - rect.top) / rect.height));
    const width = fieldType === "text" ? 0.26 : 0.045;
    const height = fieldType === "text" ? 0.045 : 0.045;
    setFields((current) => [
      ...current,
      {
        name: `${fieldType === "text" ? "Text" : "Check"}_${current.length + 1}`,
        type: fieldType,
        page: activePage,
        x: Math.min(x, 1 - width),
        y: Math.min(y, 1 - height),
        width,
        height,
      },
    ]);
  }

  function moveField(index: number, event: PointerEvent<HTMLButtonElement>) {
    if (busy) return;
    const container = previewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const field = fields[index];
    if (!field) return;
    const x = Math.min(1 - field.width, Math.max(0, (event.clientX - rect.left) / rect.width - field.width / 2));
    const y = Math.min(1 - field.height, Math.max(0, (event.clientY - rect.top) / rect.height - field.height / 2));
    setFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, x, y } : item));
  }

  async function create() {
    if (!file) return;
    await run.run(async (report) => [await createFillablePdf(file.file, fields, report)]);
  }

  const currentThumb = thumbs.thumbs[activePage];

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && <FileUploader kind="pdf" toolName={tool.name} onFiles={pick} onRejected={run.fail} />}
        {file && (
          <>
            <FileList files={[file]} kind="pdf" disabled={busy} status={thumbs.loading ? "Preparing pages" : `${thumbs.thumbs.length} pages`} onRemove={reset} />
            {thumbs.loading && <ProgressBar progress={{ percent: thumbs.total ? (thumbs.loaded / thumbs.total) * 100 : 5, label: "Preparing page previews" }} />}
            {thumbs.error && <ErrorMessage message={thumbs.error} onStartOver={reset} />}
            {currentThumb && !thumbs.loading && (
              <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <section className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-ink-900 dark:text-white">Page {activePage + 1} — tap to place a field</h2>
                    <div className="flex gap-2" role="group" aria-label="Choose field type">
                      <button type="button" aria-pressed={fieldType === "text"} onClick={() => setFieldType("text")} className={button(fieldType === "text" ? "primary" : "secondary", "sm")}>Text box</button>
                      <button type="button" aria-pressed={fieldType === "checkbox"} onClick={() => setFieldType("checkbox")} className={button(fieldType === "checkbox" ? "primary" : "secondary", "sm")}>Checkbox</button>
                    </div>
                  </div>
                  <p className={`mt-1 text-xs ${muted}`}>Place fields where readers should enter information. Drag a field to adjust its position.</p>
                  <div
                    ref={previewRef}
                    className="relative mx-auto mt-3 w-full max-w-2xl touch-none select-none overflow-hidden rounded-xl bg-white shadow ring-1 ring-ink-200 dark:ring-ink-700"
                    style={{ aspectRatio: `${currentThumb.width} / ${currentThumb.height}` }}
                    onPointerDown={place}
                  >
                    <img src={currentThumb.url} alt={`PDF page ${activePage + 1}`} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
                    {fields.map((field, index) => field.page === activePage && (
                      <button
                        type="button"
                        key={field.name}
                        aria-label={`${field.type} field ${field.name}, drag to move`}
                        onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }}
                        onPointerMove={(event) => { if (event.buttons === 1) { event.stopPropagation(); moveField(index, event); } }}
                        onPointerUp={(event) => { event.stopPropagation(); }}
                        onClick={(event) => event.stopPropagation()}
                        className={`absolute flex touch-none items-center justify-center overflow-hidden rounded-sm border-2 border-brand-600 bg-brand-200/50 px-1 text-[9px] font-semibold text-brand-950 dark:border-brand-300 dark:bg-brand-300/35 dark:text-white ${field.type === "checkbox" ? "aspect-square" : ""}`}
                        style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%` }}
                      >
                        {field.type === "checkbox" ? "✓" : field.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {thumbs.thumbs.map((thumb, index) => (
                      <button type="button" key={thumb.pageNumber} onClick={() => setActivePage(index)} aria-current={activePage === index ? "page" : undefined} className={`rounded-lg p-1 ring-2 ${activePage === index ? "ring-brand-500" : "ring-transparent"}`}>
                        <img src={thumb.url} alt={`Select page ${thumb.pageNumber}`} className="h-16 w-12 rounded object-contain" />
                        <span className="block text-center text-[10px] text-ink-500">{thumb.pageNumber}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <aside className="rounded-xl bg-ink-50 p-4 dark:bg-ink-950">
                  <h2 className="text-sm font-semibold text-ink-900 dark:text-white">Fields ({fields.length}/100)</h2>
                  {fields.length === 0 ? <p className={`mt-2 text-sm ${muted}`}>Place your first field on the page.</p> : (
                    <ul className="mt-3 space-y-2">
                      {fields.map((field, index) => (
                        <li key={field.name} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
                          <button type="button" onClick={() => setActivePage(field.page)} className="min-w-0 flex-1 truncate text-left text-ink-800 dark:text-ink-200">{field.name} · p.{field.page + 1}</button>
                          <button type="button" aria-label={`Remove ${field.name}`} onClick={() => setFields((current) => current.filter((_, i) => i !== index))} className="rounded px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>
              </div>
            )}
            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}
            {run.status === "error" && <ErrorMessage message={run.error ?? undefined} onRetry={fields.length ? create : undefined} onStartOver={reset} />}
            {run.status !== "done" && (
              <button type="button" disabled={busy || fields.length === 0 || fields.length > 100} onClick={() => void create()} className={button("primary", "lg")}>
                Create fillable PDF
              </button>
            )}
            {run.status === "done" && run.results.length > 0 && (
              <SuccessPanel title="Fillable PDF created" results={run.results} toolName={tool.name} onStartOver={reset} startOverLabel="Create Another Form" stats={[{ label: "Fields created", value: String(fields.length), highlight: true }]} />
            )}
          </>
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>Turn a flat PDF into an interactive form. Upload a page, choose text box or checkbox, then click the preview where the field belongs. Add fields across pages and download a PDF readers can fill in common PDF apps.</p>
      <p>Field creation is processed in your browser. This tool currently supports text fields and checkboxes, with a limit of 100 fields per document.</p>
    </>
  );
}
