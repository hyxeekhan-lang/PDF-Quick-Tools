import type { ReactNode } from "react";

/**
 * Minimal ad slot for the homepage's desktop side rail. Keep the reservation
 * size stable so an ad integration can replace the contents without shifting
 * the page layout.
 */
export function MammothSubwaySideRailAd() {
  const content: ReactNode = (
    <div className="flex h-[600px] w-[160px] flex-col items-center justify-center rounded-xl border border-ink-200 bg-white/80 p-4 text-center shadow-sm dark:border-ink-800 dark:bg-ink-900/80">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        Advertisement
      </span>
      <span className="mt-3 text-sm font-semibold text-ink-700 dark:text-ink-200">
        Ad space
      </span>
    </div>
  );

  return content;
}
