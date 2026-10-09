import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, LockIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { button, heading, muted, sectionWrap } from "#/components/ui";
import { formatBytes, PDF_ACCEPT, validateFile } from "#/lib/files";
import { watchUploads, type UploadEvidence } from "#/lib/upload-proof";
import { MAX_FILE_LABEL } from "#/lib/site";

/**
 * The privacy claim, measured rather than stated.
 *
 * Everywhere else on this site "your file stays on your device" is a sentence.
 * Here it is a number, taken from the browser's own record of what crossed the
 * network while a real file was open. The visitor picks a file, the counter runs,
 * and the result shows `0 bytes` — which is the only form of this claim a
 * sceptical person should accept.
 *
 * Two deliberate choices:
 *
 *  - The file is never actually read. Nothing is parsed, opened or compressed
 *    here. The point is the network, not the document, and reading the file
 *    would be the one upload-shaped thing this section does.
 *  - The "other requests" row is shown next to the document count. This page is
 *    not making zero requests — fonts, ad scripts and chunks all load — so a
 *    single "0 requests" claim would be false. Showing both is what makes the
 *    first number believable.
 *
 * If a future change uploads documents, this component shows the real number
 * instead of the intended one. That is the whole reason it reads the network
 * rather than a flag the app sets.
 */
export function PrivacyProof() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [evidence, setEvidence] = useState<UploadEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The watcher lives in a ref because it holds patched network functions —
  // putting it in state would mean it could be re-created by an unrelated
  // render and the patches would stack.
  const watcher = useRef<ReturnType<typeof watchUploads> | null>(null);

  // Unpatch on unmount. Without this, navigating away from the homepage would
  // leave `fetch` wrapped for the rest of the session, and the count would keep
  // accruing on pages that never asked for it.
  useEffect(
    () => () => {
      watcher.current?.stop();
      watcher.current = null;
    },
    [],
  );

  const watch = useCallback((file: File) => {
    watcher.current?.stop();
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);

    // Watch first, then record the baseline. Any request that happens after
    // this line — including the one that would carry the document — is
    // counted, so nothing can slip through between picking the file and
    // starting the count.
    const session = watchUploads(file.size);
    watcher.current = session;

    // One tick of idle time, then the reading. The delay is not decoration:
    // requests fired in the same frame as the click (prefetch, a lazy chunk
    // the file picker triggered) are page traffic, and showing them on the
    // same line as the document would overstate what happened.
    setTimeout(() => {
      setEvidence(session.evidence());
    }, 1500);
  }, []);

  function reset() {
    watcher.current?.stop();
    watcher.current = null;
    setFileName(null);
    setFileSize(0);
    setEvidence(null);
    setError(null);
  }

  const clean = evidence !== null && evidence.documentBytes === 0;

  return (
    <section aria-labelledby="proof-heading" className={`${sectionWrap} mt-24`}>
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
          <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Check it yourself
        </span>
        <h2 id="proof-heading" className={`mt-4 ${heading.h2}`}>
          See for yourself: we never upload your file
        </h2>
        <p className={`mt-2.5 ${muted}`}>
          Pick any PDF. This watches your browser's own network log while the
          file is open and reports what actually left your device. Nothing is
          read or sent — the point is the connection, not the document.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-8">
        <div className="rounded-3xl bg-white p-7 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800">
          {!fileName ? (
            <>
              <div className="flex items-center gap-3.5">
                <ToolIconTile name="compress" size="lg" />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink-900 dark:text-white">
                    Choose a PDF
                  </p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    Up to {MAX_FILE_LABEL}. Any file will do.
                  </p>
                </div>
              </div>

              <input
                ref={inputRef}
                id="privacy-proof-input"
                type="file"
                accept={PDF_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const problem = validateFile(file, "pdf");
                  if (problem) {
                    setError(problem);
                    return;
                  }
                  watch(file);
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`${button("primary", "lg")} mt-6 w-full`}
              >
                Watch my network
              </button>
              {error && (
                <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ToolIconTile name="compress" size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {fileName}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {formatBytes(fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-xs font-semibold text-ink-500 underline underline-offset-2 hover:text-ink-800 dark:text-ink-400 dark:hover:text-white"
                >
                  Try another
                </button>
              </div>

              {evidence === null ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-ink-600 dark:text-ink-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600 dark:border-ink-700" />
                  Watching the network…
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <div
                    className={`flex items-center justify-between rounded-2xl px-4 py-3.5 ${
                      clean
                        ? "bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-800"
                        : "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-800"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink-900 dark:text-white">
                      {clean ? (
                        <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      ) : (
                        <LockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      )}
                      Your document sent
                    </span>
                    <span
                      className={`text-lg font-black tabular-nums ${
                        clean
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {formatBytes(evidence.documentBytes)}
                    </span>
                  </div>

                  {/* Not hidden: this page makes requests. An ad script and a
                      lazy chunk are real traffic, and showing them is what
                      makes the document count above believable. */}
                  <div className="flex items-center justify-between px-1 text-xs text-ink-500 dark:text-ink-400">
                    <span>Other page requests while it was open</span>
                    <span className="font-semibold tabular-nums">
                      {evidence.otherRequests}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
          <p>
            This is read from the browser&rsquo;s own record of your network
            requests — the same log your browser devtools would show — not from a
            setting this website can turn on or off.
          </p>
          <p className="mt-4">
            A request is only counted as your document if the request body is
            exactly the size of the file you picked. Everything else is listed
            separately below, because a page that loads fonts and ad scripts is
            not making zero requests and pretending otherwise would make the
            number above worthless.
          </p>
          <p className="mt-4">
            The AI tools are the exception, and they say so on their own pages: your
            original PDF stays on your device, but its extracted text — and, for
            scanned pages, an image of each page — is sent to the AI provider when
            you start an AI action.
          </p>
        </div>
      </div>
    </section>
  );
}
