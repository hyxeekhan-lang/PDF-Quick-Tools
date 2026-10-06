import { useCallback, useEffect, useRef, useState } from "react";
import { FileUploader } from "./FileUploader";
import { ErrorMessage, ProgressBar, SuccessPanel, type ResultFile } from "./ToolFeedback";
import { ToolPanel } from "./ToolShell";
import { button } from "./ui";
import { useToolRun, type Report } from "#/hooks/useToolRun";
import { usePageThumbs } from "#/hooks/usePageThumbs";
import type { AcceptedFile } from "#/lib/files";
import type { PageMark } from "#/lib/operations-forms";

/** Smallest drag the editor will keep, in canvas pixels. */
const MIN_MARK = 20;

interface MarkEditorProps<Mark extends PageMark> {
  toolName: string;
  onDraw: (file: File, marks: Mark[], report: Report) => Promise<ResultFile>;
  /** Fills the preview boxes with the colour the operation will use. */
  markColor?: { saved: string; active: string };
  markLabel: string;
  actionLabel: string;
  successTitle: string;
  startOverLabel: string;
}

/**
 * A reusable drawing workspace used by the highlight and redact tools.
 *
 * It owns a canvas over the currently selected page, converts mouse drags into
 * PDF-point rectangles, and lets the user walk the pages until every mark is
 * placed. The marks then flow into the route's operation.
 *
 * Coordinates are canvas pixels at the thumbnail's natural size, scaled by
 * `scale` for display. The page canvas is scaled to the actual PDF page box so
 * the numbers land where the reader sees them.
 */
