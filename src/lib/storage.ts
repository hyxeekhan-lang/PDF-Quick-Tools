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
  /** Local dates on which the daily challenge was marked done. */
  challengeDone: "challenge-done",
  challengeSkipped: "challenge-skipped",
  challengeReminder: "challenge-reminder",
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

/**
 * Removes one favourite without touching the rest.
 *
 * `toggleFavourite` would do the same thing, but it reads as "star/unstar" at
 * the call site and this is called from an explicit × control. Keeping both
 * means the button on a card and the button in the management panel cannot
 * disagree about what removing means.
 */
export function removeFavourite(href: string): string[] {
  const next = readFavourites().filter((item) => item !== href);
  write(KEYS.favourites, next);
  return next;
}

/** Empties the recents list, leaving favourites alone. */
export function clearRecent(): void {
  try {
    window.localStorage.removeItem(PREFIX + KEYS.recent);
  } catch {
    // Storage blocked means the list was never written, so there is nothing to
    // empty. Failing silently here is correct — the user asked for a state the
    // browser is already in.
  }
}

/**
 * Empties both lists.
 *
 * Separate from `clearRecent` because "clear history" and "forget my
 * shortcuts" are different requests, and a visitor who clears recents usually
 * still wants the tools they deliberately starred.
 */
export function clearAllTools(): void {
  clearFlag(KEYS.favourites);
  clearFlag(KEYS.recent);
}

export function readFlag(key: string): boolean {
  return read<boolean>(key, false);
}

export function writeFlag(key: string): void {
  write(key, true);
}

export function clearFlag(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear if storage is blocked — the flag was never written.
  }
}

/**
 * Dates on which the daily challenge was marked done.
 *
 * Keyed by local date rather than by challenge id, so the record means "I did
 * something today" — which is all a streak needs, and does not accumulate a
 * list of which tips this visitor happened to see. Capped at 60 entries so the
 * record cannot grow without limit.
 */
export function readChallengeDone(): string[] {
  return read<string[]>(KEYS.challengeDone, [])
    .filter((entry) => typeof entry === "string")
    .slice(-60);
}

/**
 * Marks today's challenge as done and returns the updated streak.
 *
 * A streak here is strictly informational — consecutive days marked done, with
 * no penalty for missing one. It is not a thing that can be lost, because a
 * streak that breaks and takes the record with it is a mechanic aimed at making
 * someone feel bad, which is exactly what this feature should not be.
 */
export function markChallengeDone(dateKey: string): { streak: number; done: string[] } {
  const done = readChallengeDone();
  if (!done.includes(dateKey)) done.push(dateKey);

  // Walk back from today counting consecutive days. The date maths is done in
  // local time and re-formatted the same way, so a visit at 23:30 and one at
  // 00:30 count as the two days they actually are rather than the same day.
  let streak = 0;
  const cursor = new Date(`${dateKey}T12:00:00`);
  for (;;) {
    const key = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, "0")}-${`${cursor.getDate()}`.padStart(2, "0")}`;
    if (!done.includes(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  write(KEYS.challengeDone, done.slice(-60));
  return { streak, done: done.slice(-60) };
}

/**
 * Whether today's challenge was skipped.
 *
 * Stored as the date rather than a boolean, because "skipped" has to expire: a
 * plain flag would hide every future day's challenge permanently after one skip.
 */
export function isChallengeSkippedToday(dateKey: string): boolean {
  return read<string>(KEYS.challengeSkipped, "") === dateKey;
}

export function markChallengeSkipped(dateKey: string): void {
  write(KEYS.challengeSkipped, dateKey);
}
