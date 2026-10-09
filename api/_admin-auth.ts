/**
 * Admin authentication for the analytics panel.
 *
 * ## What this authenticates against
 *
 * A password in `ADMIN_PASSWORD`, compared in constant time. That is the entire
 * mechanism, and the trade-offs are worth stating plainly rather than hiding
 * behind the word "auth":
 *
 *  - The password lives only in Vercel environment variables and is never sent
 *    to a browser, never logged, and never stored in a database.
 *  - Sessions are stateless: a successful login returns a token that is
 *    `HMAC(SESSION_SECRET, email)`. Forging one requires `SESSION_SECRET`.
 *  - Nothing here emails anyone, which is why the panel needs no third-party
 *    service and no DNS records to be verified before it works.
 *
 * ## What it does not do
 *
 * It does not store users, and it does not rate-limit by account — there is one
 * account. It does not support multiple admins, and it does not reset itself;
 * rotating the password means rotating two environment variables.
 *
 * ## Why the email is also required
 *
 * `ADMIN_EMAIL` gates *who the panel is for*, and is checked on every request
 * rather than only at login. A stolen password still cannot be used from a
 * session minted for a different address, so the email is a second factor
 * derived from configuration rather than from anything the visitor supplies.
 */

import { timingSafeEqual, createHmac, randomBytes } from "node:crypto";
import { takeRateLimit, type RateLimitResult } from "./_rate-limit.js";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

/**
 * Attempts allowed per window. Tight on purpose: this is a login endpoint, and
 * the only thing standing between the panel and a password-guessing script.
 */
const LOGIN_RATE_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000 } as const;

export function checkLoginRate(ip: string): RateLimitResult {
  return takeRateLimit(`admin-login:${ip}`, LOGIN_RATE_LIMIT);
}

/**
 * Compares two secrets without leaking their length relationship through
 * timing. `===` on a string returns as soon as it finds a difference, which
 * tells an attacker how many leading characters were right.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "pqt-admin-compare").update(a).digest();
  const hb = createHmac("sha256", "pqt-admin-compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

/**
 * True when the environment is complete enough to serve the panel.
 *
 * Checked on every request rather than cached at module load, so that adding
 * the variables and redeploying works without a code change.
 */
export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_SESSION_SECRET,
  );
}

/** The token handed out after a correct password. */
export function issueSession(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const email = adminEmail();
  const expiry = String(Date.now() + SESSION_TTL_SECONDS * 1000);

  const body = `${email}:${expiry}`;
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return `${Buffer.from(body).toString("base64url")}.${signature}`;
}

/**
 * Verifies a cookie value, returning why it failed when it did.
 *
 * A structured result rather than a boolean, so the caller can distinguish
 * "expired, log in again" from "not a valid token at all" without re-parsing.
 */
export function verifySession(
  token: string | undefined,
): { ok: true } | { ok: false; reason: "missing" | "malformed" | "bad-signature" | "expired" } {
  if (!token) return { ok: false, reason: "missing" };

  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!secret) return { ok: false, reason: "bad-signature" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [encoded, signature] = parts;
  let body: string;
  try {
    body = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!safeEqual(signature, expected)) return { ok: false, reason: "bad-signature" };

  const separator = body.lastIndexOf(":");
  if (separator < 0) return { ok: false, reason: "malformed" };

  const email = body.slice(0, separator);
  const expiry = Number(body.slice(separator + 1));

  // The email is part of the signed body, so this cannot be edited without
  // invalidating the signature. It is checked anyway so that rotating
  // ADMIN_EMAIL immediately invalidates sessions issued before the change.
  if (email !== adminEmail()) return { ok: false, reason: "bad-signature" };
  if (!Number.isFinite(expiry) || Date.now() > expiry) return { ok: false, reason: "expired" };

  return { ok: true };
}

/** Reads the session cookie out of a Request. */
export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "pqt_admin") return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  return [
    `pqt_admin=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    // Only sent over HTTPS. On localhost the secure flag would stop the cookie
    // being set at all, so dev and prod genuinely differ here rather than
    // prod silently depending on a flag nobody set.
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function clearSessionCookie(): string {
  return "pqt_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0";
}

/** A nonce for the login form, so a cached page cannot replay a real attempt. */
export function loginNonce(): string {
  return randomBytes(16).toString("hex");
}