export function MarkEditor<Mark extends PageMark>({
  toolName,
  onDraw,
  markColor = { saved: "rgba(0, 0, 0, 0.85)", active: "rgba(0, 0, 0, 0.45)" },
  markLabel,
  actionLabel,
  successTitle,
  startOverLabel,
}: MarkEditorProps<Mark>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbs = usePageThumbs();
  const run = useToolRun(toolName);
  const busy = run.status === "working";

  const [file, setFile] = useState<File | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [mark, setMark] = useState<Mark | null>(null);
  const [saved, setSaved] = useState<Mark[]>([]);

  const activePage = thumbs.thumbs[pageIndex];

  const pick = useCallback(
    async (files: AcceptedFile[]) => {
      const chosen = files[0];
      if (!chosen) return;
      setSaved([]);
      setMark(null);
      setPageIndex(0);
      run.reset();
      setFile(chosen.file);
      await thumbs.load(chosen.file);
    },
    [run, thumbs],
  );

  const startOver = useCallback(() => {
    thumbs.clear();
    setFile(null);
    setSaved([]);
    setMark(null);
    setPageIndex(0);
    run.reset();
  }, [run, thumbs]);

  // The canvas is sized to the page image's natural pixels. It is scaled down
  // with CSS to fit the column, and every mouse coordinate is divided by that
  // CSS scale so a drag lands exactly where the user pointed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    canvas.width = activePage.width;
    canvas.height = activePage.height;
  }, [activePage]);

  const toPagePixel = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;

    function down(e: MouseEvent) {
      const point = toPagePixel(e.clientX, e.clientY);
      if (!point) return;
      e.preventDefault();
      setDrawing(true);
      setMark({ page: pageIndex, x: point.x, y: point.y, width: 0, height: 0 } as Mark);
    }

    function move(e: MouseEvent) {
      if (!drawing) return;
      const point = toPagePixel(e.clientX, e.clientY);
      if (!point) return;
      setMark((current) => {
        if (!current) return current;
        return {
          ...current,
          width: point.x - current.x,
          height: point.y - current.y,
        } as Mark;
      });
    }

    function up() {
      if (!drawing) return;
      setDrawing(false);
      setMark((current) => {
        if (!current) return null;
        const width = Math.abs(current.width);
        const height = Math.abs(current.height);
        // A stray click is not a redaction. Anything under the threshold is
        // dropped rather than saved as a useless sliver.
        if (width < MIN_MARK || height < MIN_MARK) return null;
        return {
          ...current,
          x: Math.min(current.x, current.x + current.width),
          y: Math.min(current.y, current.y + current.height),
          width,
          height,
        } as Mark;
      });
    }

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", up);
    canvas.addEventListener("mouseleave", up);
    return () => {
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseleave", up);
    };
  }, [drawing, busy, pageIndex, toPagePixel]);

  // Repaint whenever the page or the marks change: the page image first, then
  // every box already placed on this page, then the one being dragged.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = markColor.saved;
      for (const savedMark of saved) {
        if (savedMark.page !== pageIndex) continue;
        ctx.fillRect(
          savedMark.x,
          savedMark.y,
          savedMark.width,
          savedMark.height,
        );
      }

      if (mark && mark.page === pageIndex) {
        ctx.fillStyle = markColor.active;
        ctx.fillRect(mark.x, mark.y, Math.abs(mark.width), Math.abs(mark.height));
      }
    };
    image.src = activePage.url;

    return () => {
      cancelled = true;
    };
  }, [activePage, saved, mark, pageIndex, markColor]);

  // A box is only kept once the drag that made it ends, which is what `up`
  // above hands back through setMark.
  useEffect(() => {
    if (!drawing && mark) setSaved((current) => [...current, mark]);
  }, [drawing, mark]);

  const onThisPage = saved.filter((m) => m.page === pageIndex);

  function undoLast() {
    setSaved((current) => {
      const next = [...current];
      next.pop();
      return next;
    });
  }

  async function start() {
    if (!file) return;
    if (saved.length === 0) {
      run.fail(`Draw ${markLabel} on this page before applying.`);
      return;
    }
    await run.run(async (report) => [await onDraw(file, saved, report)]);
  }

  return (
    <ToolPanel>
      {!file && (
        <FileUploader
          kind="pdf"
          toolName={toolName}
          onFiles={pick}
          onRejected={run.fail}
        />
      )}

      {file && run.status !== "done" && (
        <>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            Drag across the part of the page you want to mark. Move between pages
            to place more, then apply once when you are done.
          </p>

          {thumbs.loading && (
            <div className="mt-4">
              <ProgressBar progress={{ percent: 5, label: "Preparing page previews" }} />
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
                Preparing previews {thumbs.loaded}/{thumbs.total || "?"}
              </p>
            </div>
          )}

          {thumbs.error && (
            <ErrorMessage message={thumbs.error} onStartOver={startOver} />
          )}

          {activePage && (
            <div className="mt-4 overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
              <div ref={containerRef} className="relative">
                <canvas
                  ref={canvasRef}
                  className="block h-auto w-full cursor-crosshair touch-none select-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-ink-200 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-900/30">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setPageIndex((i) => (i > 0 ? i - 1 : thumbs.thumbs.length - 1))
                  }
                  className={button("secondary", "sm")}
                >
                  Previous
                </button>
                <span className="text-sm text-ink-700 dark:text-ink-300">
                  Page {pageIndex + 1} of {thumbs.thumbs.length}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setPageIndex((i) => (i < thumbs.thumbs.length - 1 ? i + 1 : 0))
                  }
                  className={button("secondary", "sm")}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {saved.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-600 dark:text-ink-400">
                <strong className="text-ink-900 dark:text-white">
                  {saved.length}
                </strong>{" "}
                {markLabel}
                {saved.length === 1 ? "" : "s"} placed · {onThisPage.length} on this
                page
              </p>
              <button
                type="button"
                onClick={undoLast}
                disabled={busy}
                className={button("secondary", "sm")}
              >
                Undo last
              </button>
            </div>
          )}

          {busy && <ProgressBar progress={run.progress} />}

          {run.status === "error" && run.error && (
            <ErrorMessage
              message={run.error}
              onRetry={saved.length > 0 ? start : undefined}
              onStartOver={startOver}
            />
          )}

          {!busy && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={start}
                disabled={saved.length === 0}
                className={button("primary", "lg")}
              >
                {actionLabel}
              </button>
              <button
                type="button"
                onClick={startOver}
                className={button("secondary", "lg")}
              >
                Choose Another PDF
              </button>
            </div>
          )}
        </>
      )}

      {run.status === "done" && run.results.length > 0 && (
        <SuccessPanel
          title={successTitle}
          results={run.results}
          toolName={toolName}
          onStartOver={startOver}
          startOverLabel={startOverLabel}
        />
      )}
    </ToolPanel>
  );
}
