import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toolEvents } from "#/lib/analytics";
import {
  DOCX_ACCEPT,
  IMAGE_ACCEPT,
  PDF_ACCEPT,
  XLSX_ACCEPT,
  sanitizeFilename,
  toAcceptedFile,
  validateFile,
  type AcceptedFile,
  type FileKind,
} from "#/lib/files";
import { acceptPending, rejectPending } from "#/lib/pendingFile";
import { MAX_FILE_LABEL } from "#/lib/site";
import { toolHrefOf } from "#/lib/tools";
import { ImageFileIcon, PdfFileIcon, UploadIcon } from "./Icons";
import { GoogleDriveImportButton, asAcceptedDriveFile } from "./GoogleDriveImportButton";
import { button, cx } from "./ui";

interface FileUploaderProps {
  kind: FileKind | "either";
  multiple?: boolean;
  toolName: string;
  onFiles: (files: AcceptedFile[]) => void;
  onRejected: (message: string) => void;
  label?: string;
  hint?: string;
  compact?: boolean;
  cameraCapture?: boolean;
}

export function FileUploader({
  kind,
  multiple = false,
  toolName,
  onFiles,
  onRejected,
  label,
  hint,
  compact = false,
  cameraCapture = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dropSuccess, setDropSuccess] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const depth = useRef(0);
  const inputId = useId();
  const hintId = useId();

  const noun =
    kind === "pdf"
      ? "PDF"
      : kind === "image"
        ? "image"
        : kind === "document"
          ? "document"
          : kind === "spreadsheet"
            ? "Excel workbook"
            : "PDF or image";
  // "either" accepts both shapes without validating either one, which is why
  // it falls through to the hand-written check in `accept` below.
  const acceptedKind: FileKind | undefined = kind === "either" ? undefined : kind;
  // The query string only exists in a browser, but this component also renders
  // on the server and during hydration. Reading it during render threw
  // `window is not defined` on the server and would have disagreed with the
  // first client render, so it is read after mount instead. The first paint
  // simply shows no prefetched document — which is what every visitor without
  // the Chrome extension sees anyway.
  const acceptsPrefetch = kind === "pdf" || kind === "document";
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // A file handed over by the homepage dropzone.
  //
  // This lives here rather than in each tool route so that every tool which
  // shows a PDF uploader picks the file up without being edited one by one —
  // which is also the only way the dropzone can route to a tool by file type
  // without that tool having to know the dropzone exists.
  //
  // `onFiles` and `onRejected` are props, and a tool route passes handlers
  // that are rebuilt on every render, so this effect cannot simply depend on
  // them without re-firing. The ref is the guard: a file is handed over once
  // per mount, and the key is the tool, so switching tools on the same page
  // re-arms it.
  const handedOver = useRef("");
  useEffect(() => {
    if (!acceptedKind) return;
    if (handedOver.current === toolName) return;
    const href = toolHrefOf(toolName);
    const incoming = acceptPending(href, acceptedKind);
    if (!incoming) {
      const rejection = rejectPending();
      if (rejection) onRejected(rejection);
      return;
    }
    handedOver.current = toolName;
    setDropSuccess(true);
    window.setTimeout(() => setDropSuccess(false), 900);
    toolEvents.fileSelected(toolName, 1, incoming.file.size);
    onFiles([incoming]);
    // `onFiles` and `onRejected` are deliberately absent: a tool route passes
    // handlers rebuilt on every render, and depending on them would re-arm the
    // handoff on every keystroke elsewhere in the page. `handedOver` is what
    // makes this run once per tool, and a tool page opened directly finds
    // nothing parked and does nothing at all.
  }, [toolName, acceptedKind]);

  useEffect(() => {
    if (!acceptsPrefetch) {
      setSourceUrl(null);
      return;
    }
    const value = new URLSearchParams(window.location.search).get("sourceUrl");
    if (!value) {
      setSourceUrl(null);
      return;
    }
    try {
      const url = new URL(value);
      setSourceUrl(url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null);
    } catch {
      setSourceUrl(null);
    }
  }, [acceptsPrefetch]);

  const accept = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const incoming = multiple ? Array.from(list) : [list[0]];
      const good: AcceptedFile[] = [];
      const problems: string[] = [];

      for (const file of incoming) {
        const problem = acceptedKind
          ? validateFile(file, acceptedKind)
          : file.type === "application/pdf" || file.type.startsWith("image/")
            ? null
            : "Choose a PDF or image file.";
        if (problem) problems.push(problem);
        else good.push(toAcceptedFile(file));
      }

      if (problems.length > 0) onRejected(problems[0]);
      if (good.length > 0) {
        setDropSuccess(true);
        window.setTimeout(() => setDropSuccess(false), 900);
        toolEvents.fileSelected(
          toolName,
          good.length,
          good.reduce((sum, item) => sum + item.size, 0),
        );
        onFiles(good);
      }
    },
    [acceptedKind, kind, multiple, onFiles, onRejected, toolName],
  );

  const useSourcePdf = useCallback(async () => {
    if (!sourceUrl || sourceLoading) return;
    setSourceLoading(true);
    try {
      const response = await fetch(sourceUrl, { method: "GET", credentials: "omit" });
      if (!response.ok) {
        throw new Error("The PDF link could not be opened. It may require a login or block cross-site access.");
      }
      const blob = await response.blob();
      const pathName = new URL(sourceUrl).pathname.split("/").pop() || "current-document.pdf";
      const fileName = `${sanitizeFilename(pathName, "current-document")}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const problem = validateFile(file, "pdf");
      if (problem) throw new Error(problem);
      toolEvents.fileSelected(toolName, 1, file.size);
      onFiles([toAcceptedFile(file)]);
    } catch (error) {
      onRejected(error instanceof Error ? error.message : "This PDF could not be loaded from the current page.");
    } finally {
      setSourceLoading(false);
    }
  }, [onFiles, onRejected, sourceLoading, sourceUrl, toolName]);

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="peer sr-only"
        accept={
          kind === "pdf"
            ? PDF_ACCEPT
            : kind === "image"
              ? IMAGE_ACCEPT
              : kind === "document"
                ? DOCX_ACCEPT
                : kind === "spreadsheet"
                  ? XLSX_ACCEPT
                  : `${PDF_ACCEPT},${IMAGE_ACCEPT}`
        }
        multiple={multiple}
        capture={cameraCapture && kind === "image" ? "environment" : undefined}
        aria-describedby={hintId}
        onChange={(event) => {
          accept(event.target.files);
          // Allow re-picking the same file after a reset.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) {
            depth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
        className={cx(
          "dropzone-motion relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-all duration-300 animate-blur-in transform-gpu will-change-transform peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 dark:peer-focus-visible:outline-brand-400",
          compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-12 sm:py-16",
          dragging
            ? "is-dragging border-[#3B82F6] bg-brand-50 scale-[1.02] upload-pulse dark:border-[#3B82F6] dark:bg-brand-600/10"
            : dropSuccess
              ? "is-drop-success border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/20"
            : "border-ink-300 bg-ink-50/60 hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900/40 dark:hover:border-brand-500 dark:hover:bg-brand-600/5",
        )}
      >
        {dropSuccess && (
          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <i key={index} className={`confetti confetti-${index + 1}`} />
            ))}
          </span>
        )}
        <span
          className={cx(
            "flex items-center justify-center rounded-2xl bg-white text-brand-600 ring-1 ring-ink-200 dark:bg-ink-800 dark:text-brand-300 dark:ring-ink-700",
            compact ? "h-11 w-11" : "h-14 w-14",
          )}
        >
          {kind === "image" ? (
            <ImageFileIcon className={cx(compact ? "h-5 w-5" : "h-6 w-6", dragging && "upload-arrow" )} />
          ) : (
            <PdfFileIcon className={cx(compact ? "h-5 w-5" : "h-6 w-6", dragging && "upload-arrow" )} />
          )}
        </span>

        <span className="text-base font-semibold text-ink-900 dark:text-white">
          {label ?? `Upload ${multiple ? `${noun}s` : noun}`}
        </span>
        <span className="text-sm text-ink-600 dark:text-ink-400">
          Drag and drop {multiple ? `your ${noun}s` : `your ${noun}`} here
        </span>

        <span
          className={cx(button("primary", "md"), "pointer-events-none mt-1")}
          aria-hidden="true"
        >
          <UploadIcon className="h-4 w-4" />
          Choose {multiple ? "Files" : "File"}
        </span>

        <span id={hintId} className="mt-1 text-xs text-ink-500 dark:text-ink-500">
          {hint ??
            (cameraCapture
              ? `Take a photo with your camera or choose files · Maximum size: ${MAX_FILE_LABEL} per file`
              : `Maximum size: ${MAX_FILE_LABEL} per file`)}
        </span>
      </label>
      {sourceUrl && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/25">
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold text-brand-900 dark:text-brand-100">PDF link detected</span>
            <span className="block max-w-[18rem] truncate text-xs text-brand-700 dark:text-brand-300">Choose it from the current page</span>
          </span>
          <button type="button" onClick={useSourcePdf} disabled={sourceLoading} className={button("primary", "sm")}>
            {sourceLoading ? "Loading..." : "Use this PDF"}
          </button>
        </div>
      )}
      {kind === "pdf" && !multiple && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <GoogleDriveImportButton
            onFile={(file) => {
              toolEvents.fileSelected(toolName, 1, file.size);
              onFiles([asAcceptedDriveFile(file)]);
            }}
            onError={onRejected}
          />
          <span className="text-xs text-ink-500 dark:text-ink-400">
            Optional cloud import; choose only the file this tool needs.
          </span>
        </div>
      )}
    </div>
  );
}
