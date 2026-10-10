import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckIcon, LockIcon } from "#/components/Icons";
import { button, card, heading, muted, sectionWrap } from "#/components/ui";

/**
 * The owner's dashboard.
 *
 * ## What it shows, and what it deliberately does not
 *
 * Tool usage: how many times each tool was opened, over time, in total. That is
 * the whole dataset, and it is the whole dataset upstream too — the server
 * stores a tool path and a timestamp and nothing else, so there is no visitor
 * table, no session table and no way to answer "who was that".
 *
 * The privacy page says files are processed in the browser and never uploaded.
 * This panel is the visible consequence of that: an owner's view of their own
 * traffic that contains nobody's traffic.
 *
 * ## Access
 *
 * A password against `ADMIN_PASSWORD`, gated on `ADMIN_EMAIL`, held in an
 * HttpOnly cookie. No account is created for anyone, no email is sent, and the
 * password never leaves the server. See `api/_admin-auth.ts`.
 *
 * ## Why it is prerendered
 *
 * Every route in this app is prerendered, so the shell ships as static HTML and
 * fetches after mount. That is what makes this safe: the numbers are never in
 * the HTML that a crawler or a shared link could pick up. The prerendered page
 * is the login form and nothing else.
 */

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Owner dashboard." },
    ],
  }),
  component: AdminPage,
});

interface Totals {
  today: number;
  yesterday: number;
  last7: number;
  previous7: number;
  allTime: number;
}

interface FeedbackRow {
  tool: string;
  sentiment: number;
  comment: string | null;
  at: string;
}

