import { Link } from "@tanstack/react-router";
import { EXTENSION_DOWNLOAD_URL, GITHUB_RELEASE_URL, SITE_NAME, SITE_TAGLINE } from "#/lib/site";
import { AdSlot } from "./AdSlot";
import { BrandMark } from "./BrandMark";

const TOOL_LINKS = [
  { to: "/compress-pdf", label: "Compress PDF" },
  { to: "/merge-pdf", label: "Merge PDF" },
  { to: "/split-pdf", label: "Split PDF" },
  { to: "/pdf-to-jpg", label: "PDF to JPG" },
  { to: "/jpg-to-pdf", label: "JPG to PDF" },
  { to: "/watermark-pdf", label: "Watermark PDF" },
  { to: "/sign-pdf", label: "Sign PDF" },
] as const;

const MORE_LINKS = [
  { to: "/ai-summarizer", label: "AI Summarizer" },
  { to: "/ai-chat", label: "AI Chat" },
  { to: "/ai-quiz", label: "AI Quiz" },
  { to: "/ai-notes", label: "AI Notes" },
  { to: "/tools", label: "All Tools" },
] as const;

/**
 * Category hubs, linked site-wide from the footer.
 *
 * These target the broad head terms rather than individual tools, so the footer
 * is where they get the internal links they need to rank. Every tool page, every
 * legal page and the homepage carries this column.
 */
const CATEGORY_LINKS = [
  { to: "/organize-pdf", label: "Organize PDF" },
  { to: "/pdf-editor", label: "Edit PDF" },
  { to: "/convert-pdf", label: "Convert PDF" },
  { to: "/optimize-pdf", label: "Optimize PDF" },
  { to: "/pdf-security", label: "PDF Security" },
  { to: "/ai-pdf-tools", label: "AI PDF Tools" },
] as const;

const SITE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact" },
] as const;

function Column({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ to: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-900 dark:text-white">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-ink-600 transition-colors hover:text-brand-700 dark:text-ink-400 dark:hover:text-brand-300"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <>
      {/* Above the footer rather than inside it: the footer is already dense
          with link columns, and an ad competing with those reads as clutter. */}
      <AdSlot format="fluid" className="mx-auto max-w-6xl" />
      <footer className="mt-20 border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2 text-ink-900 dark:text-white">
              <BrandMark compact />
              <span className="font-bold tracking-tight">{SITE_NAME}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-600 dark:text-ink-400">
              {SITE_TAGLINE} Regular PDF tools run in your browser. AI tools send
              extracted text only when you start an AI action.
            </p>
          </div>
          <Column title="Categories" links={CATEGORY_LINKS} />
          <Column title="Popular tools" links={TOOL_LINKS} />
          <Column title="More tools" links={MORE_LINKS} />
          <Column title="Site" links={SITE_LINKS} />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-ink-200 pt-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between dark:border-ink-800 dark:text-ink-500">
          <p>© 2026 {SITE_NAME}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>A product of Aifinancepk.</p>
            <a
              href={EXTENSION_DOWNLOAD_URL}
              download
              className="font-semibold hover:text-brand-700 dark:hover:text-brand-300"
            >
              Download Chrome Extension
            </a>
            <a
              href={GITHUB_RELEASE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:text-brand-700 dark:hover:text-brand-300"
            >
              GitHub Release
            </a>
            <a
              href="https://aifinancepk.site/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:text-brand-700 dark:hover:text-brand-300"
            >
              aifinancepk.site
            </a>
          </div>
        </div>
      </div>
      </footer>
    </>
  );
}
