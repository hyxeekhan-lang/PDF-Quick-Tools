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

/**
 * Rethrows if this run has been cancelled.
 *
 * Takes the ref rather than reading a shared one, because a cancelled run keeps
 * unwinding in the background while the visitor starts the next one. A single
 * shared flag would be reset by the new run, and the abandoned job would carry
 * on to the end — spending real CPU and, on an AI tool, real API calls.
 */
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
  // The cancel flag of the run in flight. Per-run, not shared: an abandoned job
  // must stay cancelled even after the visitor starts the next one.
  const cancelled = useRef<{ current: boolean }>({ current: false });
  // Every run takes a number. A cancelled run keeps unwinding in the
  // background, so a second run can start while the first is still in flight;
  // the generation is what stops the old one from touching current state.
  const generation = useRef(0);
  const alive = useRef(true);

  resultsRef.current = results;

  // Object URLs are the only thing this site holds on to. Release them when
  // the page goes away — and also when a run finishes after the page has gone,
  // because that run still minted URLs nobody is left to hand to anyone.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      revokeResults(resultsRef.current);
    };
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
    cancelled.current.current = true;
    // Released straight away rather than when the job finally unwinds: the
    // panel is back to idle and the file is still in the uploader, so the
    // visitor can press the button again immediately. The job that is still
    // running stops at its next report and touches nothing.
    running.current = false;
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
      const mine = generation.current + 1;
      generation.current = mine;
      const stop = { current: false };
      cancelled.current = stop;
      clearResults();
      setError(null);
      setProgress({ percent: 0, label: "Getting started" });
      setStatus("working");
      toolEvents.started(toolName);
      const startedAt = Date.now();

      const report: Report = (percent, label) => {
        // Every operation reports per page or per step, so this is where a
        // cancelled or superseded run notices and stops.
        assertNotCancelled(stop);
        if (generation.current !== mine) return;
        setProgress((current) => ({
          percent: Math.max(0, Math.min(100, Math.round(percent))),
          label: label ?? current.label,
        }));
      };

      try {
        // Let the browser paint the working state before the main thread gets busy.
        await new Promise((resolve) => setTimeout(resolve, 16));
        assertNotCancelled(stop);
        const produced = await job(report);
        // An older run that finished after a newer one started must not
        // overwrite the newer run's results with its own. The same goes for a
        // run whose page has since been navigated away from: there is nobody
        // left to hand the file to, so its URLs are released rather than kept
        // in a ref nothing will ever read.
        if (generation.current !== mine || !alive.current) {
          revokeResults(produced);
          return;
        }
        resultsRef.current = produced;
        setResults(produced);
        setProgress({ percent: 100, label: "Finished" });
        setStatus("done");
        toolEvents.completed(toolName, Date.now() - startedAt);
      } catch (caught) {
        // Cancelling already reset the panel, and it is not a failure — the
        // visitor asked for it, so it must not reach the error box or analytics.
        // A superseded run's failure belongs to a run the visitor no longer
        // sees, so it is dropped too.
        if (caught instanceof CancelledError) {
          if (import.meta.env.DEV) console.info(`[${toolName}] cancelled`);
        } else if (generation.current !== mine) {
          if (import.meta.env.DEV) console.error(caught);
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
        // Only the newest run may clear the flag. A cancelled run that is
        // still unwinding would otherwise unlock the button while the next
        // run is in flight.
        if (generation.current === mine) {
          running.current = false;
          stop.current = false;
        }
      }
    },
    [clearResults, fail, toolName],
  );

  return { status, progress, error, results, run, cancel, reset, fail };
}
