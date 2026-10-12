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
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="home-reviews-heading" className={heading.h2}>
          Reviews from visitors
        </h2>
        <p className={`mt-2.5 ${muted}`}>
          Honest ratings and comments submitted by people who have used the site.
          Reviews are anonymous and shown as written.
        </p>
        {average && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-ink-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-ink-100 dark:ring-amber-400/20">
            <StarRating value={Math.round(Number(average))} />
            <span>{average} / 5 from {rated.length} shown rating{rated.length === 1 ? "" : "s"}</span>
          </p>
        )}
      </div>

      {state?.reviews.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.reviews.map((review, index) => {
            const tool = TOOLS.find((item) => item.href === review.tool);
            return (
              <li
                key={`${review.tool}-${review.at}-${index}`}
                className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800"
              >
                {review.rating !== null && (
                  <StarRating value={review.rating} />
                )}
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
                  “{review.text}”
                </blockquote>
                <p className={`mt-4 text-xs ${muted}`}>
                  Anonymous visitor · {tool?.name ?? "PDF Quick Tools"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`mx-auto mt-8 max-w-2xl rounded-2xl bg-ink-50 px-5 py-4 text-center text-sm dark:bg-ink-900 ${muted}`}>
          {state?.configured
            ? "No reviews yet. Be the first to share an honest rating and comment."
            : state
              ? "Reviews are temporarily unavailable. Please try again later."
              : "Loading visitor reviews…"}
        </p>
      )}

      <form
        onSubmit={submit}
        className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800"
      >
        <h3 className="text-base font-semibold text-ink-900 dark:text-white">
          Used a PDF tool? Leave a review
        </h3>
        <p className={`mt-1 text-sm ${muted}`}>
          Your rating and comment are public. We do not collect your name or email.
        </p>
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium text-ink-800 dark:text-ink-200">
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
          className="mt-3 w-full rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-900 ring-1 ring-ink-200 outline-none placeholder:text-ink-400 focus:ring-brand-400 dark:bg-ink-950 dark:text-ink-100 dark:ring-ink-700 dark:placeholder:text-ink-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!state?.configured || rating < 1 || !draft.trim() || busy}
            className={button("primary", "sm")}
          >
            {busy ? "Posting…" : "Post review"}
          </button>
          {message && <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</span>}
          {error && <span role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</span>}
          {state && !state.configured && (
            <span className={`text-xs ${muted}`}>Review storage is not available right now.</span>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          Try a PDF tool
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
