import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public read side of reviews.
 *
 * Everything written here becomes public copy on a live page, so the cases that
 * matter are the ones about what a hostile or careless caller can cause to
 * appear: link spam, an over-long row, a request for somebody else's tool, and
 * the state where the database is not configured at all.
 */

type Stored = { total: number; comments: { text: string; at: string; rating: number | null }[] };

const publicFeedback = vi.fn<(tool: string, limit?: number) => Promise<Stored | null>>(
  async () => ({
    total: 2,
    comments: [
      { text: "Shrank a 40 MB invoice to 2 MB instantly.", at: "2026-10-08T10:00:00.000Z", rating: 5 },
      { text: "Worked exactly as described.", at: "2026-10-09T10:00:00.000Z", rating: null },
    ],
  }),
);

vi.mock("./_db", () => ({
  publicFeedback: (tool: string, limit?: number) => publicFeedback(tool, limit),
  db: () => ({}),
  ensureSchema: vi.fn(),
  recordFeedback: vi.fn(),
  dashboard: vi.fn(),
}));

vi.mock("./_rate-limit", () => ({
  takeRateLimit: () => ({ ok: true, remaining: 59 }),
  clientIp: (request: Request) =>
    (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim(),
}));

const { GET } = await import("./reviews");

function get(query: string): Request {
  return new Request(`https://pdfpilot.site/api/reviews${query}`);
}

async function body(response: Response) {
  return (await response.json()) as {
    configured: boolean;
    total: number;
    comments: { text: string; at: string; rating: number | null }[];
    error?: string;
  };
}

beforeEach(() => {
  publicFeedback.mockClear();
  publicFeedback.mockResolvedValue({
    total: 2,
    comments: [
      { text: "Shrank a 40 MB invoice to 2 MB instantly.", at: "2026-10-08T10:00:00.000Z", rating: 5 },
      { text: "Worked exactly as described.", at: "2026-10-09T10:00:00.000Z", rating: null },
    ],
  });
});

describe("GET /api/reviews", () => {
  it("returns the stored comments for a valid tool", async () => {
    const response = await GET(get("?tool=/compress-pdf"));

    expect(response.status).toBe(200);
    const data = await body(response);
    expect(data.comments).toHaveLength(2);
    expect(data.comments[0]!.text).toContain("40 MB");
    expect(data.comments[0]!.rating).toBe(5);
  });

  it("serves homepage reviews from the root path", async () => {
    const response = await GET(get("?tool=%2F"));

    expect(response.status).toBe(200);
    expect(publicFeedback).toHaveBeenCalledWith("/", 20);
  });

  it("refuses a tool that is not a tool path", async () => {
    // No catalog check is possible in a function, so this is the same shape
    // check /api/feedback and /api/track use.
    for (const tool of [
      "compress-pdf",
      "/Compress-PDF",
      "/../etc/passwd",
      "/compress-pdf;DROP TABLE tool_feedback",
      "",
    ]) {
      const response = await GET(get(`?tool=${encodeURIComponent(tool)}`));
      expect(response.status).toBe(400);
    }

    expect(publicFeedback).not.toHaveBeenCalled();
  });

  it("drops comments carrying a link or an @-handle", async () => {
    // The realistic spam shape for an anonymous comment box: a URL and a
    // contact handle. Legitimate remarks about a PDF tool almost never do.
    publicFeedback.mockResolvedValue({
      total: 4,
      comments: [
        { text: "Fast and clean, exactly what I needed.", at: "2026-10-09T10:00:00.000Z", rating: 4 },
        { text: "great tool visit https://spam.example", at: "2026-10-09T09:00:00.000Z", rating: null },
        { text: "also check www.spam.example", at: "2026-10-09T08:00:00.000Z", rating: null },
        { text: "reach me at me@spam.example", at: "2026-10-09T07:00:00.000Z", rating: null },
      ],
    });

    const data = await body(await GET(get("?tool=/compress-pdf")));

    expect(data.comments).toHaveLength(1);
    expect(data.comments[0]!.text).toContain("Fast and clean");
  });

  it("keeps criticism — the negative review is not the spam", async () => {
    publicFeedback.mockResolvedValue({
      total: 1,
      comments: [{ text: "It did not compress my file at all.", at: "2026-10-09T10:00:00.000Z", rating: 1 }],
    });

    const data = await body(await GET(get("?tool=/compress-pdf")));

    expect(data.comments).toHaveLength(1);
    expect(data.comments[0]!.text).toContain("did not compress");
  });

  it("reports an unconfigured install rather than an empty review list", async () => {
    // "Nobody has reviewed this" and "this install cannot store reviews" are
    // different facts. Collapsing them would show a visitor an empty section
    // that reads as a broken feature.
    publicFeedback.mockResolvedValue(null);

    const data = await body(await GET(get("?tool=/compress-pdf")));

    expect(data.configured).toBe(false);
    expect(data.comments).toEqual([]);
  });

  it("answers an empty list honestly when there are genuinely no reviews", async () => {
    publicFeedback.mockResolvedValue({ total: 0, comments: [] });

    const data = await body(await GET(get("?tool=/compress-pdf")));

    expect(data.configured).toBe(true);
    expect(data.total).toBe(0);
    expect(data.comments).toEqual([]);
  });

  it("does not leak a database failure to the page", async () => {
    publicFeedback.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET(get("?tool=/compress-pdf"));

    expect(response.status).toBe(200);
    const data = await body(response);
    expect(data.configured).toBe(false);
  });

  it("caches briefly so reviews are not one query per visitor", async () => {
    const response = await GET(get("?tool=/compress-pdf"));

    expect(response.headers.get("cache-control")).toContain("s-maxage");
  });

  it("caps how many rows one request can return", async () => {
    await GET(get("?tool=/compress-pdf&limit=5000"));

    // The caller's limit parameter is never forwarded; the ceiling is the
    // server's, so an anonymous caller cannot ask for the whole table.
    expect(publicFeedback).toHaveBeenCalledWith("/compress-pdf", 20);
  });
});