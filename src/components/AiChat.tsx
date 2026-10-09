import { useCallback, useEffect, useRef, useState } from "react";
import { button, cx } from "#/components/ui";
import { AlertIcon, BotIcon, RefreshIcon, SendIcon } from "#/components/Icons";
import { AiNotice } from "#/components/AiNotice";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AiChatProps {
  onSend: (message: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  suggestedQuestions?: string[];
  error?: string | null;
  onRetry?: () => void;
  /**
   * Extra content shown under the message at `index` — used by the multi-PDF
   * chat to list which documents an answer came from. Omitted by the
   * single-document chat, which has nothing to add.
   */
  renderExtras?: (index: number) => React.ReactNode;
  /** Overrides the input hint; the multi-PDF chat asks about "these documents". */
  inputPlaceholder?: string;
}

export function AiChat({
  onSend,
  messages,
  isLoading,
  suggestedQuestions,
  error,
  onRetry,
  renderExtras,
  inputPlaceholder,
}: AiChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [isLoading, messages, scrollToBottom]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      setInput("");
      onSend(trimmed);
    },
    [input, isLoading, onSend],
  );

  const handleSuggestion = useCallback(
    (question: string) => {
      if (isLoading) return;
      onSend(question);
    },
    [isLoading, onSend],
  );

  return (
    <div className="flex flex-col">
      {/* Messages area */}
      <div
        className="max-h-[400px] min-h-[200px] space-y-4 overflow-y-auto rounded-2xl bg-ink-50/50 p-4 dark:bg-ink-900/40"
        aria-label="Chat conversation"
      >
        {messages.length === 0 && suggestedQuestions && suggestedQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-500 dark:text-ink-400">Suggested questions:</p>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => handleSuggestion(q)}
                className="block w-full rounded-xl bg-white px-4 py-3 text-left text-sm text-ink-700 ring-1 ring-ink-200 transition-colors hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-brand-600/10 dark:hover:text-brand-300 dark:hover:ring-brand-600/30"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cx(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white animate-bounce-in">
                <BotIcon className="h-4 w-4" />
              </span>
            )}
            <div
              className={cx(
                "flex max-w-[80%] flex-col",
                msg.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cx(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-brand-600 text-white animate-slide-in-right"
                    : "bg-white text-ink-700 ring-1 ring-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700 animate-slide-in-left",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "assistant" && renderExtras?.(i)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BotIcon className="h-4 w-4" />
            </span>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-200 dark:bg-ink-800 dark:ring-ink-700">
              <div className="flex gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex gap-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900/60"
            role="alert"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/40"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="ai-chat-question" className="sr-only">
          Ask a question about this PDF
        </label>
        <input
          id="ai-chat-question"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputPlaceholder ?? "Ask a question about this PDF..."}
          disabled={isLoading}
          className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500 dark:focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={button("primary", "md")}
          aria-label="Send question"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
      <AiNotice tone="inline" className="mt-3" />
      <p className="sr-only" aria-live="polite">
        {isLoading ? "AI is preparing an answer." : ""}
      </p>
    </div>
  );
}
