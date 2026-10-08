import { useNavigate } from "@tanstack/react-router";
import { useCallback, useId, useRef, useState } from "react";
import { navEvents } from "#/lib/analytics";
import { PDF_ACCEPT, validateFile } from "#/lib/files";
import { setPendingFile } from "#/lib/pendingFile";
import { MAX_FILE_LABEL } from "#/lib/site";
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
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const handle = useCallback(
    (file: File) => {
      setError(null);

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const problem = validateFile(file, "pdf");
        if (problem) {
          setError(problem);
          return;
        }
        // Compress is the single most common reason someone opens a PDF tool,
        // so a bare PDF goes there. Anything else is offered the choice below.
        navEvents.heroDrop(file.size);
        setPendingFile(file, "/compress-pdf");
        navigate({ to: "/compress-pdf" });
        return;
      }

      if (file.type.startsWith("image/")) {
        if (file.size > 50 * 1024 * 1024) {
          setError(
            `"${file.name}" is too large. The limit is ${MAX_FILE_LABEL} per file.`,
          );
          return;
        }
        navEvents.heroDrop(file.size);
        setPendingFile(file, "/jpg-to-pdf");
        navigate({ to: "/jpg-to-pdf" });
        return;
      }

      setError(
        "Drop a PDF or an image. For Word, Excel and PowerPoint files, open the matching converter from All Tools.",
      );
    },
    [navigate],
  );

  return (
    <div className="mt-8">
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
          "rounded-2xl border-2 border-dashed p-4 transition-colors sm:p-5",
          dragging
            ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-600/10"
            : "border-ink-200 bg-white/60 dark:border-ink-700 dark:bg-ink-900/40",
        )}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left">
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
            accept={PDF_ACCEPT}
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

      {/* Rotates through the popular tools so the dropzone is not the only way
          in — some visitors arrive knowing the job, not the file. */}
      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center text-xs text-ink-500 sm:justify-start dark:text-ink-400">
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
  { href: "/jpg-to-pdf", label: "Images to PDF" },
  { href: "/watermark-pdf", label: "Watermark" },
] as const;