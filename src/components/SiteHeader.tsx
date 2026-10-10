import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SITE_NAME } from "#/lib/site";
import {
  BrainIcon,
  CompressIcon,
  DownloadIcon,
  GridIcon,
  HomeIcon,
  MergeIcon,
  SparkIcon,
  SplitIcon,
} from "./Icons";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { ToolSearch } from "./ToolSearch";
import { Tooltip } from "./Tooltip";
import { button, cx } from "./ui";

/**
 * Primary navigation.
 *
 * "All Tools" and "AI Tools" are the two browsable ways in; the three PDF jobs
 * after them are the ones typed often enough to be worth a single click.
 * Study Mode is the newest and most distinctive thing the site does, so it is
 * in the nav rather than only on the homepage — someone who came for it once
 * should be able to get back to it without going through the homepage.
 *
 * Nothing here is removed. Every entry still resolves to a route that exists.
 */
const NAV = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/tools", label: "All Tools", Icon: GridIcon },
  { to: "/ai-summarizer", label: "AI Tools", Icon: SparkIcon },
  { to: "/study-mode", label: "Study Mode", Icon: BrainIcon },
  { to: "/compress-pdf", label: "Compress", Icon: CompressIcon },
  { to: "/merge-pdf", label: "Merge", Icon: MergeIcon },
  { to: "/split-pdf", label: "Split", Icon: SplitIcon },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  // The header sits over content on a frosted background. Without a shadow it
  // reads as flat until you scroll, at which point a list scrolls right under
  // it with no separation.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        // z-[70], not z-50: the cookie banner sits at z-60, so at z-50 it
        // painted straight over the bottom of the nav row.
        "sticky top-0 z-[70] border-b bg-white/85 backdrop-blur-md transition-shadow dark:bg-ink-950/85",
        scrolled
          ? "border-ink-200/80 shadow-[0_1px_12px_rgba(15,23,42,0.08)] dark:border-ink-800 dark:shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
          : "border-transparent",
      )}
    >
      {/* No flex-wrap anywhere in this bar. The height is a fixed h-16, so the
          moment a control wraps it escapes the bar and is clipped against the
          page. Every child below is shrinkable or conditionally rendered
          instead. */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          to="/"
          /* The mark is aria-hidden, and the wordmark beside it is hidden below
             sm, so on a phone this link had no accessible name at all — a
             screen reader announced just "link". The label is always present;
             only the visible word is withheld. */
          aria-label={`${SITE_NAME} — home`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-ink-900 lg:flex-none dark:text-white"
        >
          <span className="shrink-0"><BrandMark /></span>
          {/* The full name needs ~140px it does not have on a 390px screen, so
              the mark carries the brand on phones and the word joins at sm. */}
          <span className="hidden truncate text-[17px] font-bold tracking-tight line-grow sm:inline">
            {SITE_NAME}
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  /* Same reason as the mobile pills: activeProps merges at equal
                     specificity, so its colors can lose to the base class list. */
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white line-grow aria-[current=page]:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-700 dark:aria-[current=page]:bg-brand-600/15 dark:aria-[current=page]:text-brand-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* shrink-0 so these four stay rigid while the logo yields the space. */}
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          {/* One component, two triggers. At lg and up it renders the persistent field
              in place. Below that there is no room for a field in the bar — but
              rather than leaving search two taps and a page load away on the
              majority of visitors, the same component renders a search icon that
              opens the field full-screen. The search stays reachable; only where
              it lives changes. */}
          <ToolSearch className="w-52 xl:w-64" />
          <InstallAppButton />
          <ThemeToggle />
          {/* On desktop "All Tools" is already in the nav, so this button is
              only for phones — where the nav is a scrolling pill row below and
              the catalogue needs one obvious tap target rather than a hunt
              through pills. */}
          <Link to="/tools" className={cx(button("primary", "sm"), "lg:!hidden")}>
            All Tools
          </Link>
        </div>
      </div>

      {/* Mobile nav is a second row of pills inside the bar, not a drawer.

          The overflow-x:auto lives on this <nav>, not on the <ul> below it.
          Putting the scroller on the ul itself put the whole document 15px into
          overflow even though the ul's own box was correctly 390px - a scroll
          container nested inside the page flow leaks its content width upward.
          Scrolling one level up, on an element with no overflowing content of
          its own, keeps the leak from happening. */}
      <div className="min-w-0 overflow-x-clip border-t border-ink-200 bg-white/95 lg:hidden dark:border-ink-800 dark:bg-ink-950/95">
        <nav
          aria-label="Mobile"
          className="animate-mobile-nav-in min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max items-center gap-2 px-4 py-2.5 sm:px-6">
            {NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  /* Active styling rides on aria-current, not activeProps. activeProps
                     merges into this same className at identical specificity, so its
                     bg-brand-600 lost to the bg-white declared here and the active pill
                     rendered white-on-white. One class string means no collision. */
                  className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-1.5 pl-2 pr-3.5 text-sm font-medium whitespace-nowrap text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800 aria-[current=page]:border-transparent aria-[current=page]:bg-brand-600 aria-[current=page]:font-semibold aria-[current=page]:text-white dark:aria-[current=page]:bg-brand-600 dark:aria-[current=page]:text-white"
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link
                to="/tools"
                className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-2 pr-3.5 text-sm font-semibold whitespace-nowrap text-white dark:bg-white dark:text-ink-950"
              >
                <GridIcon className="h-4 w-4 shrink-0" />
                All Tools
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function capture(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function install() {
    const prompt = installPrompt;
    if (!prompt) {
      setMessage("Install from your browser menu: ⋮ → Install app.");
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "Installed. Look for it on your home screen." : null);
    setInstallPrompt(null);
  }

  // The notice has to be visible. It used to be announced through an sr-only
  // live region, which a sighted visitor — the person who just pressed the
  // button — never sees, so pressing it appeared to do nothing. A sighted user
  // who clicks and gets silence concludes the button is broken, which is the
  // exact impression this button must not give.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <>
      {/* On a phone the header has room for the install action as an icon only.
          The accessible name stays full, so a screen reader still announces it.
          The Tooltip is what a sighted phone user gets instead: a `title`
          attribute only exists on hover, and a phone has no hover. */}
      <Tooltip label="Install this site as an app">
        <button
          type="button"
          onClick={() => void install()}
          className={cx(button("secondary", "sm"), "h-11 w-11 shrink-0 justify-center p-0 sm:h-auto sm:w-auto sm:px-4")}
          aria-label="Install app"
        >
          <DownloadIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      </Tooltip>
      {message && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-20 z-[80] -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-ink-950"
        >
          {message}
        </span>
      )}
    </>
  );
}
