import { useCallback, useEffect, useState } from "react";
import { FileUploader } from "./FileUploader";
import {
  EmptyState,
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultFile,
} from "./ToolFeedback";
import { ToolPanel } from "./ToolShell";
import { button } from "./ui";
import { useToolRun, type Report } from "#/hooks/useToolRun";
import { readFormFields } from "#/lib/operations-forms";
import { FriendlyError, type AcceptedFile } from "#/lib/files";

interface FieldItem {
  name: string;
  value: string;
  filled: boolean;
}

interface FormFillerProps {
  toolName: string;
  onRun: (file: File, values: Record<string, string>, report: Report) => Promise<ResultFile>;
  successTitle: string;
  startOverLabel: string;
}

const READ_FAILURE =
  "The form fields in this PDF could not be read. It may be damaged or protected.";

/**
 * Reads a PDF's AcroForm fields and lets the user type answers before writing
 * them back into the document itself.
 */
export function FormFiller({
  toolName,
  onRun,
  successTitle,
  startOverLabel,
}: FormFillerProps) {
  const run = useToolRun(toolName);
  const busy = run.status === "working";

  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const pick = useCallback(
    (files: AcceptedFile[]) => {
      const chosen = files[0];
      if (!chosen) return;
      run.reset();
      setFields([]);
      setLoadError(null);
      setLoading(true);
      setFile(chosen.file);

      readFormFields(chosen.file).then(
        (loaded) => {
          setFields(loaded.map((field) => ({ ...field, filled: false })));
          setLoading(false);
        },
        (caught) => {
          setLoadError(
            caught instanceof FriendlyError ? caught.message : READ_FAILURE,
          );
          setLoading(false);
        },
      );
    },
    [run],
  );

  // A cancelled render must not leave state behind for a file the user has
  // already moved on from.
  useEffect(() => () => setLoading(false), []);

  const startOver = useCallback(() => {
    setFile(null);
    setFields([]);
    setLoadError(null);
    run.reset();
  }, [run]);

  function toggle(name: string, on: boolean) {
    setFields((current) =>
      current.map((field) =>
        field.name === name
          ? { ...field, filled: on, value: on ? field.value : "" }
          : field,
      ),
    );
  }

  function updateValue(name: string, value: string) {
    setFields((current) =>
      current.map((field) => (field.name === name ? { ...field, value } : field)),
    );
  }

  const chosen = fields.filter((field) => field.filled && field.value.trim().length > 0);

  async function start() {
    if (!file) return;
    if (chosen.length === 0) {
      run.fail("Fill in at least one field before applying.");
      return;
    }
    const values: Record<string, string> = {};
    for (const field of chosen) values[field.name] = field.value.trim();
    await run.run(async (report) => [await onRun(file, values, report)]);
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
          {loading && (
            <ProgressBar progress={{ percent: 40, label: "Reading the form fields" }} />
          )}

          {loadError && (
            <ErrorMessage message={loadError} onStartOver={startOver} />
          )}

          {!loading && !loadError && fields.length === 0 && (
            <EmptyState
              title="No fillable fields found"
              body="This PDF has no real form fields behind the boxes, so there is nothing to write into. If the boxes are just drawn on the page, this tool cannot fill them."
            />
          )}

          {!loading && fields.length > 0 && (
            <>
              <p className="text-sm text-ink-600 dark:text-ink-400">
                This PDF has{" "}
                <strong className="text-ink-900 dark:text-white">
                  {fields.length} field{fields.length === 1 ? "" : "s"}
                </strong>
                . Tick the ones you want to fill, type your answer, then apply.
              </p>

              <div className="mt-4 space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className="rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-950 dark:hover:bg-ink-900/30"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                      <input
                        type="checkbox"
                        checked={field.filled}
                        onChange={(e) => toggle(field.name, e.target.checked)}
                        disabled={busy}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-700"
                      />
                      {field.name}
                    </label>

                    {field.filled && (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateValue(field.name, e.target.value)}
                        disabled={busy}
                        placeholder="Type your answer"
                        aria-label={`Answer for ${field.name}`}
                        className="mt-2 w-full rounded-lg bg-white px-3.5 py-2 text-sm text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {busy && <ProgressBar progress={run.progress} />}

          {run.status === "error" && run.error && (
            <ErrorMessage
              message={run.error}
              onRetry={chosen.length > 0 ? start : undefined}
              onStartOver={startOver}
            />
          )}

          {!busy && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={start}
                disabled={chosen.length === 0}
                className={button("primary", "lg")}
              >
                Apply to PDF
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
