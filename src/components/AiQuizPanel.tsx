import { useCallback, useState } from "react";
import { button, cx } from "#/components/ui";
import { CheckIcon, RefreshIcon, ListIcon, TrophyIcon } from "#/components/Icons";
import { AiNotice } from "#/components/AiNotice";

export interface QuizQuestion {
  type: "mcq" | "true-false" | "short-answer";
  question: string;
  options?: string[];
  correct: number | boolean | string;
  explanation: string;
}

interface AiQuizPanelProps {
  questions: QuizQuestion[];
  onRegenerate: () => void;
}

export function AiQuizPanel({ questions, onRegenerate }: AiQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const handleAnswer = useCallback((index: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [index]: answer }));
  }, []);

  const handleSubmit = useCallback(() => {
    setShowResults(true);
  }, []);

  const handleReset = useCallback(() => {
    setAnswers({});
    setShowResults(false);
    setFlipped({});
  }, []);

  // A question whose correct answer could not be located is still shown and
  // still answerable, but it is held out of both sides of the score. Counting
  // it would mark a student wrong for any answer they gave; ignoring it without
  // saying so would make the total quietly wrong.
  const scored = questions.filter((q) => !("unmarkable" in q && q.unmarkable));

  const score = scored.reduce((acc, q) => {
    const userAnswer = answers[questions.indexOf(q)];
    if (!userAnswer) return acc;
    if (q.type === "mcq" && Number(userAnswer) === q.correct) return acc + 1;
    if (q.type === "true-false" && userAnswer === String(q.correct)) return acc + 1;
    if (q.type === "short-answer" && userAnswer.toLowerCase().trim() === String(q.correct).toLowerCase().trim()) return acc + 1;
    return acc;
  }, 0);

  const skipped = questions.length - scored.length;

  return (
    <div className="animate-blur-in space-y-5 animate-float">
      {showResults && (
        <div className="rounded-2xl bg-brand-50/50 p-5 ring-1 ring-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/25">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-400/15 dark:text-brand-300">
              <TrophyIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900 dark:text-brand-200">
                {score === scored.length ? "Perfect Score!" : score >= scored.length * 0.7 ? "Great Job!" : "Keep Practicing!"}
              </p>
              <p className="text-xs text-brand-700 dark:text-brand-300">
                You got {score} out of {scored.length} correct
              </p>
              {skipped > 0 && (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
                  {skipped} of these {skipped === 1 ? "question is" : "questions are"} not
                  counted. The generated answer could not be matched to any option, so
                  marking {skipped === 1 ? "it" : "them"} would mean guessing — read{" "}
                  {skipped === 1 ? "it" : "them"} against your document instead.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {questions.map((q, i) => (
        <div
          key={i}
          className={cx("quiz-card rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 dark:bg-ink-900/70 dark:ring-ink-800", flipped[i] && "is-flipped")}
          onClick={() => showResults && setFlipped((current) => ({ ...current, [i]: !current[i] }))}
        >
          <div className="quiz-card-inner">
            <div className="quiz-card-face quiz-card-front">
              <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
              <ListIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase text-ink-400 dark:text-ink-500">
                  {q.type === "mcq" ? "Multiple Choice" : q.type === "true-false" ? "True/False" : "Short Answer"}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-medium text-ink-900 dark:text-white">
                {q.question}
              </p>

              {q.type === "mcq" && q.options && (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, j) => (
                    <label
                      key={j}
                      className={cx(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-all duration-200 hover:scale-[1.01]",
                        answers[i] === String(j)
                          ? "bg-brand-50 ring-brand-300 text-brand-900 dark:bg-brand-600/15 dark:ring-brand-600/40 dark:text-brand-200"
                          : "bg-white ring-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:ring-ink-700 dark:hover:bg-ink-750",
                        showResults && Number(answers[i]) === j && j !== (q.correct as number) && "bg-red-50 ring-red-300 dark:bg-red-950/30 dark:ring-red-900/60",
                        showResults && j === (q.correct as number) && "bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900/60",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={j}
                        checked={answers[i] === String(j)}
                        onChange={() => handleAnswer(i, String(j))}
                        disabled={showResults}
                        className="sr-only"
                      />
                      <span className={cx(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        answers[i] === String(j)
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-ink-300 dark:border-ink-600",
                      )}>
                        {answers[i] === String(j) && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className="text-ink-700 dark:text-ink-200">{opt}</span>
                      {showResults && j === (q.correct as number) && (
                        <CheckIcon className="ml-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "true-false" && (
                <div className="mt-3 flex gap-3">
                  {["true", "false"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAnswer(i, val)}
                      disabled={showResults}
                      className={cx(
                        "flex-1 rounded-xl px-4 py-3 text-sm font-medium ring-1 transition-colors capitalize",
                        answers[i] === val
                          ? "bg-brand-50 ring-brand-300 text-brand-900 dark:bg-brand-600/15 dark:ring-brand-600/40 dark:text-brand-200"
                          : "bg-white ring-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:ring-ink-700 dark:hover:bg-ink-750",
                        showResults && answers[i] === val && val !== String(q.correct) && "bg-red-50 ring-red-300 dark:bg-red-950/30 dark:ring-red-900/60",
                        showResults && val === String(q.correct) && "bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900/60",
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "short-answer" && (
                <input
                  type="text"
                  value={answers[i] || ""}
                  onChange={(e) => handleAnswer(i, e.target.value)}
                  disabled={showResults}
                  placeholder="Type your answer..."
                  className="mt-3 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
                />
              )}

              {showResults && (
                <div className="mt-3 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600 dark:bg-ink-800/50 dark:text-ink-400">
                  <span className="font-medium text-ink-900 dark:text-white">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
              </div>
            </div>
            <div className="quiz-card-face quiz-card-back">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Answer explanation</span>
              <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{q.explanation}</p>
              <p className="mt-5 text-xs font-medium text-ink-500 dark:text-ink-400">Click to return to the question</p>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {!showResults ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className={button("primary", "lg")}
          >
            Submit Answers
          </button>
        ) : (
          <>
            <button type="button" onClick={handleReset} className={button("primary", "lg")}>
              <RefreshIcon className="h-4 w-4" /> Try Again
            </button>
            <button type="button" onClick={onRegenerate} className={button("secondary", "lg")}>
              Generate New Quiz
            </button>
          </>
        )}
      </div>

      <AiNotice tone="inline" className="mt-4" />
    </div>
  );
}
