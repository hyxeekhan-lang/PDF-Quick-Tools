import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRightIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { navEvents } from "#/lib/analytics";
import { noteToolVisit, readFavourites, readRecent } from "#/lib/storage";
import { TOOLS } from "#/lib/tools";

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
 * Nothing about a document is stored. Only which tool was opened — see
 * `#/lib/storage` for why that rule is load-bearing.
 */
export function MyToolsBar() {
  const [mounted, setMounted] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  // localStorage does not exist during the prerender, so the lists start empty
  // and fill in after mount. Without this the section would render as a
  // populated-but-different layout on the server than on the client.
  useEffect(() => {
    setMounted(true);
    setFavourites(readFavourites());
    setRecent(readRecent());
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
    <section aria-labelledby="my-tools-heading" className="mt-16">
      {favouriteTools.length > 0 && (
        <Row
          id="my-tools-heading"
          title="Your tools"
          hint="The ones you starred. Open these and you are done in two clicks."
          tools={favouriteTools}
          onOpen={() => navEvents.cta("my_tools", "favourite")}
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
    </section>
  );
}

function Row({
  id,
  title,
  hint,
  tools,
  onOpen,
}: {
  id: string;
  title: string;
  hint: string;
  tools: Array<(typeof TOOLS)[number]>;
  onOpen: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-xl font-bold tracking-tight text-ink-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{hint}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.href}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Records that a tool was opened.
 *
 * Called from tool pages on mount, so the recent list fills up from actual use
 * rather than from clicks on a homepage link. No-ops outside the browser.
 */
export function useNoteVisit(href: string): void {
  useEffect(() => {
    noteToolVisit(href);
  }, [href]);
}
