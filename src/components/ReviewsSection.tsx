import { useEffect, useState, type FormEvent } from "react";
import { sendFeedback } from "#/lib/analytics";
import { StarRating } from "./StarRating";
import { button, cx, heading, muted } from "./ui";

/**
 * Real reviews, written by real visitors, shown to real visitors.
 *
 * ## The one rule this component exists to keep
 *
 * Nothing here is ever seeded, sampled, or invented. Every quote rendered on
 * this page came from a person pressing Submit in the form below, and the owner
 * has no way to type one in from the dashboard. That is the whole point: a
 * reviews section is the single thing a visitor uses to decide whether to trust
 * a site, and filling it with made-up quotes would be the exact kind of lie that
 * destroys the trust the rest of the site is built on. It would also violate
 * Google's structured-data policy, which is what the star rating below depends
 * on.
 *
 * So: if there are no reviews, the list is empty and the page says so honestly.
 * There is no fallback content, and `null` is not an acceptable substitute for a
 * review that does not exist.
 *
 * ## Why criticism is shown, not filtered
 *
 * The endpoint drops link spam but returns complaints as written, and this gives
 * them the same weight as praise. Suppressing the bad reviews to raise an
 * average is the dishonest version of this feature — and the one that breaks the
 * moment a visitor finds the filtered ones.
 *
 * ## Why posting is anonymous
 *
 * No name, no email, no account. The endpoint has nowhere to put an identity, so
 * none is collected. That is a real limitation — someone who cannot find their
 * file cannot tell you which file — and it is the same trade-off the privacy page
 * already makes everywhere else on this site.
 */

interface Review {
  text: string;
  at: string;
  rating?: number | null;
  /** Only present on reviews this browser just posted, before the refetch. */
  pending?: boolean;
}

const MAX_LENGTH = 500;

