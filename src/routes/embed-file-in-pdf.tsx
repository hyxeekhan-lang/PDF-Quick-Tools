import { createFileRoute } from "@tanstack/react-router";
import { ToolShell } from "#/components/ToolShell";
import { FileUploader } from "#/components/FileUploader";
import { FileList } from "#/components/FileList";
import { embedFile } from "#/lib/operations-forms";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";
import { useToolRun } from "#/hooks/useToolRun";
import { toAcceptedFile, type AcceptedFile } from "#/lib/files";
import { button } from "#/components/ui";
import { useCallback, useState } from "react";

const tool = toolByHref("/embed-file-in-pdf");

export const Route = createFileRoute("/embed-file-in-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: EmbedPage,
});

const FAQ = [
  {
    question: "Where does the embedded file go?",
    answer:
      "Into the PDF's attachments panel, the same place a recipient opens with the paperclip icon. It does not appear as a page inside the document.",
  },
  {
    question: "Will the attachment survive email or PDF converters?",
    answer:
      "Most email clients and document processors keep attachments, but some online compression tools strip them. If you need to be safe, also attach the file in the email itself.",
  },
  {
    question: "Can I embed a file larger than 10 MB?",
    answer:
      "Browsers may ask before uploading very large files, and extremely big attachments can make the PDF sluggish to open. For huge files, send them separately.",
  },
  {
    question: "Is my embedded file visible to the public?",
    answer:
      "No. The PDF is built in this browser tab on your own device; nothing is uploaded to any server.",
  },
  {
    question: "How does the recipient open the embedded file?",
    answer:
      "They open the PDF in their reader and click the attachments icon (usually a paperclip). The embedded copy appears in a list they can open or save.",
  },
];

function EmbedPage() {
  const [pdf, setPdf] = useState<AcceptedFile | null>(null);
  const [attachments, setAttachments] = useState<AcceptedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useToolRun(tool.name);
  const uploadInputId = "embed-attachment-input";

  const startOver = useCallback(() => {
    setPdf(null);
    setAttachments([]);
    run.reset();
  }, [run]);

  const pickAttachments = useCallback((files: AcceptedFile[]) => {
    setAttachments((current) => [...current, ...files]);
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((current) => current.filter((_, i) => i !== idx));
  }, []);

  async function start() {
    if (!pdf) return;
    if (attachments.length === 0) {
      run.fail("Choose at least one file to embed.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await run.run(async (report) => [
        await embedFile(pdf.file, attachments.map((a) => a.file), report),
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      {!pdf && (
        <FileUploader
          kind="pdf"
          toolName={tool.name}
          onFiles={(files) => setPdf(files[0] ?? null)}
          onRejected={run.fail}
        />
      )}

      {pdf && run.status !== "done" && (
        <>
          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <FileList
            files={[pdf]}
            kind="pdf"
            disabled={run.status === "working"}
            status={`${attachments.length} file${attachments.length === 1 ? "" : "s"} to embed`}
            onRemove={startOver}
          />

          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                Embedded files
              </p>
              {attachments.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-950">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-700 dark:text-ink-300">{a.file.name}</span>
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600 dark:bg-ink-900 dark:text-ink-400">
                      attached
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    disabled={run.status === "working"}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">Add files to embed</p>
                <p className="text-xs text-ink-500 dark:text-ink-500">
                  {attachments.length} / 5 selected
                </p>
              </div>
              <div className="mt-2">
                <input
                  id={uploadInputId}
                  ref={(el) => el?.click()}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;
                    pickAttachments(files.map(toAcceptedFile));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(uploadInputId) as HTMLInputElement;
                    el?.click();
                  }}
                  disabled={run.status === "working" || attachments.length >= 5}
                  className={button("secondary", "sm")}
                >
                  Browse files
                </button>
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-500">
                  Pack a CV, certificates, invoices, spreadsheets, images or zips inside the PDF.
                </p>
              </div>
            </div>
          </div>

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
                disabled={attachments.length === 0}
                className={button("primary", "lg")}
              >
                Embed Files
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
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">PDF with attachments ready</p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            {attachments.length} file{attachments.length === 1 ? "" : "s"} embedded into a single copy.
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
        One link, one email, one complete picture. Tuck your CV and supporting
        certificates, the invoice and its proof of payment, or the report and its
        raw data inside a single PDF so nothing gets left out.
      </p>
      <p>
        The recipient opens it the way they would any attachment: the paperclip
        icon in the PDF viewer shows the packed file. It does not display inside
        the pages, because it is a payload, not content.
      </p>
    </>
  );
}
