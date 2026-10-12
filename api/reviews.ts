/**
 * Reads back the comments visitors have already left.
 *
 * ## Why this exists as its own endpoint
 *
 * `POST /api/feedback` collects anonymous comments because testimonials written
 * by the owner would be invented. This is the other half: once real comments
 * exist, they are the only honest review content the site can show, so they are
 * published rather than sitting in a table the owner reads alone.
 *
 * ## What a caller cannot do with it
 *
 * There is no email, name, device, or timestamp precise enough to identify
 * anyone — the row only ever held a path, a vote, and text, and that is all this
 * returns. There is no query parameter that widens the scope: one tool per
 * request, and only one of the site's own tool paths.
 *
 * ## Spam is the actual threat here
 *
 * Comments are anonymous, so nothing stops someone posting them. Three defences
 * are applied before a row is published, because a review section that a spammer
 * can fill with link spam is worse than no review section at all:
 *
 *  1. Only rows carrying a written comment are returned — a bare vote is not a
 *     review (see `publicFeedback`).
 *  2. Comments containing a URL or an @-handle are dropped. Legitimate remarks
 *     about a PDF tool almost never need to link anywhere, and this is what
 *     stops the section becoming a link farm.
 *  3. The list is capped and ordered newest-first, so a burst of spam ages out
 *     rather than sitting under the page indefinitely.
 *
 * The full text of the spam defence is that nothing can be *hidden* from the
 * owner — every row, spam included, is in the dashboard. This only keeps the
 * worst of it off the public page.
 *
 * Cached briefly so a page with reviews is not a database query per visitor,
 * and sent with `Vary` irrelevant because the response depends only on the path.
 */

import { publicFeedback } from "./_db.js";
import { takeRateLimit } from "./_rate-limit.js";

const TOOL_PATH = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LIMIT = 20;
const MAX_COMMENT_LENGTH = 500;

/** Same generous ceiling as the writer: this is not a write endpoint. */
const RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 } as const;

/** A link, an @-mention, or anything that looks like one. */
const SPAM = /(https?:\/\/|www\.|\S+@\S+\.\w)/i;

export async function GET(request: Request): Promise<Response> {
  const limit = takeRateLimit(`reviews:${ip(request)}`, RATE_LIMIT);
  if (!limit.ok) {
    return json({ comments: [], total: 0 }, 429);
  }

  const url = new URL(request.url);
  const tool = url.searchParams.get("tool") ?? "";

  if (tool !== "/" && !TOOL_PATH.test(tool)) {
    return json({ error: "bad tool" }, 400);
  }

  try {
    const raw = await publicFeedback(tool, MAX_LIMIT);
    // `null` means no database. The caller renders nothing at all rather than an
    // empty section, so this is a 200 with an explicit "not configured" flag
    // instead of an empty list that reads as "nobody has reviewed this yet".
    if (!raw) return json({ configured: false, total: 0, comments: [] });

    const comments = raw.comments
      .filter((c) => c.text.length > 0 && c.text.length <= MAX_COMMENT_LENGTH)
      .filter((c) => !SPAM.test(c.text))
      .map((c) => ({
        ...c,
        rating:
          typeof c.rating === "number" &&
          Number.isInteger(c.rating) &&
          c.rating >= 1 &&
          c.rating <= 5
            ? c.rating
            : null,
      }));

    return json({ configured: true, total: raw.total, comments });
  } catch {
    return json({ configured: false, total: 0, comments: [] });
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // 60s, not longer: a review that appears should not need a redeploy to
      // show, but it also should not be re-queried on every single page view.
      "cache-control": "public, max-age=10, s-maxage=15",
    },
  });
}

/** Rate-limit key only. Deliberately not returned in the response body. */
function ip(request: Request): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return (header?.split(",")[0] ?? "unknown").trim().slice(0, 60);
}