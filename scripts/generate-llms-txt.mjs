/**
 * Builds public/llms.txt from the routes that actually exist.
 *
 * ## What this file is for
 *
 * llms.txt is a proposal for giving a language model a curated map of a site:
 * a plain-text list of the pages worth reading, with one line each saying what
 * they are. It is to AI assistants roughly what a sitemap is to a crawler, and
 * it is becoming the thing a site points at when it wants to be described
 * accurately rather than summarised from whatever page happened to rank.
 *
 * ## Why it is generated rather than written
 *
 * The same reason the sitemap is: a hand-maintained list of pages on a site
 * with 55 tools falls behind within a month, and a stale llms.txt is worse than
 * none — it actively misdescribes the site to the systems it exists to inform.
 * Deriving it from the route directory means adding a tool and deploying puts
 * it in the file automatically.
 *
 * ## Why the descriptions are pulled from the route source
 *
 * Each tool page's own `description` in its `head()` call is already written
 * for a human reading a search result, which is exactly what a line here needs
 * to be. Reading them from disk rather than keeping a parallel copy means the
 * two cannot disagree about what a tool does.
 *
 * Not run as part of the build yet — see the note at the bottom. It writes on
 * demand with `node scripts/generate-llms-txt.mjs`.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES = path.join(ROOT, "src", "routes");
const SITE_URL = "https://pdfpilot.site";

/** Never advertised, for the same reason they are absent from the sitemap. */
const UNLISTED = new Set(["admin"]);

/** A stub whose tool has not been written yet. */
const PLACEHOLDER = /<ToolShell[^>]*>\s*x\s*<\/ToolShell>/;

/**
 * Reads the tool catalogue and returns one entry per tool.
 *
 * From `src/lib/tools.ts` rather than from the route files, which is the whole
 * point: the catalogue already holds a clean `name`, a one-sentence `blurb`,
 * and a `category` for every tool, written for humans reading a card. Scraping
 * those out of each route's `head()` call instead meant a regex catching the
 * first `description:` prop in the file, which is often an `alt` on an icon
 * and not the page description at all.
 *
 * Parsed by brace matching rather than imported, because this runs in plain
 * Node before Vite exists. Each entry is an object literal in a fixed field
 * order, so walking from one `href:` to the matching close brace and reading
 * the fields in between is reliable enough for a generated file, and the
 * script refuses to emit anything if it finds fewer tools than the file
 * claims — which is the failure a naive parse would produce silently.
 */
function catalogue() {
  const source = readFileSync(path.join(ROOT, "src", "lib", "tools.ts"), "utf8");

  const tools = [];
  const entry = /\{\s*href:\s*"([^"]+)",\s*name:\s*"([^"]*)",\s*blurb:\s*"([^"]*)",\s*subtitle:\s*"[^"]*",\s*icon:\s*"[^"]*",\s*category:\s*"([^"]*)"/g;

  let match;
  while ((match = entry.exec(source)) !== null) {
    tools.push({
      path: match[1],
      name: match[2],
      blurb: match[3],
      category: match[4],
    });
  }

  if (tools.length === 0) {
    throw new Error(
      "llms.txt — the catalogue parse found no tools. Refusing to write a file " +
        "that would describe the site as empty. Check that the field order in " +
        "src/lib/tools.ts has not changed.",
    );
  }

  return tools;
}

/**
 * Which catalogue entries have a real page behind them.
 *
 * A tool can exist in the catalogue while its route is still a stub, and a URL
 * that 404s is worse than an absent one in a file whose purpose is to be
 * accurate.
 */
function shippedPaths() {
  const files = readdirSync(ROUTES).filter(
    (name) => name.endsWith(".tsx") && !name.startsWith("_"),
  );

  const shipped = new Set();
  for (const name of files) {
    const slug = name.slice(0, -".tsx".length);
    if (UNLISTED.has(slug)) continue;
    if (PLACEHOLDER.test(readFileSync(path.join(ROUTES, name), "utf8"))) continue;
    shipped.add(slug === "index" ? "/" : `/${slug}`);
  }
  return shipped;
}

const shipped = shippedPaths();
const tools = catalogue().filter((tool) => shipped.has(tool.path));

const lines = [
  "# PDF Quick Tools",
  "",
  "> Browser-based PDF tools: compress, merge, split, convert, edit, sign,",
  "> organize, and a set of AI tools that read a document you choose. Regular",
  "> PDF operations run entirely in the visitor's browser and the file is never",
  "> uploaded. AI tools are the exception: extracted text (or page images for",
  "> scanned PDFs) is sent to the AI provider only when the visitor runs an AI",
  "> action. No account is required.",
  "",
  `Every tool is listed below with its own page. There are ${tools.length} tool pages.`,
  "",
  "## Start here",
  "",
  `- [All tools](${SITE_URL}/tools): the complete catalogue, filterable by category.`,
  `- [Daily challenge](${SITE_URL}/daily-challenge): one suggested PDF task per day.`,
  `- [Study mode](${SITE_URL}/study-mode): turn one PDF into notes, a quiz, flashcards, or a summary.`,
  "",
  "## Policies",
  "",
  `- [Privacy policy](${SITE_URL}/privacy): what is and is not collected, and why.`,
  `- [Terms of use](${SITE_URL}/terms).`,
  `- [About](${SITE_URL}/about) and [contact](${SITE_URL}/contact).`,
  "",
  "## Tools",
  "",
];

for (const tool of tools) {
  lines.push(`- [${tool.name}](${SITE_URL}${tool.path}): ${tool.blurb}`);
}

lines.push("");

writeFileSync(path.join(ROOT, "public", "llms.txt"), lines.join("\n"), "utf8");
console.log(`llms.txt — ${tools.length} tools`);