import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { navEvents } from "#/lib/analytics";
import { BoltIcon, SearchIcon } from "./Icons";

/**
 * A short bar that appears once the hero has scrolled away, offering the two
 * things a visitor who has not found what they want actually needs: search, and
 * the most common task.
 *
 * Why a bar rather than a floating circle. The hero is roughly a viewport tall
 * on a laptop and much taller on a phone, so for a good part of the visit there
 * is no upload control and no search field anywhere on screen. Someone who has
 * scrolled past the problem picker and is still deciding has, at that moment,
 * nowhere to go. This gives them somewhere to go without asking them to scroll
 * back up.
 *
 * It hides itself in three cases rather than one:
 *  - before the hero has left the screen, because the hero already says all of
 *    this and two identical search fields are just noise;
 *  - on a tool page, where the tool's own upload control is the thing they came
 *    for and a "compress a PDF" button would compete with it;
 *  - when a cookie banner or the mobile nav is up, because it would sit on top
 *    of them.
 *
 * Nothing here is stored or personalised. It is the same bar for everyone,
 * because a bar that changed based on browsing history would be a tracking
 * surface in a place nobody expects one.
 */
export function StickyCtaBar() {
  const [past, setPast] = useState(false);

  // Matched on the path rather than against the catalogue. A tool page opened
  // directly is the case the bar must stay out of the way on, and looking the
  // path up in TOOLS is what "is this a tool page" actually means here — a hub
  // or a category page is not one, and a tool missing from the catalogue still
  // is.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const show = pathname === "/" && past;

  useEffect(() => {
    function onScroll() {
      // 520px rather than 0: below that the hero is still on screen and the
      // real search field is right there.
      setPast(window.scrollY > 520);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[65] border-t border-ink-200 bg-white/90 backdrop-blur-md lg:hidden dark:border-ink-800 dark:bg-ink-950/90"
      // z-[65]: below the header at 70 and the cookie banner at 60 would put it
      // in the wrong order against both. It sits above the banner deliberately —
      // the banner is dismissible and the bar is not.
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <Link
          to="/compress-pdf"
          onClick={() => navEvents.cta("sticky_bar", "Compress a PDF")}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
        >
          <BoltIcon className="h-4 w-4" />
          Compress PDF
        </Link>
        <Link
          to="/tools"
          onClick={() => navEvents.cta("sticky_bar", "All tools")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-ink-800 ring-1 ring-ink-200 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-700"
        >
          <SearchIcon className="h-4 w-4" />
          All tools
        </Link>
      </div>
    </div>
  );
}
