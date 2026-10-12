import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { navEvents } from "#/lib/analytics";
import { IMAGE_ACCEPT, PDF_ACCEPT, validateFile } from "#/lib/files";
import { setPendingFile } from "#/lib/pendingFile";
import { MAX_FILE_LABEL } from "#/lib/site";
import type { ToolHref } from "#/lib/tools";
import { PdfFileIcon, SearchIcon, UploadIcon } from "./Icons";
import { cx } from "./ui";

/**
 * The homepage's real file input.
 *
 * Until now the only "drop your PDF here" on the homepage was painted inside the
 * laptop mockup — a `<div>` with no input and no drop handler. A visitor who
 * arrived wanting to compress something had to click through to a tool page and
 * then pick their file, which is one extra step before anything happens and one
 * more place to lose them. This is that step, removed.
 *
 * A dropped file cannot be carried through a client-side navigation by
 * reference, so it is parked in `pendingFile` and picked up by whichever tool
 * matches the file type. Routing by type rather than by one fixed tool is the
 * whole point: an image is offered to the image converters, and a PDF to the
 * tool that suits what the visitor is most likely to want done with it.
 */
export function HeroDropzone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<File | null>(null);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    if (pendingChoice) firstChoiceRef.current?.focus();
  }, [pendingChoice]);

  const handle = useCallback(
    (file: File) => {
      setError(null);

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const problem = validateFile(file, "pdf");
        if (problem) {
          setError(problem);
          return;
        }
        setPendingChoice(file);
        return;
      }

      if (file.type.startsWith("image/")) {
        const problem = validateFile(file, "image");
        if (problem) {
          setError(problem);
          return;
        }
        setPendingChoice(file);
        return;
      }

      setError(
        "Drop a PDF or an image. For Word, Excel and PowerPoint files, open the matching converter from All Tools.",
      );
    },
    [navigate],
  );

  function openTool(href: ToolHref) {
    if (!pendingChoice) return;
    navEvents.heroDrop(pendingChoice.size);
    setPendingFile(pendingChoice, href);
    setPendingChoice(null);
    navigate({ to: href });
  }

  const isPdf =
    pendingChoice?.type === "application/pdf" ||
    pendingChoice?.name.toLowerCase().endsWith(".pdf");
  const choices: { href: ToolHref; label: string; detail: string }[] = isPdf
    ? [
        { href: "/compress-pdf", label: "Compress PDF", detail: "Make it smaller for sharing" },
      { href: "/pdf-workflow", label: "Build a PDF workflow", detail: "Combine compression and page numbering" },
      { href: "/ocr-pdf", label: "Make PDF searchable", detail: "Recognize text in a scanned PDF" },
        { href: "/pdf-to-word", label: "Convert to Word", detail: "Turn the document into an editable file" },
      ]
    : [
        { href: "/image-to-text", label: "Extract text", detail: "Scan words and copy or edit the result" },
        { href: "/jpg-to-pdf", label: "Create a PDF", detail: "Turn one or more pictures into a document" },
      ];

  return (
    <div className="relative mt-5 lg:mt-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) handle(file);
        }}
        className={cx(
          "rounded-2xl border-2 border-dashed p-3 transition-colors sm:p-4 lg:p-4",
          dragging
            ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-600/10"
            : "border-ink-200 bg-white/60 dark:border-ink-700 dark:bg-ink-900/40",
        )}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left lg:gap-2">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
          >
            <UploadIcon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <label
              htmlFor={inputId}
              className="block cursor-pointer text-sm font-semibold text-ink-900 dark:text-white"
            >
              Drop a file to get started
            </label>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              PDF or image, up to {MAX_FILE_LABEL} — no signup, and most tools
              never send it anywhere
            </p>
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handle(file);
              // Cleared so choosing the same file twice in a row still fires
              // `change` — otherwise the second pick is silently ignored.
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"
          >
            <PdfFileIcon className="h-4 w-4" />
            Choose file
          </button>
        </div>
      </div>

      {/* The error is announced rather than just shown: this fires from a drop,
          where the visitor's focus is nowhere near here. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-center text-xs text-red-600 sm:text-left dark:text-red-400"
        >
          {error}
        </p>
      )}

      {pendingChoice && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-ink-950/55 p-3 backdrop-blur-sm"
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drop-tool-choice-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPendingChoice(null);
              inputRef.current?.focus();
              return;
            }
            if (event.key !== "Tab") return;
            const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-ink-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="drop-tool-choice-title" className="text-base font-bold text-ink-900 dark:text-white">
                  What would you like to do?
                </h2>
                <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-400">
                  {pendingChoice.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingChoice(null)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Cancel
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {choices.map((choice) => (
                <button
                  key={choice.href}
                  type="button"
                  ref={choices.indexOf(choice) === 0 ? firstChoiceRef : undefined}
                  onClick={() => openTool(choice.href)}
                  className="rounded-xl bg-ink-50 px-4 py-3 text-left ring-1 ring-ink-200 transition-colors hover:bg-brand-50 hover:ring-brand-300 dark:bg-ink-950 dark:ring-ink-700 dark:hover:bg-brand-950/40"
                >
                  <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                    {choice.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">
                    {choice.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rotates through the popular tools so the dropzone is not the only way
          in — some visitors arrive knowing the job, not the file. */}
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center text-xs text-ink-500 sm:justify-start dark:text-ink-400">
        <SearchIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Or jump straight to a tool:</span>
        {POPULAR_SHORTCUTS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => navEvents.cta("hero_shortcuts", item.label)}
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {item.label}
          </a>
        ))}
      </p>
    </div>
  );
}

const POPULAR_SHORTCUTS = [
  { href: "/compress-pdf", label: "Compress" },
  { href: "/merge-pdf", label: "Merge" },
  { href: "/pdf-to-word", label: "PDF to Word" },
  { href: "/ai-summarizer", label: "AI Summary" },
] as const;