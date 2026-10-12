import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, CheckIcon, LightbulbIcon } from "./Icons";
import { heading, muted, sectionWrap } from "./ui";

const POINTS = [
  "The project remains on track for its planned October launch.",
  "The team resolved two major delays by reallocating review resources.",
  "The next milestone is final quality testing, scheduled for September.",
];

export function AiSummaryExample() {
  return (
    <section data-scroll-reveal aria-labelledby="summary-example-heading" className={`${sectionWrap} mt-20`}>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700/40">
            Illustrative example
          </span>
          <h2 id="summary-example-heading" className={`mt-4 ${heading.h2}`}>
            See what an AI PDF summary can look like
          </h2>
          <p className={`mt-3 ${muted}`}>
            This sample is written for demonstration only—it is not a customer
            review or the result of someone else&apos;s uploaded document.
          </p>
          <Link
            to="/ai-summarizer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Summarize your PDF
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-200/80 sm:p-8 dark:bg-ink-900 dark:ring-ink-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Sample document · Project update
          </p>
          <div className="mt-4 flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
              <LightbulbIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink-900 dark:text-white">Summary</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
                The project is on track for its October launch. Recent staffing
                changes helped resolve review delays, and final quality testing
                is the next milestone.
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-ink-100 pt-5 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
              Key points
            </h3>
            <ul className="mt-3 space-y-2.5">
              {POINTS.map((point) => (
                <li
                  key={point}
                  className="flex gap-2.5 text-sm leading-relaxed text-ink-700 dark:text-ink-300"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
