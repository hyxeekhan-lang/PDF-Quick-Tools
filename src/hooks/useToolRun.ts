import { useCallback, useEffect, useRef, useState } from "react";
import { toolEvents } from "#/lib/analytics";
import { FriendlyError, revokeResults, type ResultFile } from "#/lib/files";

export type RunStatus = "idle" | "working" | "done" | "error";

export interface Progress {
  percent: number;
  label: string;
}

export type Report = (percent: number, label?: string) => void;

const GENERIC_ERROR =
  "Something went wrong while processing your PDF. Please try again.";

/**
 * Thrown from `report` to unwind a job the visitor has cancelled. Every
 * long-running operation calls `report` once per page or per step, so this is
 * the one checkpoint all 52 tools already pass through — cancelling needs no
 * per-tool cooperation.
 */
export class CancelledError extends Error {}

/** Rethrows if the current run has been cancelled. */
export function assertNotCancelled(cancelled: { current: boolean }): void {
  if (cancelled.current) throw new CancelledError();
}

/**
 * The shared upload → process → download state machine. Every tool page uses
 * it, so progress, failure and cleanup behave identically across the site.
 */
export function useToolRun(toolName: string) {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState<Progress>({ percent: 0, label: "" });
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultFile[]>([]);
  const resultsRef = useRef<ResultFile[]>([]);
  const running = useRef(false);
  const cancelled = useRef(false);

  resultsRef.current = results;

  // Object URLs are the only thing this site holds on to. Release them when
  // the page goes away.
  useEffect(() => {
    return () => revokeResults(resultsRef.current);
  }, []);

  const clearResults = useCallback(() => {
    revokeResults(resultsRef.current);
    resultsRef.current = [];
    setResults([]);
  }, []);

  const reset = useCallback(() => {
    clearResults();
    setStatus("idle");
    setError(null);
    setProgress({ percent: 0, label: "" });
  }, [clearResults]);

  /**
   * A tool works on a copy of the file the visitor picked, so cancelling is
   * always safe: nothing was written anywhere, and the picked file is still in
   * the uploader ready to run again.
   */
  const cancel = useCallback(() => {
    if (!running.current) return;
    cancelled.current = true;
    setStatus("idle");
    setProgress({ percent: 0, label: "" });
  }, []);

  const fail = useCallback(
    (message: string) => {
      setError(message);
      setStatus("error");
      toolEvents.failed(toolName, message.slice(0, 120));
    },
    [toolName],
  );

  const run = useCallback(
    async (job: (report: Report) => Promise<ResultFile[]>) => {
      if (running.current) return;
      running.current = true;
      cancelled.current = false;
      clearResults();
      setError(null);
      setProgress({ percent: 0, label: "Getting started" });
      setStatus("working");
      toolEvents.started(toolName);
      const startedAt = Date.now();

      const report: Report = (percent, label) => {
        // Every operation reports per page or per step, so this is where a
        // cancelled run notices and stops.
        assertNotCancelled(cancelled);
        setProgress((current) => ({
          percent: Math.max(0, Math.min(100, Math.round(percent))),
          label: label ?? current.label,
        }));
      };

      try {
        // Let the browser paint the working state before the main thread gets busy.
        await new Promise((resolve) => setTimeout(resolve, 16));
        assertNotCancelled(cancelled);
        const produced = await job(report);
        assertNotCancelled(cancelled);
        resultsRef.current = produced;
        setResults(produced);
        setProgress({ percent: 100, label: "Finished" });
        setStatus("done");
        toolEvents.completed(toolName, Date.now() - startedAt);
      } catch (caught) {
        // Cancelling already reset the panel, and it is not a failure — the
        // visitor asked for it, so it must not reach the error box or analytics.
        if (caught instanceof CancelledError) {
          if (import.meta.env.DEV) console.info(`[${toolName}] cancelled`);
        } else if (caught instanceof FriendlyError) {
          fail(caught.message);
        } else if (caught instanceof Error && import.meta.env.DEV) {
          console.error(caught);
          fail(caught.message || GENERIC_ERROR);
        } else {
          if (import.meta.env.DEV) console.error(caught);
          fail(GENERIC_ERROR);
        }
      } finally {
        running.current = false;
        cancelled.current = false;
      }
    },
    [clearResults, fail, toolName],
  );

  return { status, progress, error, results, run, cancel, reset, fail };
}
