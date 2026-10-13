import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon } from "./Icons";
import { StarRating } from "./StarRating";
import { button, heading, muted } from "./ui";
import { TOOLS } from "#/lib/tools";
import { sendFeedback } from "#/lib/analytics";

const REVIEW_TOOLS = [
  "/",
  "/compress-pdf",
  "/merge-pdf",
  "/pdf-to-word",
  "/ai-summarizer",
  "/ai-notes",
] as const;
const MAX_LENGTH = 500;

interface Review {
  text: string;
  at: string;
  rating: number | null;
  tool: string;
}

interface ReviewState {
  configured: boolean;
  reviews: Review[];
}

export function HomeReviews() {
  const [state, setState] = useState<ReviewState | null>(null);
  const [rating, setRating] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const results = await Promise.all(
      REVIEW_TOOLS.map(async (tool) => {
        try {
          const response = await fetch(`/api/reviews?tool=${encodeURIComponent(tool)}`, {
            cache: "no-store",
          });
          if (!response.ok) return null;
          const data = (await response.json()) as {
            configured?: boolean;
            comments?: Array<{ text: string; at: string; rating?: number | null }>;
          };
          if (!data.configured || !Array.isArray(data.comments)) return null;
          return data.comments.map((review) => ({
            ...review,
            rating:
              Number.isInteger(review.rating) && review.rating! >= 1 && review.rating! <= 5
                ? review.rating!
                : null,
            tool,
          }));
        } catch {
          return null;
        }
      }),
    );
    const configured = results.some((result) => result !== null);
    const reviews = results
      .flatMap((result) => result ?? [])
      .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
      .slice(0, 12);
    setState({ configured, reviews });
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!state?.configured || !text || rating < 1 || busy) return;

    setBusy(true);
    setError(null);
    const saved = await sendFeedback("/", rating >= 3 ? 1 : -1, text, rating);
    setBusy(false);
    if (!saved) {
      setError("Your review could not be saved. Please try again in a moment.");
      return;
    }

    setState((current) =>
      current
        ? {
            ...current,
            reviews: [
              { text, at: new Date().toISOString(), rating, tool: "/" },
              ...current.reviews,
            ].slice(0, 12),
          }
        : current,
    );
    setDraft("");
    setMessage("Thanks—your review is now visible to other visitors.");
    setRating(0);
    window.setTimeout(() => void loadReviews(), 1500);
  }

  const rated = state?.reviews.filter((review) => review.rating !== null) ?? [];
  const average =
    rated.length > 0
      ? (rated.reduce((sum, review) => sum + (review.rating ?? 0), 0) / rated.length).toFixed(1)
      : null;

  return (
    <section data-scroll-reveal aria-labelledby="home-reviews-heading" className="mx-auto mt-20 w-full max-w-6xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-ink-200/80 bg-gradient-to-br from-white via-white to-brand-50/60 p-5 shadow-sm dark:border-ink-800 dark:from-ink-950 dark:via-ink-950 dark:to-brand-950/30 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 border-b border-ink-200/70 pb-7 dark:border-ink-800 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              Community feedback
            </p>
            <h2 id="home-reviews-heading" className={heading.h2}>
              Trusted by people who use our tools every day
            </h2>
            <p className={`mt-2.5 max-w-xl text-sm leading-relaxed sm:text-base ${muted}`}>
              Real feedback from users who rely on our PDF tools to save time, simplify workflows,
              and get work done with less friction. Reviews are anonymous and displayed as submitted.
            </p>
          </div>
          {average && (
            <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/10 sm:self-auto">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-ink-900 shadow-sm dark:bg-ink-900 dark:text-white">
                {average}
              </span>
              <span>
                <span className="block"><StarRating value={Math.round(Number(average))} /></span>
                <span className="mt-0.5 block text-xs font-medium text-ink-600 dark:text-ink-300">
                  Average rating from {rated.length} review{rated.length === 1 ? "" : "s"}
                </span>
              </span>
            </div>
          )}
        </div>

        {state?.reviews.length ? (
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.reviews.map((review, index) => {
              const tool = TOOLS.find((item) => item.href === review.tool);
              return (
                <li
                  key={`${review.tool}-${review.at}-${index}`}
                  className="flex h-full flex-col rounded-2xl border border-ink-200/80 bg-white/90 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-ink-800 dark:bg-ink-900/90"
                >
                  <div className="flex items-center justify-between gap-3">
                    {review.rating !== null ? (
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
                  <p className={`mt-5 border-t border-ink-100 pt-3 text-xs dark:border-ink-800 ${muted}`}>
                    Anonymous user <span aria-hidden="true">·</span> {tool?.name ?? "PDF Quick Tools"}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={`mt-7 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-5 py-6 text-center text-sm leading-relaxed dark:border-ink-700 dark:bg-ink-900/50 ${muted}`}>
            {state?.configured
              ? "No reviews yet. Be the first to share a quick rating and comment."
              : state
                ? "Reviews are temporarily unavailable. Please try again later."
                : "Loading user reviews…"}
          </p>
        )}

        <div className="mt-8 grid gap-6 rounded-2xl border border-brand-200/70 bg-brand-50/70 p-5 dark:border-brand-800/60 dark:bg-brand-950/25 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
              We value your feedback
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Share your experience
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
              Help others choose the right tool and let us know where we can improve.
              Your review is public, but your identity stays private.
            </p>
          </div>
          <form onSubmit={submit} className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
                Your rating <span className="text-red-600">*</span>
              </p>
              <StarRating value={rating} onChange={(value) => setRating(value)} />
            </div>
            <label htmlFor="homepage-review-comment" className="sr-only">
              Write a comment about PDF Quick Tools
            </label>
            <textarea
              id="homepage-review-comment"
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              rows={3}
              required
              placeholder="What worked well, or what should we improve?"
              className="mt-3 w-full resize-y rounded-xl border-0 bg-ink-50 px-3.5 py-3 text-sm leading-relaxed text-ink-900 ring-1 ring-ink-200 outline-none transition placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-ink-100 dark:ring-ink-700 dark:placeholder:text-ink-500"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className={`text-xs ${muted}`}>{draft.length}/{MAX_LENGTH} characters</span>
              <button
                type="submit"
                disabled={!state?.configured || rating < 1 || !draft.trim() || busy}
                className={button("primary", "sm")}
              >
                {busy ? "Posting…" : "Submit review"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3 dark:border-ink-800">
              <span className={`text-xs ${muted}`}>Anonymous · No name or email required</span>
              {message && <span role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{message}</span>}
              {error && <span role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{error}</span>}
              {state && !state.configured && (
                <span className={`text-xs ${muted}`}>Review storage is not available right now.</span>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:gap-2.5 dark:text-brand-300"
          >
            Explore PDF tools
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
