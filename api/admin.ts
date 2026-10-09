/**
 * Admin endpoints: login, logout, and the numbers.
 *
 * Split from the track endpoint because the rules are opposite. `/api/track`
 * is public and must be forgiving; everything here is private and must refuse.
 *
 * The login handler never says which part was wrong. "Wrong password" and
 * "wrong email" get the same message with the same timing, so the endpoint
 * cannot be used to discover whether an address is configured.
 */

import { dashboard } from "./_db.js";
import {
  adminConfigured,
  adminEmail,
  checkLoginRate,
  clearSessionCookie,
  issueSession,
  safeEqual,
  sessionCookie,
  verifySession,
  readSessionCookie,
} from "./_admin-auth.js";
import { clientIp } from "./_rate-limit.js";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/**
 * POST /api/admin — log in.
 *
 * Body is `{ email, password }`. Both are compared in constant time, and a
 * successful attempt returns a cookie rather than a token in the body: a token
 * in JSON tends to end up in localStorage, where it survives the tab and is
 * readable by anything else on the origin. HttpOnly means script cannot read it
 * at all.
 */
export async function POST(request: Request): Promise<Response> {
  if (!adminConfigured()) {
    return json(
      {
        error:
          "The admin panel is not set up on this deployment. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET, then redeploy.",
      },
      503,
    );
  }

  const limit = checkLoginRate(clientIp(request));
  if (!limit.ok) {
    return json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body?.email === "string") email = body.email.trim().toLowerCase();
    if (typeof body?.password === "string") password = body.password;
  } catch {
    return json({ error: "That did not work. Check the details and try again." }, 400);
  }

  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  const expectedEmail = adminEmail();

  // Both comparisons always run. Short-circuiting on the email would return
  // faster for a wrong address, which is a measurable difference.
  const emailOk = safeEqual(email, expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);

  if (!emailOk || !passwordOk) {
    return json({ error: "That email or password is not right." }, 401);
  }

  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(issueSession()) });
}

/** DELETE /api/admin — log out. */
export function DELETE(): Response {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

/** GET /api/admin — the dashboard's numbers, or 401. */
export async function GET(request: Request): Promise<Response> {
  if (!adminConfigured()) {
    return json(
      {
        error:
          "The admin panel is not set up on this deployment. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET, then redeploy.",
      },
      503,
    );
  }

  const session = verifySession(readSessionCookie(request));
  if (!session.ok) {
    // Expired is worth distinguishing from never-valid: it tells the client to
    // send the visitor back to the login screen rather than showing an error
    // about a session that simply ran out.
    const status = session.reason === "expired" ? 401 : 403;
    return json(
      {
        error: session.reason === "expired" ? "Your session expired." : "Not signed in.",
        expired: session.reason === "expired",
      },
      status,
    );
  }

  // Clamped so a crafted ?days=999999 cannot ask the database to build a
  // quarter-million row series.
  const requested = Number(new URL(request.url).searchParams.get("days") ?? "30");
  const days = Number.isFinite(requested)
    ? Math.min(365, Math.max(7, Math.trunc(requested)))
    : 30;

  try {
    return json(await dashboard(days));
  } catch (error) {
    console.error("[admin] dashboard query failed:", error);
    return json(
      { error: "The numbers could not be read. The database may be unreachable." },
      500,
    );
  }
}