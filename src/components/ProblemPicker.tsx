import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRightIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { heading, muted, sectionWrap } from "#/components/ui";
import { navEvents } from "#/lib/analytics";
import { QuickCompress } from "#/components/QuickCompress";
import { TOOLS, type ToolHref } from "#/lib/tools";

/**
 * "What are you trying to do?" — the picker above the tool grid.
 *
 * The tool catalogue is organised by *tool* (Compress PDF, Merge PDF), but
 * nobody arrives on a PDF site thinking in tool names. They arrive with a
 * problem: "this file is too big to email", "I have six scans to put into one
 * document". So this section asks the question in the visitor's own words and
 * routes each answer to the one tool that does it.
 *
 * Two reasons this is the highest-value thing on the homepage rather than
 * another marketing band:
 *
 *  - It is the only homepage section that answers "which of your 55 tools do I
 *    want?". Everything above it (hero, stats) explains *what the site is*;
 *    this one starts the actual task.
 *  - It is honest. Every option is phrased as a job, not as a benefit, and
 *    each one routes to a tool that genuinely does exactly that — no vague
 *    "boost your productivity" filler that goes nowhere.
 *
 * The route is looked up in TOOLS rather than hardcoded, so if a tool is ever
 * renamed the tile's blurb follows it and a typo'd href cannot survive.
 */

/** A task as a visitor would describe it, not as a tool is named. */
interface Task {
  /** The visitor's own phrasing — lower case, no tool jargon. */
  problem: string;
  /** Optional second line: when this is the right answer, and when it isn't. */
  note?: string;
  href: ToolHref;
}

const TASKS: Task[] = [
  {
    problem: "Make my PDF smaller so I can email it",
    note: "Usually 60–80% off a text or scanned document.",
    href: "/compress-pdf",
  },
  {
    problem: "Put several PDFs into one document",
    href: "/merge-pdf",
  },
  {
    problem: "Keep only the pages I need",
    note: "Pull a section out as a new PDF, or drop the rest.",
    href: "/extract-pdf-pages",
  },
  {
    problem: "Remove a password I can't get past",
    note: "Works when you know the current password.",
    href: "/unlock-pdf",
  },
  {
    problem: "Sign a document without printing it",
    href: "/sign-pdf",
  },
  {
    problem: "Hide something for good, not just cover it up",
    note: "Real redaction — the text is removed, not boxed over.",
    href: "/redact-pdf",
  },
  {
    problem: "Turn a PDF into something I can edit",
    note: "Word, Excel, JPG or PNG.",
    href: "/pdf-to-word",
  },
  {
    problem: "Add a scanned page to a document",
    note: "Run OCR first to make the scan searchable and selectable.",
    href: "/ocr-pdf",
  },
  {
    problem: "Check what's in a long PDF",
    note: "Ask questions in plain language, or get a summary.",
    href: "/ai-ask-pdf",
  },
];

