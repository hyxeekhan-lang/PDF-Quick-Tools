/**
 * Builds public/sitemap.xml from the routes that actually exist.
 *
 * The sitemap used to be a hand-written file, which meant it had quietly
 * fallen behind: fourteen working tools — OCR, Redact, PDF to Word and the
 * rest — had no entry in it, and nothing noticed. A sitemap is meant to be a
 * complete list of what is indexable, so it is derived from the route
 * directory rather than maintained alongside it, which is the only way the
 * two cannot drift.
 *
 * Runs as part of the build: `npm run build` calls this before Vite starts, so
 * a route that is added and deployed is automatically in the sitemap.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = path.join(ROOT, "src", "routes");

/**
 * The live origin. Read from the site's own constant so the sitemap can never
 * name a different host than the canonical URLs in the page headers do.
 */
const SITE_URL = "https://pdfpilot.site";

/** Pages that are not tools, and so should not carry a tool's priority. */
const STANDALONE = new Set(["/", "/tools", "/about", "/contact"]);

/** Utility and legal pages: indexable, but not what the site is for. */
const LOW_PRIORITY = new Set([
  "/privacy",
  "/terms",
  "/disclaimer",
  "/ai-chat",
  "/ai-ask-pdf",
  "/ai-document-analyzer",
  "/ai-flashcard-generator",
  "/ai-citation-generator",
  "/ai-grammar-checker",
  "/ai-notes",
  "/ai-pdf-question-generator",
  "/ai-pdf-rewriter",
  "/ai-pdf-to-presentation",
  "/ai-pdf-translator",
  "/ai-quiz",
  "/ai-resume-analyzer",
  "/ai-summarizer",
]);

function priorityFor(route) {
  if (route === "/") return "1.0";
  if (route === "/tools") return "0.9";
  if (STANDALONE.has(route)) return "0.6";
  if (LOW_PRIORITY.has(route)) return "0.5";
  // Everything else is a tool page, and the ones people search for by name.
  return "0.8";
}

function changefreqFor(route) {
  if (route === "/") return "daily";
  if (LOW_PRIORITY.has(route)) return "monthly";
  return "weekly";
}

/**
 * The public routes, read off disk.
 *
 * __root.tsx is the document shell rather than a page, and files whose name
 * starts with an underscore are route fragments, so both are skipped.
 */
/**
 * A route file that renders the placeholder rather than the tool.
 *
 * A route has to exist for its path to typecheck before its tool is built, so
 * an unwritten tool leaves a stub behind — and a stub is still a route, which
 * means this generator would happily list an empty page for a crawler to find.
 * The stub says so in one place, and this reads it, so a half-built tool never
 * reaches the sitemap.
 */
const PLACEHOLDER = /<ToolShell[^>]*>\s*x\s*<\/ToolShell>/;

function routes() {
  const files = readdirSync(ROUTES).filter(
    (name) => name.endsWith(".tsx") && !name.startsWith("_"),
  );

  const paths = [];
  for (const name of files) {
    const slug = name.slice(0, -".tsx".length);
    const source = readFileSync(path.join(ROUTES, name), "utf8");
    if (PLACEHOLDER.test(source)) {
      console.log(`sitemap.xml — skipping ${slug}, still a placeholder`);
      continue;
    }
    paths.push(slug === "index" ? "/" : `/${slug}`);
  }

  return [...new Set(paths)].sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });
}

const entries = routes().map((route) => {
  const loc = `${SITE_URL}${route === "/" ? "/" : route}`;
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    // No <lastmod> on purpose: these pages change when the site is released,
    // not on a schedule, and a date that is only a guess is worse for a
    // crawler than no date at all.
    `    <changefreq>${changefreqFor(route)}</changefreq>`,
    `    <priority>${priorityFor(route)}</priority>`,
    "  </url>",
  ].join("\n");
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  "</urlset>",
  "",
].join("\n");

writeFileSync(path.join(ROOT, "public", "sitemap.xml"), xml, "utf8");
console.log(`sitemap.xml — ${entries.length} URLs`);
