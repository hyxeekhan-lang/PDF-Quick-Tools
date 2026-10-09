/**
 * Records that a visitor opened a tool.
 *
 * ## The privacy position, stated so it can be checked
 *
 * The request body is a JSON object with exactly one field the caller may set:
 * `tool`. The server reads that field and drops the rest of the object without
 * looking at it. Nothing else about the request — no IP, no user agent, no
 * referrer, no cookies, no document — reaches the database.
 *
 * This is the endpoint that has to be right, because it is the one that runs on
 * every visit without anyone signing in. If it ever grew a second field, the
 * privacy page would be describing something the site no longer does.
 *
 * ## Why the tool name is validated against the catalogue
 *
 * A raw string from an unauthenticated caller is arbitrary text. Writing it
 * through unchecked would let anyone stuff the dashboard with invented tool
 * names, or with a very long string repeated until the table grows. So the
 * name has to match a route that actually exists, which bounds both the alphabet
 * and the length.
 *
 * Failures are silent by design. A blocked or failed analytics write must never
 * surface to the visitor: they asked to open a tool, and whether the count went
 * up is not their problem. Answering 204 and moving on is the whole contract.
 */

import { recordVisit } from "./_db.js";
import { clientIp, takeRateLimit } from "./_rate-limit.js";

/**
 * Visits allowed per IP per minute.
 *
 * Generous for real use — a visitor opening ten tools in a minute is normal
 * behaviour, not a script — but low enough that a loop adding rows costs
 * something. This counts against the IP only to cap volume; the IP itself is
 * never stored.
 */
const RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 } as const;

/**
 * What a tool path has to look like before it is stored.
 *
 * The obvious implementation is to import `TOOLS` from `src/lib/tools.ts` and
 * check membership, which is what the rest of the app does and would keep the
 * two in step. That does not work here: a Vercel function is bundled from
 * `api/` alone and never sees `src/`, so the import fails at module load and
 * takes the whole endpoint down. A serverless bundle that cannot read the app's
 * own route table is the constraint, and it is worth knowing about before
 * someone "simplifies" this back into an import.
 *
 * So this is a shape check, not a catalogue check. It accepts anything that
 * reads like one of our tool routes — a leading slash, lowercase words, single
 * hyphens — and refuses everything else.
 *
 * What this still guarantees:
 *  - the alphabet is fixed, so no arbitrary text can be written into the table;
 *  - the length is bounded, so the table cannot be grown with padding;
 *  - the column stays groupable, because every value is a path.
 *
 * What it does not: that the path is a route that exists today. A removed tool
 * would keep accepting writes under its old path. Those rows are inert — they
 * appear in the dashboard as a name with a count, and nothing links them — and
 * the dashboard's own tool count is the way to spot one.
 */
const TOOL_PATH = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TOOL_LENGTH = 60;

export async function POST(request: Request): Promise<Response> {
  const limit = takeRateLimit(`track:${clientIp(request)}`, RATE_LIMIT);
  if (!limit.ok) {
    // 202, not 204 and not 429: the caller's own logic has already succeeded,
    // and a rejection here would be a retry loop firing at a server that is
    // working exactly as intended.
    return new Response(null, { status: 202 });
  }

  try {
    const body = (await request.json()) as { tool?: unknown };
    const tool = typeof body?.tool === "string" ? body.tool : "";

    if (!TOOL_PATH.test(tool) || tool.length > MAX_TOOL_LENGTH) {
      // Not an error the caller can act on, and not worth a log line: a
      // rejected path means the caller sent something that is not a tool route,
      // and the outcome either way is the same — the tool still opens.
      return new Response(null, { status: 204 });
    }

    await recordVisit(tool);
  } catch {
    // A database that is down must not become a broken page. The tool opens
    // regardless; one visit goes uncounted.
  }

  return new Response(null, { status: 204 });
}

/**
 * Only POST records anything.
 *
 * A GET to this path returning 405 rather than the SPA shell is deliberate: this
 * lives under /api/, and an endpoint that answers anything other than 405 to
 * GET is an endpoint that will eventually be probed by something expecting a
 * page.
 */
export function GET(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}