import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  adminConfigured,
  checkLoginRate,
  clearSessionCookie,
  issueSession,
  readSessionCookie,
  safeEqual,
  sessionCookie,
  verifySession,
} from "./_admin-auth";

/**
 * The session and comparison behaviour, with the environment stubbed.
 *
 * These are the checks that decide whether a password protects anything. The
 * rate limiter is included because a login endpoint with no attempt cap is not
 * a login endpoint, it is a suggestion.
 */

const SAVED = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_EMAIL = "Owner@Example.COM";
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
  process.env.ADMIN_SESSION_SECRET = "test-secret-value";
  // Each test gets a fresh client IP so one test's attempts cannot exhaust
  // another's allowance.
  nextIp = 1;
});

afterEach(() => {
  process.env = { ...SAVED };
});

let nextIp = 1;
function uniqueIp(): string {
  return `203.0.113.${nextIp++}`;
}

describe("safeEqual", () => {
  it("accepts identical secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("rejects secrets that differ anywhere", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ABC")).toBe(false);
    expect(safeEqual("", "a")).toBe(false);
    expect(safeEqual("a", "")).toBe(false);
  });
});

describe("adminConfigured", () => {
  it("is true when all three variables are present", () => {
    expect(adminConfigured()).toBe(true);
  });

  it("is false when any one is missing", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(adminConfigured()).toBe(false);

    process.env.ADMIN_PASSWORD = "x";
    delete process.env.ADMIN_SESSION_SECRET;
    expect(adminConfigured()).toBe(false);
  });

  it("treats an empty string as unset", () => {
    // Vercel can hold a variable with an empty value rather than none at all,
    // and "configured" would otherwise be true with nothing to compare against.
    process.env.ADMIN_PASSWORD = "";
    expect(adminConfigured()).toBe(false);
  });
});

describe("session tokens", () => {
  it("verifies a freshly issued token", () => {
    expect(verifySession(issueSession()).ok).toBe(true);
  });

  it("rejects a missing token", () => {
    expect(verifySession(undefined)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a malformed token", () => {
    expect(verifySession("no-dot-here")).toEqual({ ok: false, reason: "malformed" });
    expect(verifySession("a.b.c")).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a token whose signature was edited", () => {
    const token = issueSession();
    const forged = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(verifySession(forged).ok).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueSession();
    process.env.ADMIN_SESSION_SECRET = "a-different-secret";
    expect(verifySession(token)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rejects a token minted for a different address", () => {
    // Rotating ADMIN_EMAIL has to log the old session out, not keep it alive.
    const token = issueSession();
    process.env.ADMIN_EMAIL = "someone-else@example.com";
    expect(verifySession(token)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("normalises the address, so casing cannot lock the owner out", () => {
    const token = issueSession();
    process.env.ADMIN_EMAIL = "owner@example.com";
    expect(verifySession(token).ok).toBe(true);
  });

  it("rejects an expired token", () => {
    // Signed correctly, so the only thing wrong with it is the timestamp. An
    // expired token that also failed its signature would prove nothing about
    // expiry handling.
    const expiredAt = `owner@example.com:${Date.now() - 1000}`;
    const body = Buffer.from(expiredAt).toString("base64url");
    const signature = createHmac("sha256", "test-secret-value")
      .update(expiredAt)
      .digest("hex");

    expect(verifySession(`${body}.${signature}`)).toEqual({ ok: false, reason: "expired" });
  });

  it("cannot have its expiry extended without breaking the signature", () => {
    // The whole point of signing the expiry rather than reading it separately.
    const token = issueSession();
    const farFuture = Buffer.from(
      `owner@example.com:${Date.now() + 10 * 365 * 24 * 60 * 60 * 1000}`,
    ).toString("base64url");

    expect(verifySession(`${farFuture}.${token.split(".")[1]}`).ok).toBe(false);
  });
});

describe("session cookies", () => {
  it("round-trips through a Cookie header", () => {
    const request = new Request("https://pdfpilot.site/admin", {
      headers: { cookie: sessionCookie(issueSession()) },
    });
    expect(readSessionCookie(request)).toMatch(/^[\w-]+\.[0-9a-f]{64}$/);
  });

  it("is HttpOnly and SameSite=Strict", () => {
    // HttpOnly is what keeps the token out of reach of any script on the page;
    // SameSite=Strict is what keeps another site from triggering the panel's
    // GET with the cookie attached.
    const cookie = sessionCookie(issueSession());
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("clears with a zero max-age", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });

  it("survives other cookies being present", () => {
    const request = new Request("https://pdfpilot.site/admin", {
      headers: { cookie: `theme=dark; ${sessionCookie(issueSession())}; other=1` },
    });
    expect(verifySession(readSessionCookie(request)).ok).toBe(true);
  });
});

describe("login rate limiting", () => {
  it("allows attempts up to the limit and then blocks", () => {
    const ip = uniqueIp();
    // The limit is 8 per 15 minutes; the 9th is the one that has to fail.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(checkLoginRate(ip).ok).toBe(true);
    }
    const blocked = checkLoginRate(ip);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps addresses in separate buckets", () => {
    const attacker = uniqueIp();
    for (let attempt = 0; attempt < 9; attempt += 1) checkLoginRate(attacker);

    // One address exhausting its budget must not lock the owner out.
    expect(checkLoginRate(uniqueIp()).ok).toBe(true);
  });
});