interface Dashboard {
  configured: boolean;
  totals: Totals;
  byDay: Array<{ day: string; count: number }>;
  byTool: Array<{ tool: string; count: number }>;
  recent: Array<{ tool: string; at: string }>;
  feedback: {
    total: number;
    up: number;
    down: number;
    byTool: Array<{ tool: string; up: number; down: number }>;
    recent: FeedbackRow[];
  };
}

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export function AdminPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin?days=${range}`, {
        credentials: "same-origin",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "The numbers could not be loaded.");
        setData(null);
        return;
      }
      setData(body as Dashboard);
    } catch {
      setError("The server could not be reached.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Every route here is prerendered, so there is nothing to show until this
  // runs. Reading the session during render instead would make the server and
  // client markup disagree.
  useEffect(() => {
    void load(days);
  }, [load, days]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setSigningIn(true);
    setSignInError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSignInError(body?.error ?? "That did not work.");
        return;
      }
      setPassword("");
      await load(days);
    } catch {
      setSignInError("The server could not be reached.");
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin", { method: "DELETE", credentials: "same-origin" }).catch(
      () => {},
    );
    setData(null);
    await load(days);
  }

  return (
    <div className={`${sectionWrap} py-12 sm:py-16`}>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={heading.h1}>Owner dashboard</h1>
            <p className={`mt-2 ${muted}`}>
              Tool usage only — which tool was opened, and when. No visitor
              records, because the site keeps none.
            </p>
          </div>
          {data && (
            <button type="button" onClick={signOut} className={button("secondary", "sm")}>
              Sign out
            </button>
          )}
        </div>

        {loading && !data && (
          <p className={`mt-10 ${muted}`}>Loading…</p>
        )}

        {!loading && !data && (
          <form onSubmit={signIn} className={`mt-10 ${card} p-6`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
              <LockIcon className="h-4 w-4" />
              Sign in
            </div>

            {signInError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50/70 px-4 py-3 text-sm text-ink-700 dark:bg-red-950/25 dark:text-ink-300"
              >
                {signInError}
              </p>
            )}

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink-800 dark:text-ink-100">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-ink-900 dark:ring-ink-700"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-800 dark:text-ink-100">
                  Password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-ink-900 dark:ring-ink-700"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className={`${button("primary", "lg")} mt-6 w-full`}
            >
              {signingIn ? "Checking…" : "Sign in"}
            </button>

            <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">
              Set by <code className="font-mono">ADMIN_EMAIL</code> and{" "}
              <code className="font-mono">ADMIN_PASSWORD</code> on the deployment.
              There is no account to register for and no email is sent — a wrong
              password or a wrong address gets the same reply.
            </p>
          </form>
        )}

        {data && (
          <>
            {!data.configured && (
              <p className="mt-8 rounded-xl border-l-4 border-amber-500 bg-amber-50/70 px-4 py-3 text-sm text-ink-700 dark:bg-amber-950/25 dark:text-ink-300">
                Signed in, but no <code className="font-mono">POSTGRES_URL</code>{" "}
                is set, so nothing is being recorded yet. Add the database and
                redeploy.
              </p>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Today" value={data.totals.today} compare={data.totals.yesterday} />
              <Stat label="Last 7 days" value={data.totals.last7} compare={data.totals.previous7} />
              <Stat label="All time" value={data.totals.allTime} />
              <Stat
                label="Tools used"
                value={data.byTool.length}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {RANGES.map((range) => (
                <button
                  key={range.days}
                  type="button"
                  onClick={() => setDays(range.days)}
                  className={button(days === range.days ? "primary" : "secondary", "sm")}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <section aria-labelledby="chart-heading" className={`mt-8 ${card} p-6`}>
              <h2 id="chart-heading" className={heading.h3}>
                Daily visits
              </h2>
              <DayChart rows={data.byDay} />
            </section>

            <section aria-labelledby="tools-heading" className={`mt-6 ${card} p-6`}>
              <h2 id="tools-heading" className={heading.h3}>
                Tools used
              </h2>
              {data.byTool.length === 0 ? (
                <p className={`mt-4 text-sm ${muted}`}>
                  Nothing recorded in this range yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
                  {data.byTool.map((row) => {
                    const top = data.byTool[0]!.count || 1;
                    return (
                      <li key={row.tool} className="py-2.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-ink-800 dark:text-ink-100">
                            {row.tool}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-500 dark:text-ink-400">
                            {row.count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.max(2, (row.count / top) * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent-heading" className={`mt-6 ${card} p-6`}>
              <h2 id="recent-heading" className={heading.h3}>
                Most recent
              </h2>
              {data.recent.length === 0 ? (
                <p className={`mt-4 text-sm ${muted}`}>Nothing recorded yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-100 text-sm dark:divide-ink-800">
                  {data.recent.map((row, index) => (
                    <li key={`${row.at}-${index}`} className="flex justify-between gap-3 py-2">
                      <span className="truncate text-ink-700 dark:text-ink-200">
                        {row.tool}
                      </span>
                      <time
                        dateTime={row.at}
                        className="shrink-0 text-ink-500 dark:text-ink-400"
                      >
                        {new Date(row.at).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                Each row is one tool page opened. There is no IP, no device, no
                session and no cookie behind these rows, so the same person
                opening the same tool twice appears twice — which is the honest
                count of how much the tool is used.
              </p>
            </section>

            <section aria-labelledby="feedback-heading" className={`mt-6 ${card} p-6`}>
              <h2 id="feedback-heading" className={heading.h3}>
                What people said
              </h2>

              {data.feedback.total === 0 ? (
                <p className={`mt-4 text-sm ${muted}`}>
                  No feedback yet. Visitors see one question at the bottom of
                  each tool page, once per tool.
                </p>
              ) : (
                <>
                  <p className={`mt-2 text-sm ${muted}`}>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {data.feedback.up}
                    </span>{" "}
                    worked ·{" "}
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {data.feedback.down}
                    </span>{" "}
                    did not
                  </p>

                  {data.feedback.byTool.some((row) => row.down > 0) && (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                        Tools with complaints
                      </h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {data.feedback.byTool
                          .filter((row) => row.down > 0)
                          .map((row) => (
                            <li
                              key={row.tool}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200"
                            >
                              {row.tool} — {row.down} down, {row.up} up
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {data.feedback.recent.filter((row) => row.comment).length > 0 && (
                    <ul className="mt-6 divide-y divide-ink-100 text-sm dark:divide-ink-800">
                      {data.feedback.recent
                        .filter((row) => row.comment)
                        .map((row, index) => (
                          <li key={`${row.at}-${index}`} className="py-3">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate font-medium text-ink-900 dark:text-white">
                                {row.sentiment > 0 ? "Worked" : "Broke"} · {row.tool}
                              </span>
                              <time
                                dateTime={row.at}
                                className="shrink-0 text-xs text-ink-500 dark:text-ink-400"
                              >
                                {new Date(row.at).toLocaleString()}
                              </time>
                            </div>
                            {/* Rendered as text, never as markup. The comment is
                                already stripped of angle brackets and quotes on
                                the server, and this is the second line of
                                defence rather than the only one. */}
                            <p className="mt-1 leading-relaxed break-words text-ink-700 dark:text-ink-200">
                              {row.comment}
                            </p>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}

              <p className="mt-5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                Feedback is anonymous by design: no email, no name, no device, no
                cookie. If someone cannot describe what went wrong, there is
                nobody to ask for details — that is the cost of not keeping
                visitor records.
              </p>
            </section>
          </>
        )}

        {error && data === null && (
          <p role="alert" className="mt-8 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  compare,
}: {
  label: string;
  value: number;
  compare?: number;
}) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-xs font-medium tracking-wide text-ink-500 uppercase dark:text-ink-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-ink-900 dark:text-white">
        {value}
      </p>
      {compare !== undefined && (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          {compare === 0
            ? "No previous period to compare"
            : `vs ${compare} previously`}
        </p>
      )}
    </div>
  );
}

/**
 * A plain bar chart.
 *
 * No charting library: the data is a handful of numbers and a dependency that
 * renders them would be larger than the chart. The bars are sized as percentages
 * of the busiest day, with a floor so a non-zero day is still visible.
 */
function DayChart({ rows }: { rows: Array<{ day: string; count: number }> }) {
  if (rows.length === 0) {
    return <p className={`mt-4 text-sm ${muted}`}>Nothing recorded in this range yet.</p>;
  }

  const peak = Math.max(...rows.map((row) => row.count), 1);

  return (
    <>
      <div
        className="mt-6 flex h-40 items-end gap-[3px]"
        role="img"
        aria-label={`Daily visits, ${rows.length} days, peak ${peak}`}
      >
        {rows.map((row) => (
          <div
            key={row.day}
            title={`${row.day}: ${row.count}`}
            className="flex-1 rounded-t bg-brand-500/80 transition-colors hover:bg-brand-600"
            style={{ height: `${Math.max(2, (row.count / peak) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-500 dark:text-ink-400">
        <span>{rows[0]?.day}</span>
        <span>
          peak {peak} · total {rows.reduce((sum, row) => sum + row.count, 0)}
        </span>
        <span>{rows[rows.length - 1]?.day}</span>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        Counted from tool pages opened. Files, filenames and document contents
        are never sent.
      </p>
    </>
  );
}