/**
 * Collects one person's opinion about one tool.
 *
 * ## What this endpoint is for
 *
 * The owner needs to know which tools are working and which are quietly broken,
 * and the only honest source of that is the people using them. Testimonials
 * written by the owner would be invented, so they are not something this site
 * does; this endpoint is the real version of that widget.
 *
 * ## The rules, and why each one exists
 *
 * The caller is anonymous and unauthenticated, so every field is treated as
 * hostile:
 *
 *  - `tool` is checked against a path shape, for the same reason `/api/track`
 *    does it. A serverless function cannot read the app's route table, so this
 *    cannot be a membership check — see the long note in `track.ts`.
 *  - `comment` is stripped of every HTML character and truncated. It is rendered
 *    in the owner's dashboard, and even though React escapes by default, a
 *    column that accepts markup from an anonymous caller is one careless render
 *    away from being an injection problem. Stripping at the boundary means the
 *    stored value is plain text by the time it lands, rather than plain text
 *    because something downstream remembered to escape it.
 *  - The comment is capped hard, because free text from an anonymous caller on
 *    an open endpoint is somewhere people paste things they should not.
 *  - Nothing identifies the writer. There is no email field, no name field, and
 *    no way to reply to someone — a real limitation, and the honest reason to
 *    keep it is that the alternative is a table of complaints sitting next to
 *    visitors' identities.
 *
 * The response is 204 with no body whether or not the row was written. The
 * visitor pressed a button; whether it counted is not something they need to be
 * told, and a body would only give a prober something to learn from.
 */

import { recordFeedback } from "./_db.js";
import { clientIp, takeRateLimit } from "./_rate-limit.js";

/**
 * Feedback allowed per address per day.
 *
 * Much tighter than the 60/minute on `/api/track`, because this one asks for
 * effort and attention rather than firing on a page open. Ten is generous for
 * an honest visitor and pointless for anyone filling the table.
 */
const RATE_LIMIT = { limit: 10, windowMs: 24 * 60 * 60 * 1000 } as const;

/** See the note in `track.ts` — a shape check, not a catalogue check. */
const TOOL_PATH = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TOOL_LENGTH = 60;
const MAX_COMMENT_LENGTH = 500;

/**
 * Reduces a comment to plain text.
 *
 * Anything that could be markup becomes a space, anything unprintable is
 * dropped, and runs of whitespace collapse to one space. Dropping rather than
 * escaping: escaping leaves `&lt;script&gt;` in the database, which looks like
 * an attack to whoever reads it a month later, while dropping leaves a
 * sentence that merely lost a bracket.
 *
 * Written as a loop over character codes rather than a regex on purpose — the
 * characters being filtered out are by definition the ones that are awkward to
 * put in a source file, and spelling them as `A-B` ranges keeps this readable.
 */
function cleanComment(raw: string): string {
  let out = "";
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0;
    // C0 controls, DEL, and the C1 range: not printable, and the strip and
    // terminal-clear codes are worth refusing outright.
    const isControl = code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f);
    // Angle brackets only. Quotes are deliberately kept: React escapes attribute
    // values, so an apostrophe cannot break out of one, and stripping it turns
    // "it won't open" into "it won t open" — which reads as damage the site did
    // to someone's sentence rather than a filter that ran.
    const isMarkup = char === "<" || char === ">";
    out += isControl || isMarkup ? " " : char;
    if (out.length >= MAX_COMMENT_LENGTH) break;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_COMMENT_LENGTH);
}

export async function POST(request: Request): Promise<Response> {
  const limit = takeRateLimit(`feedback:${clientIp(request)}`, RATE_LIMIT);
  if (!limit.ok) return new Response(null, { status: 202 });

  try {
    const body = (await request.json()) as {
      tool?: unknown;
      sentiment?: unknown;
      comment?: unknown;
    };

    const tool = typeof body?.tool === "string" ? body.tool : "";
    if (!TOOL_PATH.test(tool) || tool.length > MAX_TOOL_LENGTH) {
      return new Response(null, { status: 204 });
    }

    // Only plus or minus one. A float, a huge integer, or a boolean would all
    // otherwise reach the column and have to be defended against in every
    // aggregate that reads it, so the check happens once here and the value
    // stays clean everywhere downstream.
    const sentiment = body.sentiment === 1 ? 1 : body.sentiment === -1 ? -1 : 0;
    if (sentiment === 0) return new Response(null, { status: 204 });

    const comment =
      typeof body.comment === "string" && body.comment.trim()
        ? cleanComment(body.comment)
        : null;

    await recordFeedback(tool, sentiment, comment);
  } catch {
    // Same contract as /api/track: a database that is down costs one row, not
    // the visitor's click.
  }

  return new Response(null, { status: 204 });
}

export function GET(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}