import { useEffect, useRef, useState } from "react";
import { CopyIcon, MailIcon, ShareIcon } from "./Icons";
import { button, cx } from "./ui";
import { toolEvents } from "#/lib/analytics";
import { SITE_NAME, SITE_URL } from "#/lib/site";

/**
 * Lets a visitor send someone else to the tool they just used.
 *
 * ## Why this shares a link and not the finished file
 *
 * The obvious version of this button uploads the result so the recipient can
 * download it directly. That would be the better button, and this site cannot
 * offer it: the whole product claim is that files are processed in the browser
 * and never uploaded. A share button that quietly POSTs the finished PDF to a
 * server to make sharing easier would falsify that claim for the one action
 * where a user is least suspicious of a cost — they have already pressed
 * "Download", and a second network request right after it reads as part of the
 * same thing.
 *
 * So this shares the *tool*, and says plainly that the file travels as an
 * attachment the visitor adds themselves. Two extra clicks, no upload, and the
 * privacy claim stays true for every action on the site rather than most of
 * them. Anyone wanting true one-tap file transfer needs a server-side product,
 * which would mean a different site.
 *
 * ## Why the message names the tool
 *
 * A bare link to `/compress-pdf` in a chat thread reads as spam and gets
 * ignored. "I compressed a PDF with PDF Quick Tools" reads as a person who
 * found something useful, which is the only reason anyone shares anything.
 */
export function ShareResults({
  toolName,
  toolPath,
  /** True when there is a finished file to mention, so the copy can refer to it. */
  hasResult,
}: {
  toolName: string;
  toolPath: string;
  hasResult: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A component that unmounts mid-timeout would otherwise call setState on
  // nothing, which React 19 tolerates but which leaves a stray timer holding
  // the closure alive after the visitor has moved on.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const url = `${SITE_URL}${toolPath}`;
  const message = hasResult
    ? `I used ${toolName} to work on a PDF. Try it here: ${url}`
    : `Try ${toolName} — it runs in your browser: ${url}`;

  function flashCopied() {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  async function copy() {
    // navigator.clipboard is unavailable on an insecure origin and in some
    // embedded webviews, where it is present but rejects every call. Both
    // failures land here and the visitor gets told, rather than a button that
    // appears dead.
    try {
      await navigator.clipboard.writeText(`${message}`);
      toolEvents.shared(toolName, "copy");
      flashCopied();
    } catch {
      // The fallback exists because "copy" failing silently is the one bug a
      // user cannot report clearly. execCommand is deprecated and many browsers
      // restrict it to a user gesture, which is why this is in the handler
      // rather than in a effect.
      const area = document.createElement("textarea");
      area.value = message;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        toolEvents.shared(toolName, "copy");
        flashCopied();
      } catch {
        // Nothing left to try. Leave the button in its default state so it can
        // be pressed again after whatever blocked it has gone.
      } finally {
        area.remove();
      }
    }
  }

  async function nativeShare() {
    // Deliberately not feature-detected into a hidden alternative. On a phone
    // this is the button a person actually wants — the system sheet has
    // WhatsApp, Messages, and email already on it — and replacing it with
    // three generic icons would be a downgrade on the device where sharing
    // happens most.
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${toolName} — ${SITE_NAME}`,
        text: message,
        url,
      });
      toolEvents.shared(toolName, "native");
    } catch {
      // AbortError when the sheet is dismissed. Not a failure worth a log line,
      // and not something to show the visitor as an error.
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="mt-4 border-t border-ink-200/80 pt-4 dark:border-ink-800">
      <p className="text-sm font-semibold text-ink-900 dark:text-white">Used this tool?</p>
      <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
        {hasResult
          ? "Send someone the link, then attach your finished file yourself — nothing is uploaded here."
          : "Send someone the link to this tool."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={button("secondary", "sm")}>
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        )}
        <button type="button" onClick={copy} className={button("secondary", "sm")}>
          <CopyIcon className="h-4 w-4" />
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(`${toolName} — ${SITE_NAME}`)}&body=${encodeURIComponent(message)}`}
          onClick={() => toolEvents.shared(toolName, "email")}
          className={cx(button("secondary", "sm"), "no-underline")}
        >
          <MailIcon className="h-4 w-4" />
          Email
        </a>
      </div>

      {/* aria-live rather than a visible toast: the button label change is the
          confirmation, and a second announcement of the same fact is noise for
          a screen reader user. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}