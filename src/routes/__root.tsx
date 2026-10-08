import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { SiteFooter } from "#/components/SiteFooter";
import { SiteHeader } from "#/components/SiteHeader";
import { CookieConsent } from "#/components/CookieConsent";
import { ScrollToTop } from "#/components/ScrollToTop";
import { themeBootScript } from "#/components/ThemeToggle";
import { button } from "#/components/ui";
import { pageHead } from "#/lib/seo";
import { SITE_NAME, SITE_URL } from "#/lib/site";

import appCss from "../styles.css?url";

const defaults = pageHead({
  title: `${SITE_NAME} — Free Online PDF Tools`,
  description:
    "Free online PDF tools to compress, merge, split, convert, rotate and manage PDF files quickly and easily.",
  path: "/",
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#4f46e5" },
      { name: "msvalidate.01", content: "DA43AA94C5BF09741BAD211519D394B0" },
      ...defaults.meta,
    ],
    // Meta is de-duplicated by name across routes, so these act as fallbacks.
    // Links are not, so the canonical belongs to each route, never here.
    links: [
      { rel: "preload", href: appCss, as: "style" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Applies the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
            }),
          }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          <span className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Skip to content
          </span>
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <CookieConsent />
        <ScrollToTop />
        <Scripts />
      </body>
    </html>
  );
}

function RouteError(props: ErrorComponentProps) {
  const { error, reset } = props;
  console.error("[route] render failed:", error);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
        Error
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
        This page could not be loaded
      </h1>
      <p className="mt-4 text-lg text-ink-600 dark:text-ink-400">
        Something went wrong on our side, not with your file. Reloading usually
        fixes it. All of the PDF tools are still one click away.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={button("primary", "lg")}>
          Reload this page
        </button>
        <Link to="/tools" className={button("secondary", "lg")}>
          Browse All Tools
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
        We could not find that page
      </h1>
      <p className="mt-4 text-lg text-ink-600 dark:text-ink-400">
        The link may be out of date, or the page may have moved. All of the PDF
        tools are still one click away.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/tools" className={button("primary", "lg")}>
          Browse All Tools
        </Link>
        <Link to="/" className={button("secondary", "lg")}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
