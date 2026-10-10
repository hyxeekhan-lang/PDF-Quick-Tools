import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public feedback endpoint.
 *
 * This one earns its tests more than `/api/track` does. Track writes a name
 * and a timestamp; this writes something a person typed, to an endpoint with no
 * authentication, and the value ends up rendered on a dashboard. So the cases
 * that matter here are the ones about what a hostile caller can put in that
 * column.
 */

// Typed with the real argument list so assertions can read `mock.calls[n][2]`
// for the stored comment. An untyped `vi.fn(async () => true)` has a call
// signature of `[]`, and indexing past its end is an error rather than an
// `undefined` at runtime.
const recordFeedback = vi.fn(async (_tool: string, _sentiment: number, _comment: string | null) => true);
const ensureSchema = vi.fn(async () => {});

vi.mock("./_db", () => ({
  recordFeedback: (tool: string, sentiment: number, comment: string | null) =>
    recordFeedback(tool, sentiment, comment),
  ensureSchema: (...args: unknown[]) => ensureSchema(...(args as [])),
  db: () => null,
  dashboard: vi.fn(),
}));

const { POST, GET } = await import("./feedback");

/**
 * A fresh address per call.
 *
 * The limiter is module-level state shared by every test in the file, and the
 * limit here is ten a day — so tests reusing one address would exhaust the
 * bucket partway through and every later assertion would see the rate-limited
 * 202 instead of the 204 it is checking. Each call getting its own address
 * keeps the tests independent of each other's order.
 */
let nextIp = 1;
function freshIp(): string {
  return `203.0.113.${nextIp++}`;
}

function post(body: unknown, ip = freshIp()): Request {
  return new Request("https://pdfpilot.site/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recordFeedback.mockClear();
  recordFeedback.mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/feedback", () => {
  it("records an upvote and a downvote", async () => {
    await POST(post({ tool: "/compress-pdf", sentiment: 1 }));
    await POST(post({ tool: "/merge-pdf", sentiment: -1 }));

    expect(recordFeedback).toHaveBeenNthCalledWith(1, "/compress-pdf", 1, null);
    expect(recordFeedback).toHaveBeenNthCalledWith(2, "/merge-pdf", -1, null);
  });

  it("refuses anything that is not exactly plus or minus one", async () => {
    // A float or a large integer reaching the column would have to be defended
    // against in every aggregate that reads it, so the check happens once here
    // and the stored value stays clean.
    for (const sentiment of [0, 2, -2, 1.5, "1", true, null, [], {}, 1e9]) {
      const response = await POST(post({ tool: "/compress-pdf", sentiment }));
      expect(response.status).toBe(204);
    }

    expect(recordFeedback).not.toHaveBeenCalled();
  });

  it("refuses a tool that does not look like a tool path", async () => {
    for (const tool of [
      "compress-pdf",
      "/Compress-PDF",
      "/compress_pdf",
      "/../etc/passwd",
      "'; DROP TABLE tool_feedback; --",
      "",
    ]) {
      await POST(post({ tool, sentiment: 1 }));
    }

    expect(recordFeedback).not.toHaveBeenCalled();
  });

  it("stores the comment with markup removed", async () => {
    // The comment is rendered on the owner dashboard. React would escape it, but
    // the value should be plain text by the time it is stored rather than plain
    // text because something downstream remembered to escape it.
    await POST(
      post({
        tool: "/compress-pdf",
        sentiment: -1,
        comment: "<img src=x onerror=alert(1)> won't open",
      }),
    );

    expect(recordFeedback).toHaveBeenCalledWith(
      "/compress-pdf",
      -1,
      "img src=x onerror=alert(1) won't open",
    );
  });

  it("drops control characters but keeps quotes", async () => {
    // Terminal-clear and strip sequences are why the C0 and C1 ranges are
    // removed. Quotes are kept: React escapes attribute values, so an
    // apostrophe cannot break out of one, and stripping it would turn
    // "it won't open" into "it won t open".
    await POST(
      post({
        tool: "/compress-pdf",
        sentiment: -1,
        comment: `an[2Jevil"quote's`,
      }),
    );

    const stored = recordFeedback.mock.calls[0]?.[2] as string;
    expect(stored).not.toContain("");
    expect(stored).not.toContain("");
    expect(stored).toContain(String.fromCharCode(34));
    expect(stored).toContain("quote's");
    // What the visitor actually meant survives.
    expect(stored).toContain("evil");
  });

  it("caps the comment at 500 characters", async () => {
    await POST(post({ tool: "/compress-pdf", sentiment: -1, comment: "x".repeat(5000) }));

    const stored = recordFeedback.mock.calls[0]?.[2] as string;
    expect(stored.length).toBeLessThanOrEqual(500);
  });

  it("stores null rather than an empty string for no comment", async () => {
    // The two cases stay distinguishable, so the owner can tell how many people
    // actually wrote something rather than how many pressed the button.
    for (const comment of [undefined, null, "", "   ", 42]) {
      recordFeedback.mockClear();
      await POST(post({ tool: "/compress-pdf", sentiment: 1, comment }));
      expect(recordFeedback).toHaveBeenCalledWith("/compress-pdf", 1, null);
    }
  });

  it("ignores a body that is not the expected shape", async () => {
    for (const body of [{}, { sentiment: 1 }, "not json", [1, 2, 3]]) {
      const response = await POST(post(body));
      expect(response.status).toBe(204);
    }

    expect(recordFeedback).not.toHaveBeenCalled();
  });

  it("answers 204 even when the database write fails", async () => {
    recordFeedback.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await POST(post({ tool: "/compress-pdf", sentiment: 1 }));

    expect(response.status).toBe(204);
  });

  it("rate limits by address without ever storing it", async () => {
    // Ten per day, so the eleventh from one address is refused. The limiter is
    // the only reason this endpoint cannot be used to fill the table.
    const ip = "198.51.100.7";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(post({ tool: "/compress-pdf", sentiment: 1 }, ip))).status).toBe(204);
    }

    expect((await POST(post({ tool: "/compress-pdf", sentiment: 1 }, ip))).status).toBe(202);
    expect(recordFeedback).toHaveBeenCalledTimes(10);
  });

  it("counts each address separately", async () => {
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await POST(post({ tool: "/compress-pdf", sentiment: 1 }, "198.51.100.8"));
    }

    recordFeedback.mockClear();
    expect((await POST(post({ tool: "/compress-pdf", sentiment: 1 }, "198.51.100.9"))).status).toBe(
      204,
    );
    expect(recordFeedback).toHaveBeenCalledOnce();
  });
});

describe("GET /api/feedback", () => {
  it("answers 405 rather than falling through to the SPA shell", async () => {
    // Nothing here should ever be readable by a prober — not the tool names,
    // and not the comments. 405 rather than a 200 with HTML in it.
    const response = GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});