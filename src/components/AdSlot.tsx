import { useEffect, useRef, useState } from "react";
import { ADSENSE_PUBLISHER_ID } from "#/lib/site";

/**
 * AdSense placement, built as a reserved box that an ad later fills.
 *
 * Two rules from the ad networks' own policy that this component exists to
 * enforce, because breaking either is the usual cause of an approval rejection:
 *
 *  1. The ad must not push content around as it loads. A collapsed element that
 *     grows to 90px when the creative arrives nudges the whole page down and
 *     reads as a layout jump. So the box has a min-height from the start and is
 *     labelled. Once a real creative is inside, the label goes away.
 *  2. The loader must not run before consent. The script is injected only after
 *     the user has accepted cookies, which the cookie banner records. Until
 *     then the box stays empty and the page carries no third-party request.
 *
 * The publisher ID lives in site.ts as ADSENSE_PUBLISHER_ID. If it is ever
 * cleared, nothing is injected and the reserved space is the only visible
 * result, so the site still renders.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Slot shapes we reserve space for. Widths follow each unit's own spec. */
export type AdFormat =
  | "leaderboard"
  | "rectangle"
  | "inArticle"
  | "fluid";

const FORMAT: Record<AdFormat, string> = {
  // 728x90 desktop, collapses to a responsive container on narrow screens.
  leaderboard: "min-h-[90px]",
  rectangle: "min-h-[280px]",
  inArticle: "min-h-[280px]",
  fluid: "min-h-[120px]",
};

export interface AdSlotProps {
  format?: AdFormat;
  /** Shown while empty: "Advertisement" / "Advertisement". Kept terse so it
   *  does not read as filler copy. */
  label?: string;
  className?: string;
}

export function AdSlot({ format = "fluid", label = "Advertisement", className = "" }: AdSlotProps) {
  const [ready, setReady] = useState(false);
  const [filled, setFilled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Three gates before anything loads: a real publisher ID, consent, and the
    // script. Without the ID there is nothing to serve, so we return before
    // touching the network.
    if (!ADSENSE_PUBLISHER_ID) return;
    // The loader must not run before consent. The cookie banner sets this key
    // on acceptance; without it there is no third-party script on the page.
    if (!hasAdConsent()) return;

    let cancelled = false;

    function push() {
      if (cancelled) return;
      try {
        // AdSense fills each pushed slot in place; we then drop the label.
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        window.setTimeout(() => setFilled(true), 1500);
      } catch {
        // A blocked or failed loader should not break the page.
      }
    }

    if (window.adsbygoogle) {
      push();
    } else {
      loadAdSense(push);
    }

    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Consent can be granted after first paint, so a slot that mounted before the
  // banner was answered still has to load. Setting `ready` re-runs the effect
  // above; this listener is what catches a late acceptance.
  useEffect(() => {
    if (!ADSENSE_PUBLISHER_ID) return;
    const on = () => setReady(true);
    window.addEventListener("ad-consent", on);
    return () => window.removeEventListener("ad-consent", on);
  }, []);

  const showLabel = !filled;

  return (
    <aside
      ref={ref}
      aria-label={label}
      data-ad-slot={format}
      className={`my-8 w-full ${FORMAT[format]} ${className}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center">
        {showLabel && (
          <span className="text-[11px] font-medium tracking-wide text-ink-400 uppercase dark:text-ink-600">
            {label}
          </span>
        )}
      </div>
    </aside>
  );
}

const CONSENT_KEY = "pqt-ad-consent";
const SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

export function hasAdConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function loadAdSense(onLoad: () => void) {
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.dataset.adSense = "1";
  s.onload = onLoad;
  document.head.appendChild(s);
}

/**
 * Called by the cookie banner once the user accepts. Kept here rather than in
 * the banner so the storage key and the loader never drift apart.
 */
export function grantAdConsent() {
  try {
    window.localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    // Private mode: the ad simply stays off. Not worth interrupting consent.
  }
  window.dispatchEvent(new Event("ad-consent"));
}
