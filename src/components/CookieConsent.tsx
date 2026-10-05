import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { grantAdConsent } from "./AdSlot";
import { CloseIcon, LockIcon } from "./Icons";
import { button } from "./ui";

const CONSENT_KEY = "pqt-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(value: "accepted" | "declined") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      document.cookie = `${CONSENT_KEY}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch {
      // The banner can still be dismissed when browser storage is unavailable.
    }
    // Accepting also grants the separate ad consent. Declining leaves ads off,
    // which is the state most privacy-conscious visitors will stay in.
    if (value === "accepted") grantAdConsent();
    window.dispatchEvent(new Event("pqt-cookie-consent-changed"));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-description">
      <div className="flex items-start gap-3">
        <span className="cookie-banner-icon" aria-hidden="true">
          <LockIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-title" className="text-sm font-bold text-ink-900 dark:text-white">Privacy choices</h2>
          <p id="cookie-description" className="cookie-banner-text mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
            {/* Two lengths of the same sentence. The short one is what shows on a phone,
            where the full wording plus the two buttons covered the hero. */}
            <span className="hidden sm:inline">
              We use local storage for theme and consent preferences. Allowing
              this also serves ads from Google AdSense and sends anonymous tool
              usage events. Your documents are never shared. Read our{" "}
            </span>
            <span className="sm:hidden">Local storage for preferences only.{" "}</span>
            <Link to="/privacy" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">Privacy Policy</Link>.
          </p>
        </div>
        <button type="button" onClick={() => choose("declined")} className="cookie-banner-close" aria-label="Dismiss cookie notice">
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="cookie-banner-actions mt-4 flex flex-wrap justify-end gap-2 sm:pl-8">
        <button type="button" onClick={() => choose("declined")} className={button("secondary", "sm")}>Continue without ads</button>
        <button type="button" onClick={() => choose("accepted")} className={button("primary", "sm")}>Allow ads and analytics</button>
      </div>
    </div>
  );
}
