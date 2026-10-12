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
      <h2 id="reviews-heading" className={heading.h2}>
        Reviews from people who used {toolName}
      </h2>
      <p className={cx("mt-2 max-w-2xl text-[15px] leading-relaxed", muted)}>
        Every review below was written by a visitor after using this tool. No account,
        no email, nothing is edited afterwards.
      </p>

      <ReviewList comments={comments} />

      <form onSubmit={submit} className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800">
        <h3 className="text-base font-semibold text-ink-900 dark:text-white">
          Used {toolName}? Leave a review.
        </h3>

        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-ink-800 dark:text-ink-200">Your rating</p>
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
          placeholder="What was it like to use this tool?"
          className="mt-3 w-full rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-900 ring-1 ring-ink-200 outline-none placeholder:text-ink-400 focus:ring-brand-400 dark:bg-ink-950 dark:text-ink-100 dark:ring-ink-700 dark:placeholder:text-ink-500"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={rating < 1 || !draft.trim() || busy} className={button("primary", "sm")}>
            {busy ? "Posting…" : "Post review"}
          </button>
          <span className={cx("text-xs", muted)}>
            Anonymous — no email, no device, no tracking.
          </span>
          {posted && (
            <span role="status" aria-live="polite" className="text-xs font-medium text-brand-700 dark:text-brand-300">
              Thanks — your review is posted above.
            </span>
          )}
          {submitError && (
            <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
              {submitError}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function ReviewList({ comments }: { comments: Review[] }) {
  if (comments.length === 0) {
    // An explicit empty state rather than nothing. "No reviews yet" is itself
    // information, and it is honest; an absent section would just look like the
    // feature is broken.
    return (
      <p className={cx("mt-6 rounded-2xl bg-ink-50 px-5 py-4 text-[15px]", muted)}>
        No reviews yet. If you use this tool, yours would be the first — and it would
        show up here for everyone else straight away.
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {comments.map((review, index) => (
        <li key={`${review.at}-${index}`}>
          <figure className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800">
            {review.rating !== null && review.rating !== undefined && (
              <StarRating value={review.rating} />
            )}
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-700 dark:text-ink-300">
              {review.text}
            </blockquote>
            <figcaption className={cx("mt-3 text-xs", muted)}>
              Anonymous visitor · {relativeDate(review.at)}
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