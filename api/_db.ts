/**
 * The analytics store.
 *
 * One table, one row per tool visit. That is the whole schema, and the smallness
 * is the point rather than a limitation to work around later.
 *
 * ## Why so little is recorded
 *
 * This site's product claim is that files are processed in the visitor's browser
 * and never uploaded. A privacy policy and a set of analytics rows are both
 * claims about what leaves the device, and if they disagree the site is lying
 * about one of them. So this table stores exactly three columns' worth of
 * meaning: which tool, and when. No IP, no user agent, no referrer, no filename,
 * no page count, no document text, no cookie or identifier of any kind.
 *
 * That constraint is what makes "we don't track you" true rather than marketing.
 * It also happens to be all that is needed for the questions an owner of a tools
 * site actually asks: what is being used, and is it growing.
 *
 * There is deliberately no UNIQUE constraint on anything. An aggregate count is
 * derived at query time, so a visitor who runs compress three times reads as
 * three runs — which is the truthful answer to "how much is this tool used".
 *
 * ## The feedback table
 *
 * A second table holds what people wrote about a tool. It is worth separating
 * from `tool_visits` rather than adding columns, because the two have different
 * rules: a visit row is written automatically on every page open and stores
 * nothing, while a feedback row stores something a person typed. That text is
 * the one piece of this site that ever contains words from a human, so it gets
 * its own table, its own validation, and its own explicit limits.
 *
 * What is stored: the tool path, a legacy sentiment vote, an optional star
 * rating, a short comment, and the time. No IP, no email, no cookie, no
 * identifier — same position as the visits table. The comment is the exception
 * to "only names and timestamps" and is the reason the length limit below is strict: an unbounded
 * free-text column on an unauthenticated endpoint is a place people put things
 * they should not.
 */

import postgres from "postgres";

export interface VisitRow {
  tool: string;
  day: string;
  count: number;
}

let client: ReturnType<typeof postgres> | null = null;

/**
 * A pooled connection, or null when no database is configured.
 *
 * Returning null rather than throwing is what keeps the site deployable without
 * a database: the track endpoint reports "not recorded" and every public page
 * continues to work. A missing POSTGRES_URL must never be able to take the
 * homepage down, because the homepage has nothing to do with analytics.
 */
export function db(): ReturnType<typeof postgres> | null {
  const url = process.env.POSTGRES_URL;
  if (!url) return null;
  if (!client) {
    client = postgres(url, {
      max: 2,
      idle_timeout: 20,
      // Analytics rows are worthless a second late. Waiting for a busy pool to
      // free up would turn a slow database into a failed request.
      connect_timeout: 10,
      prepare: false,
    });
  }
  return client;
}

/**
 * Creates the table if it is not there yet.
 *
 * Called on read paths rather than from a migration step, because a migration
 * command is something that has to be remembered and run; this way the panel
 * works the first time it is opened and after every restore from backup.
 * `CREATE TABLE IF NOT EXISTS` is safe to race — two concurrent calls are fine.
 */
export async function ensureSchema(): Promise<void> {
  const sql = db();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS tool_visits (
      id         bigserial PRIMARY KEY,
      tool       text        NOT NULL,
      happened_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  // The dashboard's main query is "count by tool since date X", and the
  // secondary one is "count by day". Both sort on happened_at.
  await sql`
    CREATE INDEX IF NOT EXISTS tool_visits_happened_at_idx
      ON tool_visits (happened_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS tool_visits_tool_happened_at_idx
      ON tool_visits (tool, happened_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tool_feedback (
      id         bigserial PRIMARY KEY,
      tool       text        NOT NULL,
      sentiment  smallint    NOT NULL,
      rating     smallint,
      comment    text,
      happened_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE tool_feedback
      ADD COLUMN IF NOT EXISTS rating smallint
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS signature_requests (
      id bigserial PRIMARY KEY,
      provider_request_id text NOT NULL UNIQUE,
      token_hash text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS signature_requests_expiry_idx
      ON signature_requests (expires_at)
  `;
  // One query reads the newest feedback; the other aggregates it by tool.
  await sql`
    CREATE INDEX IF NOT EXISTS tool_feedback_happened_at_idx
      ON tool_feedback (happened_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS tool_feedback_tool_idx
      ON tool_feedback (tool, happened_at DESC)
  `;
}

export async function saveSignatureRequest(
  providerRequestId: string,
  tokenHash: string,
): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  await ensureSchema();
  await sql`
    DELETE FROM signature_requests
    WHERE expires_at < now()
  `;
  await sql`
    INSERT INTO signature_requests (provider_request_id, token_hash, expires_at)
    VALUES (${providerRequestId}, ${tokenHash}, now() + interval '30 days')
  `;
  return true;
}

