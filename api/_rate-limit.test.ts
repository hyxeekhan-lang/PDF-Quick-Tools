import { describe, expect, it } from "vitest";
import { clientIp, rateLimitHeaders, takeRateLimit } from "./_rate-limit";

/** A window short enough to keep the tests fast. */
const WINDOW = { limit: 3, windowMs: 50 };

function req(headers: Record<string, string>): Request {
  return new Request("https://pdfpilot.site/api/ask-gemini", { headers });
}

describe("clientIp", () => {
  it("uses the forwarding header when the edge supplies one", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("takes the address the edge observed, not one the caller prepended", () => {
    // A script controls the left-hand entries but not the one Vercel appends,
    // so trusting the leftmost would let it forge a bucket.
    const req2 = req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(clientIp(req2)).toBe("9.10.11.12");
  });

  it("copes with spaces and empty entries", () => {
    expect(clientIp(req({ "x-forwarded-for": " 203.0.113.9 , , " }))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("does not throw when no proxy header is present", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("takeRateLimit", () => {
  it("allows exactly `limit` calls, then blocks", () => {
    const key = `allow-${Math.random()}`;
    expect(takeRateLimit(key, WINDOW).ok).toBe(true);
    expect(takeRateLimit(key, WINDOW).ok).toBe(true);
    expect(takeRateLimit(key, WINDOW).ok).toBe(true);
    expect(takeRateLimit(key, WINDOW).ok).toBe(false);
  });

  it("counts down what is left", () => {
    const key = `remaining-${Math.random()}`;
    expect(takeRateLimit(key, WINDOW).remaining).toBe(2);
    expect(takeRateLimit(key, WINDOW).remaining).toBe(1);
    expect(takeRateLimit(key, WINDOW).remaining).toBe(0);
  });

  it("counts separate keys separately", () => {
    const suffix = Math.random();
    for (let i = 0; i < WINDOW.limit; i += 1) takeRateLimit(`a-${suffix}`, WINDOW);
    expect(takeRateLimit(`a-${suffix}`, WINDOW).ok).toBe(false);
    // A second visitor must not inherit the first one's exhausted bucket.
    expect(takeRateLimit(`b-${suffix}`, WINDOW).ok).toBe(true);
  });

  it("tells the caller how long to wait", () => {
    const key = `retry-${Math.random()}`;
    for (let i = 0; i < WINDOW.limit; i += 1) takeRateLimit(key, WINDOW);
    const blocked = takeRateLimit(key, WINDOW);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("starts a fresh window once the old one expires", async () => {
    const key = `expiry-${Math.random()}`;
    for (let i = 0; i < WINDOW.limit; i += 1) takeRateLimit(key, WINDOW);
    expect(takeRateLimit(key, WINDOW).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, WINDOW.windowMs + 20));
    expect(takeRateLimit(key, WINDOW).ok).toBe(true);
  });

  it("does not extend the window when calls keep arriving", () => {
    // A fixed window must not roll forward on activity, or a caller ticking
    // slowly could stay above the limit indefinitely.
    const key = `fixed-${Math.random()}`;
    for (let i = 0; i < WINDOW.limit; i += 1) takeRateLimit(key, WINDOW);
    const resetAt = Date.now();
    expect(takeRateLimit(key, WINDOW).ok).toBe(false);
    expect(Date.now() - resetAt).toBeLessThan(WINDOW.windowMs);
  });
});

describe("rateLimitHeaders", () => {
  it("advertises the limit and what is left", () => {
    const headers = rateLimitHeaders({ ok: true, remaining: 7, retryAfterSeconds: 0 }, 30);
    expect(headers["X-RateLimit-Limit"]).toBe("30");
    expect(headers["X-RateLimit-Remaining"]).toBe("7");
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("adds Retry-After only when blocked", () => {
    const headers = rateLimitHeaders({ ok: false, remaining: 0, retryAfterSeconds: 42 }, 30);
    expect(headers["Retry-After"]).toBe("42");
  });
});