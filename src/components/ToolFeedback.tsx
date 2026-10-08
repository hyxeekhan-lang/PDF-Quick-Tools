import { AlertIcon, CheckIcon, DownloadIcon, PdfFileIcon } from "./Icons";
import { button, cx } from "./ui";
import { toolEvents } from "#/lib/analytics";
import { formatBytes, triggerDownload, type ResultFile } from "#/lib/files";
import type { Progress } from "#/hooks/useToolRun";
export type { ResultFile };

export function ProgressBar({
  progress,
  onCancel,
}: {
  progress: Progress;
  /** Shown as a Cancel button when supplied, so a long job is never a dead end. */
  onCancel?: () => void;
}) {
  return (
    <div
      className="rounded-2xl bg-brand-50 px-5 py-5 ring-1 ring-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/25"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
          {progress.label || "Processing your PDF..."}
        </p>
        <p className="text-sm font-semibold text-brand-700 tabular-nums dark:text-brand-300">
          {progress.percent}%
        </p>
      </div>
      <div
        className="progress-track mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/50"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Processing progress"
      >
        <div
          className="progress-fill h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-400"
          style={{ width: `${Math.max(progress.percent, 4)}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs font-medium text-brand-700 dark:text-brand-300">
          <span className="document-scanner" aria-hidden="true"><PdfFileIcon className="h-7 w-7" /></span>
          <span>Scanning and preparing your document</span>
        </div>
        {/* A big file can take a while, and an unresponsive page reads as a
            broken one. Cancelling stops at the next progress report. */}
        {onCancel && (
          <button type="button" onClick={onCancel} className={button("secondary", "sm")}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorMessage({
  message,
  onRetry,
  onStartOver,
  retryLabel = "Try Again",
}: {
  message: string;
  onRetry?: () => void;
  onStartOver?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="animate-shake rounded-2xl bg-red-50 px-5 py-5 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-900/60"
      role="alert"
    >
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0 text-red-600 dark:text-red-400">
          <AlertIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
            That did not work
          </p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">{message}</p>
          {(onRetry || onStartOver) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <button type="button" onClick={onRetry} className={button("primary", "sm")}>
                  {retryLabel}
                </button>
              )}
              {onStartOver && (
                <button
                  type="button"
                  onClick={onStartOver}
                  className={button("secondary", "sm")}
                >
                  Start Over
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-bounce-in flex flex-col items-center rounded-2xl border border-dashed border-ink-300 px-6 py-10 text-center dark:border-ink-700">
      <span className="animate-float flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
        <PdfFileIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-semibold text-ink-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-600 dark:text-ink-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface ResultStat {
  label: string;
  value: string;
  highlight?: boolean;
}

export function SuccessPanel({
  title,
  stats,
  results,
  toolName,
  onStartOver,
  startOverLabel,
  note,
}: {
  title: string;
  stats?: ResultStat[];
  results: ResultFile[];
  toolName: string;
  onStartOver: () => void;
  startOverLabel: string;
  note?: string;
}) {
  const many = results.length > 1;

  function download(result: ResultFile) {
    toolEvents.downloaded(toolName);
    triggerDownload(result);
  }

  return (
    <div
      className="animate-bounce-in rounded-2xl bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900/60"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white animate-scale-in">
          <CheckIcon className="h-4.5 w-4.5 success-check" />
        </span>
        <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
          {title}
        </p>
      </div>

      {stats && stats.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/80 px-3 py-2.5 dark:bg-ink-900/60"
            >
              <dt className="text-xs font-medium text-ink-500 dark:text-ink-400">
                {stat.label}
              </dt>
              <dd
                className={cx(
                  "mt-0.5 text-base font-bold tabular-nums",
                  stat.highlight
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-ink-900 dark:text-white",
                )}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {note && (
        <p className="mt-3 text-xs text-emerald-800/90 dark:text-emerald-300/80">{note}</p>
      )}

      {many ? (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((result) => (
            <li
              key={result.url}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 dark:bg-ink-900"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">
                  {result.filename}
                </span>
                <span className="block text-xs text-ink-500">
                  {formatBytes(result.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => download(result)}
                className={button("primary", "sm", "min-h-10")}
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {!many && results[0] && (
          <button
            type="button"
            onClick={() => download(results[0])}
            className={button("primary", "lg")}
          >
            <DownloadIcon className="h-5 w-5" />
            Download {results[0].filename.endsWith(".pdf") ? "PDF" : "File"}
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver}
          className={button("secondary", many ? "md" : "lg")}
        >
          {startOverLabel}
        </button>
      </div>
    </div>
  );
}