export async function findSignatureRequest(tokenHash: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  await ensureSchema();
  const rows = await sql<{ provider_request_id: string }[]>`
    SELECT provider_request_id
    FROM signature_requests
    WHERE token_hash = ${tokenHash} AND expires_at > now()
    LIMIT 1
  `;
  return rows[0]?.provider_request_id ?? null;
}

/**
 * Records one tool visit.
 *
 * The tool name is matched against the site's own catalogue by the caller
 * before it gets here, so a crafted request cannot invent tool names that would
 * then dominate the dashboard.
 */
export async function recordVisit(tool: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  await ensureSchema();
  await sql`INSERT INTO tool_visits (tool) VALUES (${tool})`;
  return true;
}

/**
 * Records one piece of feedback.
 *
 * The comment is trimmed and length-capped here as well as at the endpoint, so
 * that the limit holds no matter which caller gets there first. `null` rather
 * than an empty string for "no comment", so the two cases stay distinguishable
 * when counting how many people actually wrote something.
 */
export async function recordFeedback(
  tool: string,
  sentiment: number,
  comment: string | null,
  rating: number | null = null,
): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  await ensureSchema();
  await sql`
    INSERT INTO tool_feedback (tool, sentiment, rating, comment)
    VALUES (${tool}, ${sentiment}, ${rating}, ${comment})
  `;
  return true;
}

export interface FeedbackRow {
  tool: string;
  sentiment: number;
  comment: string | null;
  at: string;
}

/**
 * Public, per-tool review data for the homepage and tool pages.
 *
 * This is the first place anything recorded by an anonymous visitor is read
 * back out, so it is deliberately narrower than `dashboard()`:
 *
 *  - Comments only, never a bare thumbs up/down. A one-bit vote with no text is
 *    not a review, and publishing "Anonymous · 2 days ago" for someone who
 *    pressed a button would be inventing a testimonial they did not write.
 *  - Sentiment is **not** returned. A negative comment is real feedback and is
 *    shown as written; hiding the downvotes to make the page look better than
 *    the feedback would be the dishonest version of a review section.
 *  - Rows are selected by tool path, capped, and shaped at the column level —
 *    there is no `SELECT *` here to accidentally grow an identifier into.
 *  - With no database configured this returns `null` so the caller renders
 *    nothing, rather than rendering an empty section that looks broken.
 */
export async function publicFeedback(
  tool: string,
  limit = 12,
): Promise<{ total: number; comments: { text: string; at: string; rating: number | null }[] } | null> {
  const sql = db();
  if (!sql) return null;
  await ensureSchema();

  const rows = (await sql`
    SELECT
      COUNT(comment)::text AS total,
      COALESCE(
        json_agg(json_build_object('text', comment, 'at', happened_at, 'rating', rating))
          FILTER (WHERE comment IS NOT NULL),
        '[]'::json
      ) AS comments
    FROM (
      SELECT comment, happened_at, rating
      FROM tool_feedback
      WHERE tool = ${tool} AND comment IS NOT NULL
      ORDER BY happened_at DESC
      LIMIT ${limit}
    ) recent
  `) as unknown as { total: string; comments: { text: string; at: string; rating: number | null }[] }[];

  const row = rows[0];
  if (!row) return null;

  // json_agg over a subquery that matched nothing returns an empty array with a
  // count of 0, which is a real answer: this tool has no written reviews yet.
  const comments = Array.isArray(row.comments)
    ? row.comments.map((c: { text: string; at: string; rating?: number | null }) => ({
        text: String(c.text ?? ""),
        at: String(c.at ?? ""),
        rating: c.rating == null ? null : Number(c.rating),
      }))
    : [];

  return { total: Number(row.total ?? 0), comments };
}

export interface FeedbackSummary {
  tool: string;
  up: number;
  down: number;
}

export interface DashboardData {
  /** False when POSTGRES_URL is absent, so the panel can say so plainly. */
  configured: boolean;
  totals: {
    today: number;
    yesterday: number;
    last7: number;
    previous7: number;
    allTime: number;
  };
  byDay: Array<{ day: string; count: number }>;
  byTool: Array<{ tool: string; count: number }>;
  /** Most recent rows, newest first. Tool name and time only. */
  recent: Array<{ tool: string; at: string }>;
  feedback: {
    total: number;
    up: number;
    down: number;
    byTool: FeedbackSummary[];
    recent: FeedbackRow[];
  };
}

