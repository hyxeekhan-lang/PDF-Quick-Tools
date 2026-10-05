export const SITE_NAME = "PDF Quick Tools";

/**
 * Your Google AdSense publisher ID, e.g. "ca-pub-1234567890123456".
 *
 * Left empty on purpose: AdSlot reserves its space and shows the placeholder
 * label, but injects no script and makes no third-party request, so the site is
 * safe to run this way before the account is approved. Paste the real value
 * here once AdSense gives it to you and the slots go live on their own.
 */
export const ADSENSE_PUBLISHER_ID = "";
export const SITE_TAGLINE = "Simple online tools for working with PDF files.";
export const SITE_URL = "https://pdfpilot.site";
export const GITHUB_RELEASE_URL = "https://github.com/jutthamid148-svg/PDF-Tools/releases/tag/v1.0.0";
export const EXTENSION_DOWNLOAD_URL = `${SITE_URL}/downloads/pdf-tool-chrome-extension.zip`;
// Reuse a deployed screenshot for social previews. The former og-card.jpg
// reference pointed to a file that was not part of the public build.
export const SITE_CARD = `${SITE_URL}/screenshots/home-desktop.png`;

/** Where the contact form's mailto is addressed. Change this to your own inbox. */
export const CONTACT_EMAIL = "jutthamid148@gmail.com";

/** The single source of truth for the size limit shown to users and enforced in code. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_LABEL = "50 MB";
