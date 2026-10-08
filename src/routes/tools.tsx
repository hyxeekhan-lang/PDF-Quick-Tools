import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { CloseIcon, SearchIcon } from "#/components/Icons";
import { ToolCard } from "#/components/ToolCard";
import { AdSlot } from "#/components/AdSlot";
import { EmptyState } from "#/components/ToolFeedback";
import { button, cx, heading, muted, sectionWrap } from "#/components/ui";
import { navEvents } from "#/lib/analytics";
import { pageHead } from "#/lib/seo";
import { SITE_NAME } from "#/lib/site";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "#/lib/tools";

export const Route = createFileRoute("/tools")({
  head: () =>
    pageHead({
      title: `All PDF Tools — Compress, Merge, Split and Convert | ${SITE_NAME}`,
      description:
        "Every free PDF tool in one place: compress, merge, split, rotate, watermark, sign, delete pages, add page numbers, extract pages, PDF to JPG and JPG to PDF. No account needed.",
      path: "/tools",
    }),
  component: AllTools,
});

const CATEGORY_BLURBS: Record<string, string> = {
  "AI Tools": "Translate, rewrite, analyze, chat with, quiz and study your PDFs using AI.",
  "Organize PDF": "Rearrange, trim and fix the pages inside a document.",
  "Edit PDF": "Sign, watermark, crop, resize and lock the pages of a document.",
  Convert: "Move between PDF, image and plain text formats.",
  Optimize: "Make a file smaller or cleaner without leaving the browser.",
  "PDF security": "Protect documents with passwords and remove known locks.",
};

/**
 * Each category's own landing page. `/pdf-editor` rather than `/edit-pdf`,
 * because that path is already the Edit PDF text tool.
 */
const CATEGORY_HUB_PATHS: Partial<Record<ToolCategory, string>> = {
  "Organize PDF": "/organize-pdf",
  "Edit PDF": "/pdf-editor",
  Convert: "/convert-pdf",
  Optimize: "/optimize-pdf",
  "PDF security": "/pdf-security",
  "AI Tools": "/ai-pdf-tools",
};

function AllTools() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");
  const searchId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleTools = useMemo(
    () =>
      TOOLS.filter((tool) => {
        const inCategory = category === "All" || tool.category === category;
        const haystack = `${tool.name} ${tool.blurb} ${tool.category}`.toLocaleLowerCase();
        return inCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
      }),
    [category, normalizedQuery],
  );
  const hasFilters = category !== "All" || query.trim().length > 0;

  return (
    <div className={`${sectionWrap} py-12 sm:py-16`}>
      <header className="max-w-2xl animate-slide-in-left">
        <h1 className={heading.h1}>All PDF Tools</h1>
        <p className={`mt-3 text-lg ${muted}`}>
          {TOOLS.length} tools for the everyday PDF jobs. Every one of them runs
          in your browser, needs no account, and hands the file straight back to
          you.
        </p>
      </header>

      <section aria-label="Find a tool" className="mt-10 rounded-3xl bg-ink-50 p-4 ring-1 ring-ink-200/80 sm:p-5 dark:bg-ink-900/50 dark:ring-ink-800">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            Search PDF tools
          </label>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              navEvents.toolsSearch(event.target.value);
            }}
            placeholder="Search tools, for example: merge, number, image..."
            className="w-full rounded-2xl bg-white py-3.5 pl-12 pr-12 text-base text-ink-900 ring-1 ring-ink-200 outline-none transition focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-white"
              aria-label="Clear tool search"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter tools by category">
          {(["All", ...TOOL_CATEGORIES] as const).map((item) => {
            const active = item === category;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={active}
                className={cx(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                    : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-brand-50 hover:text-brand-700 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-brand-600/15 dark:hover:text-brand-300",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400" aria-live="polite">
          {visibleTools.length} {visibleTools.length === 1 ? "tool" : "tools"} found
          {category !== "All" ? ` in ${category}` : ""}.
        </p>
      </section>

      {TOOL_CATEGORIES.map((currentCategory, index) => {
        const tools = visibleTools.filter((tool) => tool.category === currentCategory);
        if (tools.length === 0) return null;
        return (
          <section
            key={currentCategory}
            aria-labelledby={`cat-${index}`}
            className="mt-12 first:mt-14"
          >
            <h2 id={`cat-${index}`} className={heading.h2}>
              {CATEGORY_HUB_PATHS[currentCategory] ? (
                /* Each category heading links to that category's own page, so
                   the head term ("organize pdf", "convert pdf") has a landing
                   page rather than depending on this index for its ranking. */
                <Link
                  to={CATEGORY_HUB_PATHS[currentCategory]}
                  className="hover:text-brand-700 dark:hover:text-brand-300"
                >
                  {currentCategory}
                </Link>
              ) : (
                currentCategory
              )}
            </h2>
            <p className={`mt-1.5 ${muted}`}>{CATEGORY_BLURBS[currentCategory]}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-bounce">
              {tools.map((tool) => (
                <li key={tool.href}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      
      {visibleTools.length === 0 && (
        <div className="mt-12">
          <EmptyState
            title="No matching tool yet"
            body="Try a broader search or reset the current category filter."
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                  className={button("secondary", "sm")}
                >
                  Reset filters
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      <AdSlot format="fluid" />

      <section className="rounded-2xl bg-ink-50 p-6 sm:p-8 dark:bg-ink-900/50 animate-blur-in">
        <h2 className={heading.h3}>Cannot find what you need?</h2>
        <p className={`mt-2 max-w-2xl text-sm ${muted}`}>
          We would rather build eight tools that work every time than fifty that
          mostly do. If there is a PDF job you keep doing by hand, tell us what it
          is and it goes on the list.
        </p>
      </section>
    </div>
  );
}
