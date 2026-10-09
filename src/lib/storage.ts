/**
 * Small, privacy-safe local storage helpers.
 *
 * The rule this module enforces: only ever store the *name* of a tool and
 * timestamps. Never a filename, never a file size, never anything read out of a
 * document.
 *
 * That rule is not incidental. The site tells visitors their files stay on
 * their device, and the browser storage a visitor can open in devtools is part
 * of their device — writing "invoice-jan-2026.pdf, 4.2MB" into it would make
 * the privacy claim false in the one place a technical visitor would check.
 *
 * Every write is wrapped because storage throws: Safari in private mode, a
 * full quota, and a browser with site data blocked all raise on `setItem`
 * rather than failing quietly.
 */

const PREFIX = "pqt:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // A full or blocked store is not worth interrupting a visitor over. The
    // feature degrades to "does not remember" rather than throwing.
  }
}

export const KEYS = {
  favourites: "favourites",
  recent: "recent",
  seenCoach: "seen-coach",
  dismissedTip: "dismissed-tip",
  installDismissed: "install-dismissed",
} as const;

/**
 * The visitor's starred tools, newest first.
 *
 * Capped at 8. A longer list stops being a shortcut bar and turns into a second
 * catalogue, which is what `/tools` is for.
 */
export function readFavourites(): string[] {
  return read<string[]>(KEYS.favourites, []).slice(0, 8);
}

export function isFavourite(href: string): boolean {
  return readFavourites().includes(href);
}

/** Adds or removes `href`. Returns the new list so the caller need not re-read. */
export function toggleFavourite(href: string): string[] {
  const current = readFavourites();
  const next = current.includes(href)
    ? current.filter((item) => item !== href)
    : [href, ...current].slice(0, 8);
  write(KEYS.favourites, next);
  return next;
}

/**
 * Recently opened tools, most recent first.
 *
 * Identified by route path only. The record written is `"/compress-pdf"` — a
 * string the site already puts in its own navigation — and nothing about the
 * document that was opened there.
 */
export function readRecent(limit = 6): string[] {
  return read<string[]>(KEYS.recent, []).slice(0, limit);
}

export function noteToolVisit(href: string): string[] {
  // Re-opening a tool moves it to the front rather than adding a duplicate.
  const next = [href, ...readRecent(8).filter((item) => item !== href)].slice(0, 8);
  write(KEYS.recent, next);
  return next.slice(0, 6);
}

export function readFlag(key: string): boolean {
  return read<boolean>(key, false);
}

export function writeFlag(key: string): void {
  write(key, true);
}
