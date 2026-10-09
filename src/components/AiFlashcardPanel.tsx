import { useCallback, useState } from "react";
import { button } from "#/components/ui";
import { RefreshIcon } from "#/components/Icons";

export interface Flashcard {
  question: string;
  answer: string;
  topic?: string;
}

interface AiFlashcardPanelProps {
  cards: Flashcard[];
  onRegenerate: () => void;
  onCopy?: () => void;
  copied?: boolean;
}

/**
 * A single flip-through deck.
 *
 * Extracted from `AiDocumentTool`'s inline flashcard view so this page can
 * reuse the same deck rather than a second, slightly different one. The
 * behaviour is unchanged: one card at a time, tap to flip, Previous and Next
 * disabled at the ends rather than wrapping, because wrapping makes the end of
 * the deck ambiguous about whether you have finished it.
 */
export function AiFlashcardPanel({
  cards,
  onRegenerate,
  onCopy,
  copied,
}: AiFlashcardPanelProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // A regenerate call can return fewer cards than the last set, which would
  // leave the index pointing past the end and render `undefined`.
  const safeIndex = Math.min(index, Math.max(0, cards.length - 1));
  const card = cards[safeIndex];
  if (!card) return null;

  const go = useCallback((next: number) => {
    setIndex(next);
    // The previous side must not stay showing through the flip.
    setFlipped(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">
          Card {safeIndex + 1} of {cards.length}
        </p>
        <span className="text-xs text-ink-500">{card.topic ?? "Study card"}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((current) => !current)}
        className="min-h-48 w-full rounded-2xl bg-brand-50 p-8 text-left ring-1 ring-brand-200 transition hover:bg-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/30 dark:hover:bg-brand-600/20"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          {flipped ? "Answer" : "Question"}
        </span>
        <span className="mt-4 block text-xl font-semibold text-ink-900 dark:text-white">
          {flipped ? card.answer : card.question}
        </span>
        <span className="mt-6 block text-xs text-ink-500">Tap to flip</span>
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={safeIndex === 0}
          onClick={() => go(safeIndex - 1)}
          className={button("secondary", "sm")}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={safeIndex === cards.length - 1}
          onClick={() => go(safeIndex + 1)}
          className={button("secondary", "sm")}
        >
          Next
        </button>
        {onCopy && (
          <button type="button" onClick={onCopy} className={button("ghost", "sm")}>
            {copied ? "Copied" : "Copy all"}
          </button>
        )}
        <button type="button" onClick={onRegenerate} className={button("ghost", "sm")}>
          <RefreshIcon className="h-4 w-4" />
          New set
        </button>
      </div>
    </div>
  );
}