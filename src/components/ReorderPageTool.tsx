import { useCallback, useEffect, useState } from "react";
import { FileList } from "./FileList";
import { FileUploader } from "./FileUploader";
import { ErrorMessage, ProgressBar, SuccessPanel } from "./ToolFeedback";
import { ToolPanel } from "./ToolShell";
import { button } from "./ui";
import { usePageThumbs } from "#/hooks/usePageThumbs";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile } from "#/lib/files";
import { rearrangePages } from "#/lib/operations";

export function ReorderPageTool({ toolName }: { toolName: string }) {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [dragged, setDragged] = useState<number | null>(null);
  const thumbs = usePageThumbs();
  const run = useToolRun(toolName);
  const busy = run.status === "working";

  useEffect(() => {
    if (thumbs.thumbs.length > 0) {
      setOrder(thumbs.thumbs.map((thumb) => thumb.pageNumber - 1));
    }
  }, [thumbs.thumbs]);

  const startOver = useCallback(() => {
    setFile(null);
    setOrder([]);
    setDragged(null);
    thumbs.clear();
    run.reset();
  }, [run, thumbs]);

  async function pick(files: AcceptedFile[]) {
    const chosen = files[0];
    setFile(chosen);
    setOrder([]);
    run.reset();
    await thumbs.load(chosen.file);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function drop(target: number) {
    if (dragged === null) return;
    move(dragged, target);
    setDragged(null);
  }

  async function start() {
    if (!file || order.length === 0) return;
    await run.run(async (report) => [await rearrangePages(file.file, order, report)]);
  }

  const thumbByPage = new Map(thumbs.thumbs.map((thumb) => [thumb.pageNumber - 1, thumb]));

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
          <FileList
            files={[file]}
            kind="pdf"
            disabled={busy}
            status={thumbs.loading ? `Preparing previews ${thumbs.loaded}/${thumbs.total || "?"}` : `${order.length} pages`}
            onRemove={startOver}
          />

          {thumbs.loading && (
            <ProgressBar
              progress={{
                percent: thumbs.total ? (thumbs.loaded / thumbs.total) * 100 : 5,
                label: "Preparing page previews",
              }}
            />
          )}

          {thumbs.error && <ErrorMessage message={thumbs.error} onStartOver={startOver} />}

          {!thumbs.loading && order.length > 0 && (
            <>
              <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200/80 dark:bg-ink-950/45 dark:ring-ink-800">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  Arrange your pages
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Drag a page to a new position, or use the arrows on smaller screens.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {order.map((pageIndex, position) => {
                    const thumb = thumbByPage.get(pageIndex);
                    if (!thumb) return null;
                    return (
                      <div
                        key={pageIndex}
                        draggable={!busy}
                        onDragStart={() => setDragged(position)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => drop(position)}
                        className={`group relative rounded-xl bg-white p-2 ring-1 transition dark:bg-ink-900 ${dragged === position ? "ring-brand-500 opacity-60" : "ring-ink-200 dark:ring-ink-700"}`}
                      >
                        <img src={thumb.url} alt={`Page ${pageIndex + 1}`} className="aspect-[3/4] w-full rounded-lg object-contain bg-ink-100 dark:bg-ink-800" />
                        <p className="mt-2 text-center text-xs font-semibold text-ink-700 dark:text-ink-200">Page {pageIndex + 1}</p>
                        <div className="mt-2 flex justify-center gap-1">
                          <button type="button" disabled={busy || position === 0} onClick={() => move(position, position - 1)} className="rounded-md px-2 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-200 disabled:opacity-30 dark:text-ink-300 dark:ring-ink-700" aria-label={`Move page ${pageIndex + 1} left`}>←</button>
                          <button type="button" disabled={busy || position === order.length - 1} onClick={() => move(position, position + 1)} className="rounded-md px-2 py-1 text-xs font-bold text-ink-600 ring-1 ring-ink-200 disabled:opacity-30 dark:text-ink-300 dark:ring-ink-700" aria-label={`Move page ${pageIndex + 1} right`}>→</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}
              {run.status === "error" && run.error && <ErrorMessage message={run.error} onRetry={start} onStartOver={startOver} />}
              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={start} className={button("primary", "lg")}>Save New Order</button>
                  <button type="button" onClick={startOver} className={button("secondary", "lg")}>Choose Another PDF</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {run.status === "done" && run.results.length > 0 && (
        <SuccessPanel
          title="PDF pages rearranged successfully"
          stats={[{ label: "Pages arranged", value: String(order.length), highlight: true }]}
          results={run.results}
          toolName={toolName}
          onStartOver={startOver}
          startOverLabel="Rearrange Another PDF"
        />
      )}

      {run.status === "error" && !file && run.error && <ErrorMessage message={run.error} onStartOver={startOver} />}
    </ToolPanel>
  );
}
