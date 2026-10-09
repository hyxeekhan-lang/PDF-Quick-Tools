import { AlertIcon } from "./Icons";

/**
 * Shown on every AI surface. AI output is generated, not verified, so the
 * wording stays factual: it may be wrong, and the user stays responsible for
 * checking anything important.
 */
export function AiNotice({
  className = "",
  tone = "panel",
  children,
}: {
  className?: string;
  tone?: "panel" | "inline";
  /**
   * Replaces the default wording. Study Mode uses this to name the document the
   * material came from — a generated page with four tabs of text and no origin
   * attached is four sets of claims with nothing to check them against.
   */
  children?: React.ReactNode;
}) {
  if (tone === "inline") {
    return (
      <p className={`flex items-start gap-2 text-xs text-ink-500 dark:text-ink-400 ${className}`}>
        <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          AI-generated results can contain mistakes. Review anything important before
          relying on it.
        </span>
      </p>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-amber-50 px-4 py-3.5 ring-1 ring-amber-200 dark:bg-amber-950/25 dark:ring-amber-900/60 ${className}`}
      role="note"
    >
      <div className="flex gap-2.5">
        <span className="mt-px shrink-0 text-amber-600 dark:text-amber-400">
          <AlertIcon className="h-4 w-4" />
        </span>
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {children ?? (
            <>
              AI-generated results can contain mistakes and may miss details in your
              document. Check anything important — names, dates, figures and
              citations — against the original before relying on it.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