const DAY = "day";

/**
 * Builds everything the panel renders, in one round trip.
 *
 * All five queries run concurrently rather than in sequence. They are
 * independent reads against one small table, so sequencing them would just add
 * five connection waits to a page that opens on every refresh.
 */
export async function dashboard(days: number): Promise<DashboardData> {
  const sql = db();
  if (!sql) {
    return {
      configured: false,
      totals: { today: 0, yesterday: 0, last7: 0, previous7: 0, allTime: 0 },
      byDay: [],
      byTool: [],
      recent: [],
      feedback: { total: 0, up: 0, down: 0, byTool: [], recent: [] },
    };
  }

  await ensureSchema();

  const [totals, byDay, byTool, recent, feedbackTotals, feedbackByTool, feedbackRecent] =
    await Promise.all([
    sql<
      Array<{ today: string; yesterday: string; last7: string; previous7: string; all_time: string }>
    >`
      SELECT
        count(*) FILTER (WHERE happened_at >= date_trunc(${DAY}, now()))::text                    AS today,
        count(*) FILTER (WHERE happened_at >= date_trunc(${DAY}, now()) - interval '1 day'
                         AND happened_at <  date_trunc(${DAY}, now()))::text                     AS yesterday,
        count(*) FILTER (WHERE happened_at >= now() - interval '7 days')::text                       AS last7,
        count(*) FILTER (WHERE happened_at >= now() - interval '14 days'
                         AND happened_at <  now() - interval '7 days')::text                       AS previous7,
        count(*)::text                                                                              AS all_time
      FROM tool_visits
    `,
    sql<Array<{ day: string; count: string }>>`
      SELECT to_char(date_trunc(${DAY}, happened_at), 'YYYY-MM-DD') AS day, count(*)::text AS count
      FROM tool_visits
      WHERE happened_at >= now() - make_interval(days => ${days})
      GROUP BY 1
      ORDER BY 1
    `,
    sql<Array<{ tool: string; count: string }>>`
      SELECT tool, count(*)::text AS count
      FROM tool_visits
      WHERE happened_at >= now() - make_interval(days => ${days})
      GROUP BY tool
      ORDER BY count(*) DESC, tool ASC
    `,
    sql<Array<{ tool: string; at: Date }>>`
      SELECT tool, happened_at AS at
      FROM tool_visits
      ORDER BY happened_at DESC
      LIMIT 25
    `,
    sql<Array<{ total: string; up: string; down: string }>>`
      SELECT
        count(*)::text                                            AS total,
        count(*) FILTER (WHERE sentiment > 0)::text               AS up,
        count(*) FILTER (WHERE sentiment < 0)::text               AS down
      FROM tool_feedback
      WHERE happened_at >= now() - make_interval(days => ${days})
    `,
    sql<Array<{ tool: string; up: string; down: string }>>`
      SELECT tool,
             count(*) FILTER (WHERE sentiment > 0)::text AS up,
             count(*) FILTER (WHERE sentiment < 0)::text AS down
      FROM tool_feedback
      WHERE happened_at >= now() - make_interval(days => ${days})
      GROUP BY tool
      ORDER BY count(*) DESC, tool ASC
    `,
    sql<Array<{ tool: string; sentiment: number; comment: string | null; at: Date }>>`
      SELECT tool, sentiment, comment, happened_at AS at
      FROM tool_feedback
      WHERE happened_at >= now() - make_interval(days => ${days})
      ORDER BY happened_at DESC
      LIMIT 25
    `,
  ]);

  const t = totals[0];
  const f = feedbackTotals[0];

  return {
    configured: true,
    totals: {
      today: Number(t?.today ?? 0),
      yesterday: Number(t?.yesterday ?? 0),
      last7: Number(t?.last7 ?? 0),
      previous7: Number(t?.previous7 ?? 0),
      allTime: Number(t?.all_time ?? 0),
    },
    byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    byTool: byTool.map((r) => ({ tool: r.tool, count: Number(r.count) })),
    recent: recent.map((r) => ({ tool: r.tool, at: r.at.toISOString() })),
    feedback: {
      total: Number(f?.total ?? 0),
      up: Number(f?.up ?? 0),
      down: Number(f?.down ?? 0),
      byTool: feedbackByTool.map((r) => ({
        tool: r.tool,
        up: Number(r.up),
        down: Number(r.down),
      })),
      recent: feedbackRecent.map((r) => ({
        tool: r.tool,
        sentiment: Number(r.sentiment),
        comment: r.comment,
        at: r.at.toISOString(),
      })),
    },
  };
}