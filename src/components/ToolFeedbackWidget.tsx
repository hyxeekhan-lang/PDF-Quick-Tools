import { useEffect, useState } from "react";
import { sendFeedback } from "#/lib/analytics";
import { KEYS, readFlag, writeFlag } from "#/lib/storage";
import { button, cx } from "./ui";

/**
 * Asks one question after a tool has been used.
 *
 * ## Why this asks rather than offers stars
 *
 * Five stars is a rating, and a rating on a page with no reviews beside it is a
 * number nobody can act on. One question with a thumbs up and a thumbs down is
 * the version an owner can actually act on: the down button says *this tool is
 * broken and you will look at it*, and the up button says *this works, leave it
 * alone*. A five-star average cannot distinguish those two.
 *
 * The comment box appears only after someone presses one of the two buttons.
 * Asking a stranger to type before they have decided whether they liked
 * something is a form, not a question, and forms get abandoned.
 *
 * ## Why the "answered" flag is stored per tool
 *
 * Otherwise the same person is asked about Merge PDF every single time they use
 * it, and the answer is always the same. One answer per tool is what makes this
 * feel like an opinion rather than a nag.
 *
 * ## Why this is anonymous
 *
 * There is no email field, no name field, and no way to follow up. That is a
 * real cost — a visitor who cannot find the file they care about cannot tell you
 * which file — but the alternative is a table of complaints sitting next to
 * visitor identities, on a site whose entire pitch is that it does not keep
 * those. The endpoint documents the same trade-off from the server side.
 */
export function ToolFeedbackWidget({ toolPath, toolName }: { toolPath: string; toolName: string }) {
  const [choice, setChoice] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  // Read after mount, never during render: tool pages are prerendered, so
  // localStorage does not exist while this renders on the server.
  const [alreadyAnswered, setAlreadyAnswered] = useState(true);

  useEffect(() => {
    setAlreadyAnswered(readFlag(answeredKey(toolPath)));
  }, [toolPath]);

  function submit(next: 1 | -1) {
    if (choice) return;
    setChoice(next);
    writeFlag(answeredKey(toolPath));
  }

  function send() {
    if (!choice || sent) return;
    sendFeedback(toolPath, choice, comment);
    setSent(true);
  }

  // Hidden once answered, and once sent — and the storage flag means the next
  // visit does not bring it back either.
  if (alreadyAnswered || sent) return null;

  return (
    <section aria-labelledby={`feedback-${toolName}`} className="mt-10">
      <h2 id={`feedback-${toolName}`} className="text-base font-semibold text-ink-900 dark:text-white">
        Did {toolName} work for you?
      </h2>

      {choice === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submit(1)}
            className={button("secondary", "sm")}
          >
            Yes, it worked
          </button>
          <button
            type="button"
            onClick={() => submit(-1)}
            className={button("secondary", "sm")}
          >
            No, something went wrong
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800">
          <label htmlFor={`comment-${toolPath}`} className="text-sm font-medium text-ink-900 dark:text-white">
            {choice === -1
              ? "What went wrong? Telling us is the fastest way to get it fixed."
              : "Anything you would change? Optional."}
          </label>
          <textarea
            id={`comment-${toolPath}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={choice === -1 ? "The file would not open / it was too slow / ..." : "It was fast, but ..."}
            className="mt-2 w-full rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-900 ring-1 ring-ink-200 outline-none placeholder:text-ink-400 focus:ring-brand-400 dark:bg-ink-950 dark:text-ink-100 dark:ring-ink-700 dark:placeholder:text-ink-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={send} className={button("primary", "sm")}>
              Send
            </button>
            <button
              type="button"
              onClick={() => {
                // Dismissal is a valid answer, and it should not leave the
                // question half-asked: record the flag, then hide.
                setAlreadyAnswered(true);
              }}
              className={button("ghost", "sm")}
            >
              Not now
            </button>
            <span className={cx("text-xs", "text-ink-500 dark:text-ink-500")}>
              Anonymous — no email, no device, no tracking.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Per-tool, so answering about one tool does not silence the others.
 *
 * Kept off the shared `KEYS` list because this one is derived rather than a
 * fixed name, and `KEYS` is the catalogue of fixed ones.
 */
function answeredKey(toolPath: string): string {
  return `${KEYS.dismissedTip}-feedback-${toolPath}`;
}