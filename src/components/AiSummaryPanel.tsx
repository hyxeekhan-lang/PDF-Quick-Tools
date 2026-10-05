import { button } from "#/components/ui";
import { CheckIcon, CopyIcon, RefreshIcon, LightbulbIcon, KeyIcon } from "#/components/Icons";
import { AiNotice } from "#/components/AiNotice";

export interface AiSummary {
  summary: string;
  keyPoints: string[];
  topics: string[];
  readingTime: string;
}

interface AiSummaryPanelProps {
  result: AiSummary;
  onRegenerate: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function AiSummaryPanel({ result, onRegenerate, onCopy, copied }: AiSummaryPanelProps) {
  return (
    <div className="animate-blur-in space-y-5">
      <div className="rounded-2xl bg-brand-50/50 p-5 ring-1 ring-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/25">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400">
            <LightbulbIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-200">Summary</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700 dark:text-ink-300">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {result.keyPoints.length > 0 && (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900/70 dark:ring-ink-800">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Key Points</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {result.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-700 dark:text-ink-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.topics.length > 0 && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900/70 dark:ring-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Main Topics</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.topics.map((topic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-brand-200/50 dark:bg-brand-600/15 dark:text-brand-300 dark:ring-brand-600/30"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.readingTime && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900/70 dark:ring-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Reading Time</h3>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {result.readingTime}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className={button("secondary", "sm")}>
          {copied ? (
            <><CheckIcon className="h-4 w-4" /> Copied!</>
          ) : (
            <><CopyIcon className="h-4 w-4" /> Copy Summary</>
          )}
        </button>
        <button type="button" onClick={onRegenerate} className={button("secondary", "sm")}>
          <RefreshIcon className="h-4 w-4" /> Regenerate
        </button>
      </div>

      <AiNotice className="mt-4" />
    </div>
  );
}
