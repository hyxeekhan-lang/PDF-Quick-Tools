import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, DownloadIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { button } from "#/components/ui";
import { toolEvents } from "#/lib/analytics";
import { formatBytes, PDF_ACCEPT, triggerDownload, validateFile } from "#/lib/files";
import { compressPdf } from "#/lib/operations";
import { MAX_FILE_LABEL } from "#/lib/site";

/**
 * Compress a PDF without leaving the homepage.
 *
 * The problem picker above routes a visitor to a tool page, where they then
 * have to pick their file again. That second pick is where people leave: the
 * intent was already stated, the file was already in hand, and the only thing
 * left to do was make them do it again. So for the single most common job on
 * the site — shrink this file so I can email it — the job now happens here.
 *
 * It runs the same `compressPdf` the tool page runs, at the same recommended
 * level, so the number it shows is the number the tool would produce. Nothing
 * is a demo or an approximation.
 *
 * On finish it hands the file straight back. The follow-up is a link to the
 * full tool for anyone who wants a different level, and an honest caveat when
 * the text was rasterised, because a smaller file that is no longer selectable
 * is a real trade-off and this site does not hide trade-offs.
 */
export function QuickCompress() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<{
    url: string;
    size: number;
    original: number;
    method: "rasterized" | "restructured" | "unchanged";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The object URL is the one thing this component holds. Released on unmount
  // so a visitor who runs this a few times does not leak a few compressed
  // copies of their document into the tab.
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  const run = useCallback(async (picked: File) => {
    setStatus("working");
    setError(null);
    setProgress(0);
    toolEvents.started("Quick compress (homepage)");

    try {
      const outcome = await compressPdf(picked, "recommended", (percent, text) => {
        // A cancelled or replaced run must not paint over the current one —
        // compression of a large file outlives the click that started it.
        if (!alive.current) return;
        setProgress(percent);
        if (text) setLabel(text);
      });
      if (!alive.current) return;
      setResult({
        url: outcome.result.url,
        size: outcome.result.size,
        original: outcome.originalSize,
        method: outcome.method,
      });
      setStatus("done");
      toolEvents.completed("Quick compress (homepage)", 0);
    } catch (thrown) {
      if (!alive.current) return;
      setError(
        thrown instanceof Error
          ? thrown.message
          : "We could not compress that file. It may be damaged or password-protected.",
      );
      setStatus("error");
      toolEvents.failed("Quick compress (homepage)", "unknown");
    }
  }, []);

  function reset() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setFile(null);
    setStatus("idle");
    setError(null);
  }

  const saved = result ? result.original - result.size : 0;
  const percent =
    result && result.original > 0 ? Math.round((saved / result.original) * 100) : 0;
  const gotSmaller = result !== null && saved > 0;

  return (
    <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-800 dark:bg-brand-500/5">
      <div className="flex items-center gap-3">
        <ToolIconTile name="compress" size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            Or just compress it now
          </p>
          <p className="text-xs text-ink-600 dark:text-ink-400">
            Drop a PDF here and get it back smaller — no page, no signup.
          </p>
        </div>
      </div>

      {status === "idle" && (
        <>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files?.[0];
              if (!dropped) return;
              const problem = validateFile(dropped, "pdf");
              if (problem) {
                setError(problem);
                return;
              }
              setFile(dropped);
              void run(dropped);
            }}
            className="mt-4 rounded-xl border-2 border-dashed border-brand-300 bg-white/70 p-4 text-center dark:border-brand-700 dark:bg-ink-900/40"
          >
            <p className="text-xs text-ink-600 dark:text-ink-400">
              Drop a PDF (up to {MAX_FILE_LABEL}) here, or
            </p>
            <input
              ref={inputRef}
              id="quick-compress-input"
              type="file"
              accept={PDF_ACCEPT}
              className="sr-only"
              // The input is visually hidden behind the dropzone, so it is a
              // labelled form control with no visible label. Screen readers
              // announce a file input by its value and accept list, which
              // reads as "no file chosen, application/pdf" rather than as an
              // action — this name is what makes it operable. Lighthouse flags
              // it, and correctly.
              aria-label={`Choose a PDF to compress (up to ${MAX_FILE_LABEL})`}
              onChange={(event) => {
                const picked = event.target.files?.[0];
                // Cleared so re-picking the same file still fires `change`.
                event.target.value = "";
                if (!picked) return;
                const problem = validateFile(picked, "pdf");
                if (problem) {
                  setError(problem);
                  return;
                }
                setFile(picked);
                void run(picked);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`${button("primary", "sm")} mt-3`}
            >
              Choose a PDF
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </>
      )}

      {status === "working" && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-xs font-medium text-ink-700 dark:text-ink-300">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600 dark:border-ink-700" />
            {label || "Compressing…"}
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200/60 dark:bg-ink-900 dark:ring-ink-800">
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {formatBytes(result.original)} → {formatBytes(result.size)}
              </p>
              <p
                className={`text-sm font-bold ${
                  gotSmaller
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-ink-700 dark:text-ink-300"
                }`}
              >
                {gotSmaller
                  ? `${percent}% smaller — done in your browser`
                  : "Already optimised — we kept your original"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerDownload({
                  // `file` is always set by the time a result exists, but the
                  // type cannot know that — and a document named ".pdf" would
                  // otherwise produce a bare "-compressed.pdf".
                  filename: `${(file?.name ?? "document").replace(/\.pdf$/i, "")}-compressed.pdf`,
                  url: result.url,
                  size: result.size,
                });
                toolEvents.downloaded("Quick compress (homepage)");
              }}
              className={button("primary", "sm")}
            >
              <DownloadIcon className="h-4 w-4" aria-hidden="true" />
              Download
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <button
              type="button"
              onClick={reset}
              className="font-semibold text-ink-600 underline underline-offset-2 dark:text-ink-400"
            >
              Compress another
            </button>
            <Link
              to="/compress-pdf"
              className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300"
            >
              Choose a different compression level
              <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {/* The trade-off, stated. A rasterised file is smaller but its text
              is no longer selectable, and someone about to email this document
              needs to know that before they do. */}
          {result.method === "rasterized" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              This copy was redrawn as images to get smaller, so its text is no
              longer selectable. Use the full tool if you need to keep text
              searchable.
            </p>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="mt-4">
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
          <button type="button" onClick={reset} className={`${button("secondary", "sm")} mt-3`}>
            Try another file
          </button>
        </div>
      )}
    </div>
  );
}
