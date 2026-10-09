import { createFileRoute } from "@tanstack/react-router";
import { DailyChallengeCard } from "#/components/DailyChallengeCard";
import { ArticlePage, Block, Bullets } from "#/components/Prose";
import { button } from "#/components/ui";
import { CATEGORY_LABELS, CHALLENGES, challengeForDate } from "#/lib/daily-challenge";
import { pageHead } from "#/lib/seo";
import { SITE_NAME } from "#/lib/site";

export const Route = createFileRoute("/daily-challenge")({
  head: () =>
    pageHead({
      title: `Daily PDF Challenge — One Useful Task a Day | ${SITE_NAME}`,
      description:
        "A short, genuinely useful PDF task every day — a tip, a quick task, or a one-question quiz. No sign-up, no streak to lose.",
      path: "/daily-challenge",
    }),
  component: DailyChallengePage,
});

/**
 * The full rotation, listed.
 *
 * Published in full rather than hidden behind "tomorrow's challenge". There is
 * nothing here worth gating: everything is readable on this page, so a visitor
 * who wants to find the one about OCR can find it in two seconds instead of
 * coming back for fifteen days.
 */
function DailyChallengePage() {
  const today = challengeForDate();

  return (
    <ArticlePage
      title="Daily PDF Challenge"
      intro="One useful thing a day: a tip worth knowing, a task you can finish in a minute, or a single question worth thinking about. It changes daily and needs nothing from you."
    >
      <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700">
        <DailyChallengeCard />
      </div>

      <Block title="Why it works this way">
        <p>
          Most sites with a daily feature turn it into a streak, and a streak is a
          thing you can lose. Once there is something to lose, the feature stops
          being useful and starts being a chore with a small, silent guilt attached
          — and eventually a paid tier that promises not to lose it any more. This
          one has no account, nothing to lose, and no reminder unless you ask for
          one.
        </p>
        <Bullets
          items={[
            "No sign-up. There is no account to create because there is nothing here that needs one.",
            "No streak that breaks. Consecutive days are counted and shown, and missing a day simply stops the count — it never takes anything away.",
            "Skippable. Every day can be skipped, and a skipped day comes back the next day as normal.",
            "No reminders by default. Nothing nags you, and nothing is scheduled on your device without you asking.",
            "Nothing about your documents is recorded — only the date, in this browser.",
          ]}
        />
      </Block>

      <Block title="What gets recorded">
        <p>
          Only the dates on which you marked a challenge done, kept in this
          browser's local storage and never sent anywhere. That is enough to show a
          streak count and a tick on today's card, and it is not enough to identify
          you or to say anything about what you work on. Clearing your browser data
          erases it, and there is no server copy because there is no server.
        </p>
      </Block>

      <Block title="The full rotation">
        <p>
          These are all {CHALLENGES.length} entries, shown in order. They repeat
          every {CHALLENGES.length} days, which is chosen to be long enough that
          the same one does not come round while it is still fresh. Today's is
          marked below.
        </p>
        <ul className="space-y-3">
          {CHALLENGES.map((challenge) => (
            <li
              key={challenge.id}
              className={
                challenge.id === today.id
                  ? "rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200 dark:bg-brand-600/10 dark:ring-brand-600/30"
                  : "rounded-2xl bg-white p-4 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                  {CATEGORY_LABELS[challenge.category]}
                </span>
                {challenge.id === today.id && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Today
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-semibold text-ink-900 dark:text-white">
                {challenge.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                {challenge.body}
              </p>
              {challenge.href && (
                <a
                  href={challenge.href}
                  className={`${button("secondary", "sm")} mt-3`}
                >
                  {challenge.hrefLabel ?? "Open the tool"}
                </a>
              )}
            </li>
          ))}
        </ul>
      </Block>
    </ArticlePage>
  );
}