export function ProblemPicker() {
  const [active, setActive] = useState(0);

  // Deriving the href's tool from the catalogue rather than repeating its name
  // and blurb here means the tile can never describe a tool that no longer
  // says that. An href that is not in TOOLS would render null, which is the
  // correct outcome: the task simply does not appear.
  const tasks = useMemo(
    () =>
      TASKS.map((task) => ({ ...task, tool: TOOLS.find((t) => t.href === task.href) })).filter(
        (task) => task.tool,
      ),
    [],
  );

  const selected = tasks[active]?.tool;

  return (
    <section aria-labelledby="picker-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="picker-heading" className={heading.h2}>
          What are you trying to do?
        </h2>
        <p className={`mt-2.5 ${muted}`}>
          Pick the problem, not the tool. We will take you to the one tool that
          solves it.
        </p>
      </div>

      {/* The list is a tablist: each option selects the detail panel beside it,
          which names the tool that will open and links straight to it. Announced
          as tabs because that is exactly what it is — one panel, many triggers.
          A list of links would imply nine destinations and land the visitor back
          where they started, which is the problem this section exists to fix. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-8">
        <ul
          role="tablist"
          aria-label="Common PDF problems"
          aria-orientation="vertical"
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1"
          onKeyDown={(event) => {
            // Roving selection: up/down move between options, and only the
            // active one is in the tab order, so Tab leaves the group rather
            // than walking nine stops.
            const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const last = tasks.length - 1;
            setActive((current) => {
              if (event.key === "Home") return 0;
              if (event.key === "End") return last;
              const next = event.key === "ArrowDown" ? current + 1 : current - 1;
              return next < 0 ? last : next > last ? 0 : next;
            });
          }}
        >
          {tasks.map((task, index) => {
            const isActive = index === active;
            return (
              <li key={task.href} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`picker-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="picker-panel"
                  // Only the selected tab is tabbable (roving tabindex).
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    setActive(index);
                    // The click is the thing worth measuring — it is the
                    // homepage's main "which tool do I want" event, and it is
                    // the top of a funnel that previously started at the
                    // tool page itself.
                    navEvents.cta("problem-picker", task.problem);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-brand-400 bg-brand-50/70 shadow-sm shadow-brand-500/10 dark:border-brand-600 dark:bg-brand-600/10"
                      : "border-ink-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm dark:border-ink-800 dark:bg-ink-900/40 dark:hover:border-brand-700"
                  }`}
                >
                  <ToolIconTile
                    name={task.tool!.icon}
                    size="sm"
                    className={isActive ? "" : "opacity-80 saturate-50"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                      {task.problem}
                    </span>
                    {task.note ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                        {task.note}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRightIcon
                    className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                      isActive
                        ? "translate-x-0.5 text-brand-600 dark:text-brand-400"
                        : "-translate-x-1 text-ink-300 opacity-0 dark:text-ink-700"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {/* The detail panel. Rendered from the catalogue so the blurb is the
            tool's own, and shown on desktop; on small screens the same link is
            rendered under the list so it is never stranded off-screen. */}
        <div
          role="tabpanel"
          id="picker-panel"
          aria-labelledby={`picker-tab-${active}`}
          className="hidden lg:block"
        >
          <div className="sticky top-24 rounded-3xl bg-white p-7 ring-1 ring-ink-200/80 shadow-sm dark:bg-ink-900 dark:ring-ink-800">
            {selected ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Recommended tool
                </p>
                <div className="mt-4 flex items-center gap-3.5">
                  <ToolIconTile name={selected.icon} size="lg" />
                  <h3 className="text-xl font-bold text-ink-900 dark:text-white">
                    {selected.name}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                  {selected.blurb} {selected.subtitle}
                </p>
                <Link
                  to={selected.href}
                  onClick={() => navEvents.cta("problem-picker-panel", selected.name)}
                  className="btn-press mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:from-brand-500 hover:to-brand-600 dark:from-brand-500 dark:to-brand-600"
                >
                  Open {selected.name}
                  <ArrowRightIcon className="h-4 w-4 transition-transform hover:translate-x-0.5" />
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* The one task worth finishing without a page load. Compressing is the
          single most common reason the site is opened, and it is the one job
          where "see the result" is cheaper than "go and find the tool" — so
          that task is done here, in place, and everything else keeps routing. */}
      <QuickCompress />

      {/* Mobile: the panel would sit off to the right of a two-column grid, so
          it is repeated below the options as a plain link. Same destination,
          same event, just laid out for one column. */}
      {selected ? (
        <div className="mt-6 lg:hidden">
          <Link
            to={selected.href}
            onClick={() => navEvents.cta("problem-picker-panel", selected.name)}
            className="btn-press flex items-center gap-3.5 rounded-2xl border border-brand-300 bg-brand-50/60 p-4 dark:border-brand-700 dark:bg-brand-600/10"
          >
            <ToolIconTile name={selected.icon} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Recommended tool
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-ink-900 dark:text-white">
                {selected.name}
              </span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
