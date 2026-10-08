/**
 * A small fixed-window limiter for the AI endpoint.
 *
 * The endpoint spends money on every call, so it must not be reachable by an
 * unauthenticated script. The `Origin` header on its own proves nothing: curl,
 * Postman and plain `fetch` from a Node script send no Origin at all, and the
 * header is trivially forged from a page on another site. The limiter below is
 * the actual gate.
 *
 * State lives in this module's memory, which on Vercel means per serverless
 * instance and per cold start. That is enough to blunt a scripted burst and to
 * keep one visitor from looping, but it is not a hard global cap. For a hard
 * ceiling, put a Vercel WAF rule on `/api/*` too — see README, "Rate limits".
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Sweep expired buckets so a long-running instance cannot grow without end. */
function sweep(now: number): void {
  if (buckets.size < 512) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Calls allowed per window, per client. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the current window resets. Always at least 1 when blocked. */
  retryAfterSeconds: number;
}

/** The visitor's IP, preferring the platform's forwarding header. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // A client can prepend a fake entry, so the rightmost address — the one
    // the edge actually observed — is the one that was not under their control.
    const chain = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (chain.length > 0) return chain[chain.length - 1]!;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Counts one call against `key`. Returns whether it is allowed; when it is not,
 * the caller should answer 429 with the returned `retryAfterSeconds`.
 */
export function takeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: options.limit - bucket.count, retryAfterSeconds: 0 };
}

/** Standard headers so a client can back off without guessing. */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.ok) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}