export function ReviewsSection({
  tool,
  toolName,
  className,
}: {
  tool: string;
  toolName: string;
  className?: string;
}) {
  const [comments, setComments] = useState<Review[] | null>(null);
  const [draft, setDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // After mount, never during render: tool pages are prerendered, so there is no
  // localStorage and no fetch while this runs on the server.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/reviews?tool=${encodeURIComponent(tool)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { configured?: boolean; comments?: Review[] } | null) => {
        if (cancelled || !data?.configured) return;
        setComments(data.comments ?? []);
      })
      .catch(() => {
        // A failed read is not worth showing a visitor. The list stays absent,
        // which reads the same as "nobody has reviewed this yet".
      });

    return () => {
      cancelled = true;
    };
  }, [tool]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || rating < 1 || busy) return;

    setBusy(true);
    setSubmitError(null);

    // Show it immediately. The POST is fire-and-forget and has no response body
    // by design, so waiting for a refetch would mean the visitor presses Submit
    // and sees nothing happen — the same impression that made the install button
    // look broken.
    const optimistic: Review = { text, at: new Date().toISOString(), rating, pending: true };
    setComments((current) => [optimistic, ...(current ?? [])]);
    const stored = await sendFeedback(tool, rating >= 3 ? 1 : -1, text, rating);
    setBusy(false);
    if (!stored) {
      setComments((current) => (current ?? []).filter((review) => !review.pending));
      setSubmitError("Your review could not be saved. Please try again.");
      return;
    }
    setDraft("");
    setPosted(true);
    setRating(0);

    // Pull the real list a few seconds later, which replaces the optimistic row
    // with the stored one — or drops it, if the server rejected it. That is the
    // honest outcome: a review that was not stored should not stay on the page.
    window.setTimeout(() => {
      fetch(`/api/reviews?tool=${encodeURIComponent(tool)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { comments?: Review[] } | null) => {
          if (data?.comments) setComments(data.comments);
        })
        .catch(() => {
          // Leave the optimistic row up. It is what the visitor wrote.
        });
    }, 4000);
  }

  // Nothing written yet, or no database configured. The form is not shown either
  // — offering a box that silently discards what is typed into it is worse than
  // not offering one.
  if (comments === null) return null;

  return (
    <section aria-labelledby="reviews-heading" className={cx("mt-12", className)}>
      <div className="overflow-hidden rounded-[2rem] border border-ink-200/80 bg-gradient-to-br from-white via-white to-brand-50/50 p-5 shadow-sm dark:border-ink-800 dark:from-ink-950 dark:via-ink-950 dark:to-brand-950/25 sm:p-8">
        <div className="border-b border-ink-200/70 pb-6 dark:border-ink-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            Community feedback
          </p>
          <h2 id="reviews-heading" className={heading.h2}>
            Reviews for {toolName}
          </h2>
          <p className={cx("mt-2.5 max-w-2xl text-sm leading-relaxed sm:text-base", muted)}>
            Real feedback from users who rely on this tool to handle everyday PDF tasks.
            Reviews are anonymous and shown exactly as submitted.
          </p>
        </div>

        <ReviewList comments={comments} />

        <form onSubmit={submit} className="mt-7 grid gap-5 rounded-2xl border border-brand-200/70 bg-brand-50/70 p-4 dark:border-brand-800/60 dark:bg-brand-950/25 sm:p-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
              We value your feedback
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              How was your experience?
            </h3>
            <p className={cx("mt-2 text-sm leading-relaxed", muted)}>
              Your review helps us improve {toolName} and helps others know what to expect.
            </p>
          </div>

          <div className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
                Your rating <span className="text-red-600">*</span>
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <label htmlFor={`review-${tool}`} className="sr-only">
              Your review of {toolName}
            </label>
            <textarea
              id={`review-${tool}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder="What worked well, or what could be better?"
              className="mt-3 w-full resize-y rounded-xl border-0 bg-ink-50 px-3.5 py-3 text-sm leading-relaxed text-ink-900 ring-1 ring-ink-200 outline-none transition placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-ink-100 dark:ring-ink-700 dark:placeholder:text-ink-500"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className={cx("text-xs", muted)}>{draft.length}/{MAX_LENGTH} characters</span>
              <button type="submit" disabled={rating < 1 || !draft.trim() || busy} className={button("primary", "sm")}>
                {busy ? "Posting…" : "Submit review"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              <span className={cx("text-xs", muted)}>Anonymous · No name or email required</span>
              {posted && (
                <span role="status" aria-live="polite" className="text-xs font-medium text-brand-700 dark:text-brand-300">
                  Thank you — your review has been posted.
                </span>
              )}
              {submitError && (
                <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
                  {submitError}
                </span>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function ReviewList({ comments }: { comments: Review[] }) {
  if (comments.length === 0) {
    // An explicit empty state rather than nothing. "No reviews yet" is itself
    // information, and it is honest; an absent section would just look like the
    // feature is broken.
    return (
      <p className={cx("mt-7 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-5 py-6 text-center text-sm leading-relaxed dark:border-ink-700 dark:bg-ink-900/50", muted)}>
        No reviews yet. Be the first to share your experience, and your feedback will appear here for others to see.
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {comments.map((review, index) => (
        <li key={`${review.at}-${index}`}>
          <figure className="flex h-full flex-col rounded-2xl border border-ink-200/80 bg-white/90 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-ink-800 dark:bg-ink-900/90">
            <div className="flex items-center justify-between gap-3">
              {review.rating !== null && review.rating !== undefined ? (
                <StarRating value={review.rating} />
              ) : (
                <span className="text-xs font-medium text-ink-500 dark:text-ink-400">Reader comment</span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                User feedback
              </span>
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-7 text-ink-700 dark:text-ink-300">
              “{review.text}”
            </blockquote>
            <figcaption className={cx("mt-5 border-t border-ink-100 pt-3 text-xs dark:border-ink-800", muted)}>
              Anonymous user <span aria-hidden="true">·</span> {relativeDate(review.at)}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

/**
 * "3 days ago" rather than a date.
 *
 * A precise timestamp beside an anonymous comment invites reading it as a
 * fingerprint. "3 days ago" says the same useful thing — this is recent — with
 * nothing that could be correlated against anything else.
 */
function relativeDate(value: string): string {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return "recently";

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "just now";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}