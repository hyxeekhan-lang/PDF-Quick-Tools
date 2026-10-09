import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { button } from "#/components/ui";
import { CheckIcon } from "#/components/Icons";
import {
  CATEGORY_LABELS,
  challengeForDate,
  localDateKey,
} from "#/lib/daily-challenge";
import {
  isChallengeSkippedToday,
  markChallengeDone,
  markChallengeSkipped,
  readChallengeDone,
} from "#/lib/storage";

/**
 * One day's challenge, shown on the homepage and on its own page.
 *
 * The whole feature is deliberately unambitious: no account, no streak that
 * breaks, no reminders by default, and a skip button on everything. A daily
 * feature is where sites start charging for the privilege of continuing, and
 * that turns a useful habit into a chore with a subscription attached. There is
 * nothing here to lose, which is the only version that fits a privacy-first
 * tool site.
 *
 * Completion is recorded locally and only as a date, so the site learns nothing
 * about the visitor beyond "they came back on this day".
 */
export function DailyChallengeCard({ compact = false }: { compact?: boolean }) {
  const [challenge] = useState(() => challengeForDate());
  const [today] = useState(() => localDateKey());
  const [done, setDone] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Read after mount rather than during render: this is prerendered to static
  // HTML, where there is no localStorage to read and the challenge must render
  // identically on the server and on the client or hydration fails.
  useEffect(() => {
    setDone(readChallengeDone());
    setSkipped(isChallengeSkippedToday(today));
  }, [today]);

  const isDone = done.includes(today);
  const answered = chosen !== null;
  const correct = chosen === challenge.answer;
  const showExplanation = answered || isDone;

  function complete() {
    const { streak: count } = markChallengeDone(today);
    setDone(readChallengeDone());
    setStreak(count);
    setSkipped(false);
  }

  function skip() {
    markChallengeSkipped(today);
    setSkipped(true);
  }

  return (
    <div
      className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700"
      aria-labelledby="daily-challenge-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          Daily challenge
        </p>
        {streak > 1 && (
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {streak} days running
          </p>
        )}
      </div>

      <h3
        id="daily-challenge-heading"
        className="mt-2 text-base font-semibold text-ink-900 dark:text-white"
      >
        {challenge.title}
      </h3>

      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
        {CATEGORY_LABELS[challenge.category]}
      </p>

      {skipped && !isDone ? (
        <>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            Skipped for today. It comes back tomorrow, and there is nothing to keep
            track of if you would rather not.
          </p>
          <button
            type="button"
            onClick={() => setSkipped(false)}
            className="mt-3 text-sm font-medium text-ink-500 underline underline-offset-2 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
          >
            Show it anyway
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
            {challenge.body}
          </p>

          {challenge.kind === "quiz" && challenge.options && !showExplanation && (
            <div className="mt-4 space-y-2">
              {challenge.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChosen(option.id)}
                  className="block w-full rounded-xl bg-ink-50 px-4 py-2.5 text-left text-sm text-ink-700 ring-1 ring-ink-200 transition-colors hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-brand-600/10 dark:hover:text-brand-300 dark:hover:ring-brand-600/30"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {showExplanation && (
            <div className="mt-4 rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-200 dark:bg-ink-800 dark:ring-ink-700">
              {answered && (
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  {correct ? "Correct." : "Not quite."}
                </p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {challenge.explanation}
              </p>
              {challenge.kind === "quiz" && challenge.options && (
                <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                  {challenge.options
                    .filter((option) => option.id === challenge.answer)
                    .map((option) => option.note)
                    .join(" ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {challenge.href && (
              <Link to={challenge.href} className={button("primary", "sm")}>
                {challenge.hrefLabel ?? "Open the tool"}
              </Link>
            )}

            {isDone ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckIcon className="h-4 w-4" />
                Done for today
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  complete();
                  setExpanded(true);
                }}
                className={button("secondary", "sm")}
              >
                <CheckIcon className="h-4 w-4" />
                Mark as done
              </button>
            )}

            {!isDone && (
              <button
                type="button"
                onClick={skip}
                className="text-sm text-ink-500 underline underline-offset-2 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
              >
                Skip today
              </button>
            )}
          </div>

          {expanded && !isDone && challenge.kind !== "quiz" && (
            <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              {challenge.explanation}
            </p>
          )}
        </>
      )}

      {!compact && (
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-500 dark:border-ink-800 dark:text-ink-400">
          One a day, chosen by the date. No sign-up, no streak to lose — if you
          skip a day nothing happens. Only the date is remembered, and only in this
          browser.{" "}
          {/* A plain anchor, not a typed Link: the challenge archive is a page
              of the site rather than a tool, so it is deliberately absent from
              the ToolHref union the router types its destinations against. */}
          <a href="/daily-challenge" className="underline underline-offset-2">
            See the archive
          </a>
        </p>
      )}
    </div>
  );
}