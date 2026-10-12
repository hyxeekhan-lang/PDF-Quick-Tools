import { heading } from "./ui";

export interface HowToStep {
  title: string;
  body: string;
}

/**
 * The numbered walkthrough under a tool.
 *
 * This is the single highest-value block for content guidelines. A tool page
 * that is only a drop zone is a thin page however good the tool is; the steps
 * are original explanatory text written for that specific tool, which is what
 * makes the page worth ranking and worth showing an ad beside.
 *
 * Rendered as an ordered list so the markup is real steps rather than styled
 * divs, and given a HowTo JSON-LD twin on the tool pages.
 */
export function HowTo({ toolName, steps }: { toolName: string; steps: HowToStep[] }) {
  if (steps.length === 0) return null;

  return (
    <section aria-labelledby="how-to-heading" className="mt-12">
      <h2 id="how-to-heading" className={heading.h2}>
        {/* "How to {toolName}" read as "How to AI Summarizer" — the tool name is
            a noun phrase, so the sentence needs the verb. It now reads "How to
            use AI Summarizer" on every tool page. */}
        How to use {toolName}
      </h2>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3.5">
            {/* The counter is a real list number underneath, so screen readers
                announce "1 of 4" correctly. This circle is decoration. */}
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-700 dark:bg-brand-600/15 dark:text-brand-300"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-[15px] font-semibold text-ink-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
