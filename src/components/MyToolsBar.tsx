import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon, CloseIcon, StarIcon, TrashIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { navEvents } from "#/lib/analytics";
import {
  clearAllTools,
  clearRecent,
  noteToolVisit,
  readFavourites,
  readRecent,
  removeFavourite,
} from "#/lib/storage";
import { TOOLS } from "#/lib/tools";
import { sectionWrap } from "#/components/ui";

/**
 * "Your tools" — the bar that makes a visitor's second visit faster than
 * their first.
 *
 * Two lists, both read from local storage and both made only of tool route
 * paths:
 *
 *  - Starred tools. Favourites are explicit, so they come first. The star sits
 *    on every tool card in the grid below.
 *  - Recently opened tools. What you starred is what you meant to keep; this is
 *    just where you happened to be ten minutes ago. It fills the gap on a
 *    visitor's first visit, before they have starred anything.
 *
 * Both hide entirely when empty. An empty "Your tools" heading with nothing
 * under it is worse than no section, so first-time visitors see nothing at all
 * rather than a placeholder — which also means the section cannot hurt the page
 * for the majority of visits where it has nothing to say.
 *
 * ## What the visitor can do about it
 *
 * Anything recorded here has to be removable, or "your tools" becomes a
 * record the visitor did not agree to keep. So each entry has an × to drop it,
 * each row has a way to clear itself, and both sit next to a notice saying
 * where the list lives and what is not in it. The removals are immediate and
 * unconfirmed — a dialog asking "are you sure?" about un-starring a tool is
 * friction in the way of a two-click undo the visitor already has.
 *
 * Nothing about a document is stored. Only which tool was opened — see
 * `#/lib/storage` for why that rule is load-bearing.
 */
