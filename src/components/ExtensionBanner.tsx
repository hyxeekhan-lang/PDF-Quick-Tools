import { useState } from "react";
import { navEvents } from "#/lib/analytics";
import { EXTENSION_DOWNLOAD_URL, GITHUB_RELEASE_URL } from "#/lib/site";
import { CloseIcon, DownloadIcon, SparkIcon } from "./Icons";
import { button, cx } from "./ui";

export function ExtensionBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <section
      aria-label="PDF Tool Chrome Extension"
      className="mx-auto mt-4 flex w-full max-w-6xl items-center gap-3 px-4 sm:px-6"
    >
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5 rounded-2xl bg-gradient-to-r from-brand-50 via-white to-indigo-50 p-4 ring-1 ring-brand-200/80 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:from-brand-950/50 dark:via-ink-900 dark:to-indigo-950/40 dark:ring-brand-800/70">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25">
            <SparkIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 dark:text-white">
              PDF Tool Chrome Extension
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
              Open your favorite PDF tools directly from Chrome.
            </p>
          </div>
        </div>
        {/* On a phone the download goes full width and the GitHub link drops
            out of the header entirely: stacked, the two of them pushed the
            first tool card off the bottom of the screen. It is still in the
            mobile nav. */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:pl-0">
          <a href={EXTENSION_DOWNLOAD_URL} download onClick={() => navEvents.extension("banner_download")} className={cx(button("primary", "sm"), "flex-1 justify-center sm:flex-none")}>
            <DownloadIcon className="h-4 w-4 shrink-0" />
            Download Extension
          </a>
          <a href={GITHUB_RELEASE_URL} target="_blank" rel="noreferrer" onClick={() => navEvents.extension("banner_github")} className={cx(button("secondary", "sm"), "max-sm:!hidden")}>
            GitHub Release
          </a>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-white/60 hover:text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-ink-700/60 dark:hover:text-white sm:static sm:inline-flex"
          aria-label="Close Chrome Extension banner"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
