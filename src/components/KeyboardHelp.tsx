import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { button } from "#/components/ui";
import { KEYS, readFlag, writeFlag } from "#/lib/storage";
import type { ToolHref } from "#/lib/tools";

/**
 * The `?` overlay.
 *
 * Every tool here is keyboard-driven — page pickers take arrows, page reorder
 * takes alt+arrows — and that is the fastest way to use them. But an
 * undiscoverable shortcut is worth nothing, and pointing at it in copy nobody
 * reads is not discovery either. So it is bound to a key, and the first visit
 * is told about it once.
 *
 * The binding is deliberately loose: `?` opens it from anywhere except a text
 * field, where `?` is a character the visitor is typing. Ignoring `input`,
 * `textarea` and `contenteditable` is what stops the overlay from swallowing
 * keystrokes in the search box and the rename fields.
 */
export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "?") return;
      // A visitor typing "what's this?" must get a question mark, not an
      // overlay. isComposing covers an IME mid-word.
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      setOpen((current) => !current);
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  // Escape closes and hands focus back, so a keyboard user is not left with the
  // page inert behind a dismissed dialog.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open]);

  return (
    <>
      {/* A quiet, permanent reminder. It sits in the footer area of the page
          flow rather than floating, because a floating hint that follows the
          visitor down the page is the thing it is meant to prevent. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 inline-flex items-center gap-2 text-xs text-ink-500 underline underline-offset-2 transition-colors hover:text-ink-800 dark:text-ink-400 dark:hover:text-white"
      >
        <kbd className="rounded border border-ink-300 bg-ink-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold dark:border-ink-700 dark:bg-ink-800">
          ?
        </kbd>
        Keyboard shortcuts
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kbd-title"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink-950/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900">
            <h2 id="kbd-title" className="text-lg font-bold text-ink-900 dark:text-white">
              Keyboard shortcuts
            </h2>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              Every tool here can be run without the mouse.
            </p>

            <dl className="mt-5 space-y-2.5">
              {SHORTCUTS.map((item) => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between gap-4 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-950/60"
                >
                  <dt className="text-sm text-ink-700 dark:text-ink-300">{item.action}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {item.keys.split(" ").map((key) => (
                      <kbd
                        key={key}
                        className="rounded border border-ink-300 bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                      >
                        {key}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${button("primary", "md")} mt-6 w-full`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const SHORTCUTS = [
  { keys: "?", action: "Open this list" },
  { keys: "Esc", action: "Close a panel, or cancel a job" },
  { keys: "← →", action: "Move between page thumbnails" },
  { keys: "Alt ↑ ↓", action: "Move the selected page up or down" },
  { keys: "Tab", action: "Next control, without getting stuck" },
] as const;

/**
 * A one-time tip shown on a tool page.
 *
 * Written to local storage once seen, so it is a first-run hint rather than a
 * permanent banner. Nothing about the visitor is stored — only that they have
 * seen the tip.
 */
export function KeyboardTip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readFlag(KEYS.seenCoach)) return;
    // Delayed so it arrives after the page has settled rather than competing
    // with the uploader for attention on first paint.
    const timer = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-ink-200 bg-ink-50/70 px-4 py-3 dark:border-ink-800 dark:bg-ink-900/50">
      <p className="flex-1 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
        <kbd className="rounded border border-ink-300 bg-white px-1 py-0.5 font-sans font-semibold dark:border-ink-700 dark:bg-ink-800">
          ?
        </kbd>{" "}
        opens the keyboard shortcuts for this site.
      </p>
      <button
        type="button"
        onClick={() => {
          writeFlag(KEYS.seenCoach);
          setShow(false);
        }}
        className="shrink-0 text-xs font-semibold text-ink-500 underline underline-offset-2 dark:text-ink-400"
      >
        Got it
      </button>
    </div>
  );
}

/**
 * The suggestion shown once a job is finished: what people do next.
 *
 * A result screen used to be a dead end — a download button and nothing else.
 * These are the tasks that genuinely follow the one just done (a compressed file
 * usually needs to be merged or renamed; a merged one often needs pages
 * removed), so following one is a natural next step rather than a cross-sell.
 */
export function NextSteps({ from }: { from: ToolHref }) {
  const links = NEXT_STEPS[from];
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold text-ink-900 dark:text-white">Common next steps</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className="group flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 ring-1 ring-ink-200 transition-all hover:-translate-y-0.5 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-600/60"
            >
              <ToolIconTile name={item.icon} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800 dark:text-ink-200">
                {item.label}
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NEXT_STEPS: Partial<Record<ToolHref, Array<{ href: ToolHref; label: string; icon: Parameters<typeof ToolIconTile>[0]["name"] }>>> = {
  "/compress-pdf": [
    { href: "/merge-pdf", label: "Merge it with other files", icon: "merge" },
    { href: "/rotate-pdf", label: "Fix the page orientation", icon: "rotate" },
    { href: "/watermark-pdf", label: "Add a watermark before sending", icon: "watermark" },
  ],
  "/merge-pdf": [
    { href: "/delete-pdf-pages", label: "Remove the pages you don't need", icon: "delete" },
    { href: "/rearrange-pdf-pages", label: "Put the pages in the right order", icon: "reorder" },
    { href: "/compress-pdf", label: "Make the merged file smaller", icon: "compress" },
  ],
  "/split-pdf": [
    { href: "/merge-pdf", label: "Rejoin them differently", icon: "merge" },
    { href: "/extract-pdf-pages", label: "Pull out one specific page", icon: "extract" },
  ],
  "/rotate-pdf": [
    { href: "/merge-pdf", label: "Combine with other documents", icon: "merge" },
    { href: "/compress-pdf", label: "Make it smaller to send", icon: "compress" },
  ],
  "/redact-pdf": [
    { href: "/flatten-pdf", label: "Flatten it so edits cannot be undone", icon: "flatten" },
    { href: "/remove-pdf-metadata", label: "Strip the hidden metadata", icon: "metadata" },
  ],
  "/jpg-to-pdf": [
    { href: "/merge-pdf", label: "Combine with an existing PDF", icon: "merge" },
    { href: "/compress-pdf", label: "Make the new file smaller", icon: "compress" },
    { href: "/add-page-numbers", label: "Add page numbers", icon: "pageNumbers" },
  ],
  "/watermark-pdf": [
    { href: "/compress-pdf", label: "Make it smaller to send", icon: "compress" },
    { href: "/merge-pdf", label: "Merge it into a bigger document", icon: "merge" },
  ],
  "/unlock-pdf": [
    { href: "/protect-pdf", label: "Put a password back on it", icon: "lock" },
    { href: "/remove-pdf-metadata", label: "Strip the hidden metadata", icon: "metadata" },
  ],
};
