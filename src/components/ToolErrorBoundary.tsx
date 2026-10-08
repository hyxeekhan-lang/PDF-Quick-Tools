import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { button } from "#/components/ui";

interface Props {
  children: ReactNode;
  /** Shown in the message, e.g. the tool name, so the user knows what broke. */
  toolName?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a crash inside a single tool so one bad document takes down one
 * panel rather than the whole page. The site-level boundary in `__root.tsx`
 * stays the backstop; this one is what a visitor actually sees most of the
 * time, because tool failures are per-request and per-file.
 *
 * A PDF that makes a parser throw is an ordinary event on this site, not an
 * exceptional one, so it deserves a retry that resets state rather than a
 * blank screen.
 */
export class ToolErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept out of `window.whop` because the failure may include part of the
    // user's file path or name; console is enough to diagnose a bad document.
    console.error(`[${this.props.toolName ?? "tool"}] crashed:`, error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const subject = this.props.toolName ?? "This tool";

    return (
      <div
        role="alert"
        className="rounded-2xl bg-white p-8 text-center ring-1 ring-red-200 dark:bg-ink-900 dark:ring-red-900/60"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
          Something went wrong
        </p>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-ink-900 sm:text-2xl dark:text-white">
          {subject} could not handle this file
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-600 dark:text-ink-400">
          This usually means the PDF is damaged, password protected, or uses a
          feature we cannot read. Your file was not uploaded and nothing was
          saved. Try a different file, or open it in a PDF reader and export a
          fresh copy.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={this.reset} className={button("primary")}>
            Try again
          </button>
          <Link to="/tools" className={button("secondary")}>
            Browse all tools
          </Link>
        </div>
      </div>
    );
  }
}