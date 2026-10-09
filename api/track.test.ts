import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public write endpoint.
 *
 * Two things are worth testing here and they are the two things that could go
 * wrong in a way nobody would notice from the panel: an unknown tool name must
 * never reach the table, and the endpoint must never fail visibly — a visitor
 * who came to open a tool does not care whether the count went up, and a
 * database outage must not become a broken page.
 */

const recordVisit = vi.fn(async () => true);
const ensureSchema = vi.fn(async () => {});

vi.mock("./_db", () => ({
  recordVisit: (...args: unknown[]) => recordVisit(...(args as [])),
  ensureSchema: (...args: unknown[]) => ensureSchema(...(args as [])),
  dashboard: vi.fn(),
}));

const { POST, GET } = await import("./track");

function post(body: unknown, ip = "203.0.113.1"): Request {
  return new Request("https://pdfpilot.site/api/track", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recordVisit.mockClear();
  recordVisit.mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/track", () => {
  it("records a tool that exists", async () => {
    const response = await POST(post({ tool: "/compress-pdf" }));

    expect(response.status).toBe(204);
    expect(recordVisit).toHaveBeenCalledWith("/compress-pdf");
  });

  it("ignores a tool that is not in the catalogue", async () => {
    // A crafted body must not be able to invent rows. The dashboard is grouped
    // by tool, so arbitrary strings here would both pollute it and let anyone
    // grow the table with whatever text they liked.
    for (const tool of [
      "not-a-tool",
      "/../etc/passwd",
      "'; DROP TABLE tool_visits; --",
      "x".repeat(5000),
      "",
    ]) {
      const response = await POST(post({ tool }));
      expect(response.status).toBe(204);
    }

    expect(recordVisit).not.toHaveBeenCalled();
  });

  it("ignores a body that is not the expected shape", async () => {
    for (const body of [{}, { tool: 42 }, { tool: null }, { tool: ["/compress-pdf"] }]) {
      const response = await POST(post(body));
      expect(response.status).toBe(204);
    }
    expect(recordVisit).not.toHaveBeenCalled();
  });

  it("does not record when the body cannot be parsed", async () => {
    const response = await POST(post("{not json"));
    expect(response.status).toBe(204);
    expect(recordVisit).not.toHaveBeenCalled();
  });

  it("answers 204 even when the database write fails", async () => {
    // The failure mode that matters: the database is down, and the alternative
    // is a visitor being shown an error because an analytics row did not save.
    recordVisit.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await POST(post({ tool: "/compress-pdf" }));

    expect(response.status).toBe(204);
  });

  it("rate limits by address without ever storing it", async () => {
    const ip = "198.51.100.7";
    // 60 allowed per minute; the 61st is refused. The limiter is the only
    // reason this endpoint cannot be used to grow the table for free.
    for (let attempt = 0; attempt < 60; attempt += 1) {
      expect((await POST(post({ tool: "/compress-pdf" }, ip))).status).toBe(204);
    }

    const blocked = await POST(post({ tool: "/compress-pdf" }, ip));
    expect(blocked.status).toBe(202);

    // 202 rather than 204: the caller has already done the thing it came to do,
    // and a rejection here would produce a retry loop against a server that is
    // working exactly as designed.
    expect(recordVisit).toHaveBeenCalledTimes(60);
  });

  it("counts each address separately", async () => {
    for (let attempt = 0; attempt < 61; attempt += 1) {
      await POST(post({ tool: "/compress-pdf" }, "198.51.100.8"));
    }
    expect(recordVisit).toHaveBeenCalledTimes(60);

    recordVisit.mockClear();
    expect((await POST(post({ tool: "/compress-pdf" }, "198.51.100.9"))).status).toBe(204);
    expect(recordVisit).toHaveBeenCalledOnce();
  });
});

describe("GET /api/track", () => {
  it("answers 405 rather than falling through to the SPA shell", async () => {
    // Anything other than 405 here is an endpoint a prober will assume is a
    // page, and a 200 with HTML in it is what that assumption is built on.
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});