export function MyToolsBar() {
  const [mounted, setMounted] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [managing, setManaging] = useState(false);

  // localStorage does not exist during the prerender, so the lists start empty
  // and fill in after mount. Without this the section would render as a
  // populated-but-different layout on the server than on the client.
  useEffect(() => {
    setMounted(true);
    setFavourites(readFavourites());
    setRecent(readRecent());
  }, []);

  const drop = useCallback((href: string) => {
    setFavourites(removeFavourite(href));
  }, []);

  const emptyRecent = useCallback(() => {
    clearRecent();
    setRecent([]);
  }, []);

  const emptyEverything = useCallback(() => {
    clearAllTools();
    setFavourites([]);
    setRecent([]);
  }, []);

  if (!mounted) return null;

  const favouriteTools = favourites
    .map((href) => TOOLS.find((tool) => tool.href === href))
    .filter((tool) => tool !== undefined);
  // Recent entries are only shown when they are not already starred — showing
  // the same tool twice in one bar reads as a bug.
  const recentTools = recent
    .filter((href) => !favourites.includes(href))
    .map((href) => TOOLS.find((tool) => tool.href === href))
    .filter((tool) => tool !== undefined);

  if (favouriteTools.length === 0 && recentTools.length === 0) return null;

  return (
    /* sectionWrap, like every other section on the page. Without it this
       renders full-bleed and its cards run to the screen edges while the rest
       of the page stays inside the container — the misalignment is the first
       thing the eye catches. */
    <section aria-labelledby="my-tools-heading" className={`${sectionWrap} mt-16`}>
      {favouriteTools.length > 0 && (
        <Row
          id="my-tools-heading"
          title="Your tools"
          hint="The ones you starred. Open these and you are done in two clicks."
          tools={favouriteTools}
          onOpen={() => navEvents.cta("my_tools", "favourite")}
          managing={managing}
          onRemove={drop}
        />
      )}

      {favouriteTools.length === 0 && recentTools.length > 0 && (
        <Row
          id="my-tools-heading"
          title="Pick up where you left off"
          hint="Star a tool with the ☆ on any card and it stays here."
          tools={recentTools}
          onOpen={() => navEvents.cta("my_tools", "recent")}
        />
      )}

      {/* The management row is separate from the lists above so it can cover
          recents on its own — a visitor who wants to forget where they have
          been usually still wants the tools they starred. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-100 pt-3 dark:border-ink-800">
        <button
          type="button"
          onClick={() => setManaging((current) => !current)}
          aria-expanded={managing}
          className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          {managing ? "Done" : "Manage this list"}
        </button>

        {managing && recentTools.length > 0 && (
          <button
            type="button"
            onClick={emptyRecent}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-ink-200"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Clear recent
          </button>
        )}

        {managing && (favouriteTools.length > 0 || recentTools.length > 0) && (
          <button
            type="button"
            onClick={emptyEverything}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-ink-200"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Clear both lists
          </button>
        )}

        <p className="text-xs text-ink-500 dark:text-ink-400">
          Saved in this browser only. Never uploaded, and nothing about your
          documents or the files you opened is stored — just which tools you
          visited or starred.
        </p>
      </div>
    </section>
  );
}

function Row({
  id,
  title,
  hint,
  tools,
  onOpen,
  managing = false,
  onRemove,
}: {
  id: string;
  title: string;
  hint: string;
  tools: Array<(typeof TOOLS)[number]>;
  onOpen: () => void;
  managing?: boolean;
  onRemove?: (href: string) => void;
}) {
  return (
    <div>
      {/* Centred like every other section on the page, so the eye reads one
          column of headings rather than a run of differently-anchored ones.
          This wrapper was a two-child justify-between with one child, which is
          what left the heading pinned left against a centred grid below it. */}
      <div className="mx-auto max-w-2xl text-center">
        <div>
          <h2 id={id} className="text-xl font-bold tracking-tight text-ink-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{hint}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.href} className="relative">
            <Link
              to={tool.href}
              onClick={onOpen}
              className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-600/60"
            >
              <ToolIconTile name={tool.icon} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                  {tool.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-500 dark:text-ink-400">
                  {tool.blurb}
                </span>
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* The remove control sits outside the link rather than inside it.
                A button nested in an anchor is invalid, and worse, clicking it
                would follow the link and navigate — the opposite of removing. */}
            {managing && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(tool.href)}
                aria-label={`Remove ${tool.name} from your tools`}
                title={`Remove ${tool.name}`}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/90 p-1.5 text-ink-500 ring-1 ring-ink-200 transition hover:text-red-600 hover:ring-red-300 dark:bg-ink-800/90 dark:text-ink-400 dark:ring-ink-700 dark:hover:text-red-400"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {tools.length === 0 && (
        <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-600 dark:bg-ink-900/60 dark:text-ink-300">
          <StarIcon className="mx-auto mb-2 h-5 w-5 text-ink-400" />
          Nothing starred yet. Use the ☆ on any tool card below and it will
          appear here next visit.
        </p>
      )}
    </div>
  );
}

/**
 * Records that a tool was opened.
 *
 * Called from tool pages on mount, so the recent list fills up from actual use
 * rather than from clicks on a homepage link. No-ops outside the browser.
 *
 * This is also where the server-side count happens, and the two live together
 * deliberately: both describe the same event — a tool page was opened — and
 * hooking a second `useEffect` onto every tool route would mean two places to
 * forget when a tool is added.
 *
 * ## What is sent
 *
 * The tool's route path, and nothing else. No file, no filename, no page count,
 * no referrer, no identifier. The server keeps the path and a timestamp; the IP
 * is used to rate-limit the write and is discarded. That is what keeps the
 * privacy page's "we don't track you" accurate rather than aspirational.
 *
 * Consent is required before the request is made, and it is required *before*
 * the fetch rather than by the server: a visitor who declined should have no
 * network request going out at all, not one that arrives and is ignored.
 *
 * Failure is ignored on purpose. If the count cannot be recorded, the tool still
 * opens — nobody came here to be counted.
 */
export function useNoteVisit(href: string): void {
  useEffect(() => {
    noteToolVisit(href);

    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem("pqt-cookie-consent") !== "accepted") return;
    } catch {
      return;
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: href }),
      // The endpoint answers 204; keepalive lets the request survive the
      // visitor navigating away the instant the tool renders, which is a
      // common enough pattern that losing those counts would be noticeable.
      keepalive: true,
    }).catch(() => {
      // Uncounted is an acceptable outcome; a failed analytics write must never
      // interrupt the tool.
    });
  }, [href]);
}
