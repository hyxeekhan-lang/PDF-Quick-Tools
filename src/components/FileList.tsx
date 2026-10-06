import { formatBytes, type AcceptedFile } from "#/lib/files";
import { CloseIcon, DocumentFileIcon, ImageFileIcon, PdfFileIcon } from "./Icons";
import { cx } from "./ui";

interface FileListProps {
  files: AcceptedFile[];
  kind: "pdf" | "image" | "document";
  onRemove?: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  status?: string;
  disabled?: boolean;
}

export function FileList({
  files,
  kind,
  onRemove,
  onMove,
  status,
  disabled = false,
}: FileListProps) {
  if (files.length === 0) return null;
  const reorderable = Boolean(onMove) && files.length > 1;

  return (
    <ul className="flex flex-col gap-2">
      {files.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800"
        >
          {reorderable && (
            <span className="w-5 shrink-0 text-center text-xs font-semibold text-ink-400 tabular-nums">
              {index + 1}
            </span>
          )}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
            {kind === "pdf" ? (
              <PdfFileIcon className="h-5 w-5" />
            ) : kind === "document" ? (
              <DocumentFileIcon className="h-5 w-5" />
            ) : (
              <ImageFileIcon className="h-5 w-5" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">
              {item.name}
            </span>
            <span className="block text-xs text-ink-500 dark:text-ink-500">
              {formatBytes(item.size)}
              {status ? ` · ${status}` : ""}
            </span>
          </span>

          {reorderable && (
            <span className="flex shrink-0 items-center gap-0.5">
              <ReorderButton
                label={`Move ${item.name} up`}
                disabled={disabled || index === 0}
                onClick={() => onMove?.(item.id, -1)}
                direction="up"
              />
              <ReorderButton
                label={`Move ${item.name} down`}
                disabled={disabled || index === files.length - 1}
                onClick={() => onMove?.(item.id, 1)}
                direction="down"
              />
            </span>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`Remove ${item.name}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ReorderButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: "up" | "down";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx(
        "inline-flex h-10 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors",
        "hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 dark:hover:bg-ink-800 dark:hover:text-white",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx("h-4 w-4", direction === "down" && "rotate-180")}
        aria-hidden="true"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>
  );
}
