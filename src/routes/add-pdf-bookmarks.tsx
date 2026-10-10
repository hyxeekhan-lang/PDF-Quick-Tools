import { createFileRoute } from "@tanstack/react-router";
import { ToolShell } from "#/components/ToolShell";
import { FileUploader } from "#/components/FileUploader";
import { addBookmarks } from "#/lib/operations-forms";
import { getPageCount } from "#/lib/pdf";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile } from "#/lib/files";
import { button } from "#/components/ui";
import { useCallback, useState } from "react";

const tool = toolByHref("/add-pdf-bookmarks");

export const Route = createFileRoute("/add-pdf-bookmarks")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: AddBookmarksPage,
});

interface BookmarkEntry {
  page: number;
  title: string;
}

const FAQ = [
  {
    question: "What are bookmarks in a PDF?",
    answer:
      "Bookmarks are a table of contents that appears in the side panel of a PDF reader. They let a reader jump straight to a chapter or section instead of scrolling page by page.",
  },
  {
    question: "Do the bookmarks nest or can I make sub-items?",
    answer:
      "Not yet. This tool adds a flat list — one bookmark per page you choose. Nested sub-headings are a planned improvement.",
  },
  {
    question: "What title will the bookmark have?",
    answer:
      "A title you type. If you leave a title blank, that bookmark is skipped so your list only has meaningful entries.",
  },
  {
    question: "What if I guess the page number wrong?",
    answer:
      "The tool checks before saving: if a bookmark points past the last page, it tells you exactly which one.",
  },
  {
    question: "Will the bookmarks work on a phone?",
    answer:
      "The bookmark panel is supported by most desktop and tablet PDF readers. Mobile apps vary, and some show the bookmarks panel by default, others hide it behind a menu.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The outline is built in this browser tab on your own device.",
  },
];

function AddBookmarksPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [counting, setCounting] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useToolRun(tool.name);

  const pick = useCallback(
    (files: AcceptedFile[]) => {
      const chosen = files[0];
      if (!chosen) return;
      run.reset();
      setError(null);
      setBookmarks([]);
      setPage(1);
      setTitle("");
      setFile(chosen);
      setCounting(true);
      getPageCount(chosen.file).then(
        (count) => {
          setPageCount(count);
          setCounting(false);
        },
        () => {
          setPageCount(0);
          setCounting(false);
        },
      );
    },
    [run],
  );

  const startOver = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setBookmarks([]);
    setPage(1);
    setTitle("");
    run.reset();
  }, [run]);

  const addBookmark = useCallback(() => {
    if (page < 1 || page > pageCount) return;
    if (title.trim().length === 0) return;
    setBookmarks((current) => [...current, { page: page - 1, title: title.trim() }]);
    setTitle("");
  }, [page, title, pageCount]);

  const removeBookmark = useCallback((idx: number) => {
    setBookmarks((current) => current.filter((_, i) => i !== idx));
  }, []);

  async function start() {
    if (!file) return;
    if (bookmarks.length === 0) {
      run.fail("Add at least one bookmark before applying.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await run.run(async (report) => [
        await addBookmarks(file.file, bookmarks, report),
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      {!file && (
        <FileUploader
          kind="pdf"
          toolName={tool.name}
          onFiles={pick}
          onRejected={run.fail}
        />
      )}

      {file && run.status !== "done" && (
        <>
          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {counting && (
            <p className="mt-4 text-sm text-ink-600 dark:text-ink-400">
              Counting the pages in your PDF...
            </p>
          )}

          {!counting && pageCount === 0 && !error && (
            <p className="mt-4 text-sm text-ink-600 dark:text-ink-400">
              The page count for this PDF could not be read, so bookmarks cannot be
              placed. Try a different file.
            </p>
          )}

          {!counting && pageCount > 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                Add bookmark
              </p>
              <p className="text-xs text-ink-500 dark:text-ink-500">
                Page {page} of {pageCount}
              </p>
            </div>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-500">
              Type the page number and the heading this bookmark will show in the PDF reader.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={pageCount}
                value={page}
                onChange={(e) => setPage(Number(e.target.value) || 1)}
                placeholder={`Page (1 to ${pageCount})`}
                className="w-28 rounded-lg bg-white px-3 py-2 text-sm text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
              />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bookmark title"
                className="flex-1 min-w-[160px] rounded-lg bg-white px-3 py-2 text-sm text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
              />
              <button
                type="button"
                onClick={addBookmark}
                disabled={page < 1 || page > pageCount || title.trim().length === 0 || run.status === "working"}
                className={button("secondary", "sm")}
              >
                Add
              </button>
            </div>
          </div>
          )}

          {bookmarks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                Bookmarks ({bookmarks.length})
              </p>
              {bookmarks.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-950">
                  {/* min-w-0 on the flex parent is what makes the truncation work:
                      without it the inner flex item's automatic minimum size is
                      its content width, so a long bookmark title refused to
                      shrink and pushed Remove off the right edge of the card. */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                      Page {b.page + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{b.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBookmark(idx)}
                    disabled={run.status === "working"}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {run.status === "working" && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${run.progress?.percent ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">
                {run.progress?.label}
              </p>
            </div>
          )}

          {!loading && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={start}
                disabled={bookmarks.length === 0}
                className={button("primary", "lg")}
              >
                Add Bookmarks
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
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Bookmarks added successfully</p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            {bookmarks.length} bookmark{bookmarks.length === 1 ? "" : "s"} packed into your PDF.
          </p>
        </div>
      )}
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        A 50-page report is annoying to navigate. Add a bookmark for each
        chapter or section and the PDF reader gets a table of contents in its
        side panel. Readers can click their way straight to what they want.
      </p>
      <p>
        Pick a page, name the heading, and repeat until your table of contents
        is complete. The result opens with the bookmarks panel active so anyone
        can see it straight away.
      </p>
    </>
  );
}
