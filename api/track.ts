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

import { TOOLS } from "#/lib/tools";
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

const KNOWN_TOOLS = new Set<string>(TOOLS.map((tool) => tool.href));

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

    if (!KNOWN_TOOLS.has(tool)) {
      // Not an error the caller can act on, and not worth a log line: a wrong
      // tool name here means the frontend and the catalogue have drifted apart,
      // which a build-time test catches far more usefully.
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