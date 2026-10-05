import { useCallback, useState } from "react";
import { button, cx } from "#/components/ui";
import { CheckIcon, CopyIcon, RefreshIcon, NotesIcon } from "#/components/Icons";
import { AiNotice } from "#/components/AiNotice";

export interface NotesSection {
  heading: string;
  points: string[];
  details: string;
}

export interface AiNotes {
  title: string;
  overview: string;
  sections: NotesSection[];
  summary: string;
}

interface AiNotesPanelProps {
  result: AiNotes;
  onRegenerate: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function AiNotesPanel({ result, onRegenerate, onCopy, copied }: AiNotesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <div className="animate-blur-in space-y-5">
      {/* Title & Overview */}
      <div className="rounded-2xl bg-brand-50/50 p-5 ring-1 ring-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/25">
        <h3 className="text-lg font-bold text-brand-900 dark:text-brand-200">
          {result.title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-700 dark:text-ink-300">
          {result.overview}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {result.sections.map((section, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white ring-1 ring-ink-200/80 overflow-hidden dark:bg-ink-900/70 dark:ring-ink-800"
          >
            <button
              type="button"
              onClick={() => toggleSection(i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
                  <NotesIcon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-ink-900 dark:text-white">
                  {section.heading}
                </span>
              </div>
              <svg
                className={cx(
                  "h-4 w-4 text-ink-400 transition-transform",
                  expandedSections.has(i) && "rotate-180",
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {expandedSections.has(i) && (
              <div className="border-t border-ink-100 px-5 py-4 dark:border-ink-800">
                <ul className="space-y-2">
                  {section.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[15px] text-ink-700 dark:text-ink-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
                {section.details && (
                  <p className="mt-3 text-sm text-ink-500 dark:text-ink-400 italic">
                    {section.details}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="rounded-2xl bg-ink-50 p-5 dark:bg-ink-800/50">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Summary</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
            {result.summary}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className={button("secondary", "sm")}>
          {copied ? (
            <><CheckIcon className="h-4 w-4" /> Copied!</>
          ) : (
            <><CopyIcon className="h-4 w-4" /> Copy Notes</>
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
