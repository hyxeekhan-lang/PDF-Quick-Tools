import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isFavourite, toggleFavourite } from "#/lib/storage";
import type { Tool } from "#/lib/tools";
import { ArrowRightIcon } from "./Icons";
import { ToolIconTile } from "./ToolIconTile";

/**
 * The star on a tool card.
 *
 * Kept inside the card's own stacking rather than as a sibling overlay so the
 * `before:absolute before:inset-0` link underneath cannot swallow the click —
 * the whole card is a link to the tool, and without the star lifting above it
 * this button would be unreachable.
 *
 * It stores only the tool's route. Nothing about the tool's use, and nothing
 * about any document.
 */
function StarButton({ href }: { href: string }) {
  const [starred, setStarred] = useState(false);

  // Read after mount, not during render: this card is prerendered on every
  // tool page and category hub, and localStorage is not there during that.
  useEffect(() => {
    setStarred(isFavourite(href));
  }, [href]);

  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={starred ? "Remove from your tools" : "Add to your tools"}
      onClick={(event) => {
        // Without this the click navigates to the tool, because the card is a
        // link and the button sits inside it.
        event.preventDefault();
        event.stopPropagation();
        setStarred(toggleFavourite(href).includes(href));
      }}
      className="relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-ink-100 hover:text-amber-500 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-amber-400"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.5 3.5a1 1 0 0 1 1.9 0l2.3 5.2 5.6.6a1 1 0 0 1 .6 1.8l-4.2 3.7 1.2 5.5a1 1 0 0 1-1.5 1.1L12 18.6l-4.9 2.8a1 1 0 0 1-1.5-1.1l1.2-5.5L2.6 11a1 1 0 0 1 .6-1.8l5.6-.6 2.3-5.2z"
        />
      </svg>
    </button>
  );
}

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="tool-card-motion group relative flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-ink-200/80 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-600/10 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:shadow-black/30 dark:hover:ring-brand-600/60 hover-lift card-glow">
      <div className="flex items-start justify-between gap-3">
        <ToolIconTile
          name={tool.icon}
          size="lg"
          className="transition-transform duration-200 group-hover:scale-105"
        />
        <StarButton href={tool.href} />
      </div>

      <h3 className="mt-5 text-base font-semibold text-ink-900 dark:text-white">
        <Link to={tool.href} className="before:absolute before:inset-0 before:content-['']">
          {tool.name}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{tool.blurb}</p>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-all duration-150 group-hover:gap-2.5 dark:text-brand-300">
        Use Tool
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
      </span>
    </div>
  );
}
