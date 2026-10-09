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
    };
  }

  await ensureSchema();

  const [totals, byDay, byTool, recent] = await Promise.all([
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
  ]);

  const t = totals[0];

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
  };
}