import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";
import { Tooltip } from "./Tooltip";

export const THEME_KEY = "pqt-theme";

/**
 * Runs before paint so a returning visitor never sees a light flash on a dark
 * site. Kept as a string because it has to be inline in the document head.
 */
export const themeBootScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing can refuse storage. The toggle still works for now.
    }
  }

  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    // Wrapped rather than given a `title`: a title attribute only appears on
    // hover, and a phone has no hover — where a moon-and-sun glyph with no
    // label is the one control in the header nobody can guess.
    <Tooltip label={label} className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={ready ? dark : undefined}
        aria-label={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
      >
        {ready && dark ? (
          <SunIcon className="h-[18px] w-[18px]" />
        ) : (
          <MoonIcon className="h-[18px] w-[18px]" />
        )}
      </button>
    </Tooltip>
  );
}
