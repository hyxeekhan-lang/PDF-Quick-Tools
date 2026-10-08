import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import {
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultStat,
} from "#/components/ToolFeedback";
import { button, cx } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import { PERMISSIONS, protectPdf } from "#/lib/operations-password";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/protect-pdf");

export const Route = createFileRoute("/protect-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: ProtectPage,
});

const FAQ = [
  {
    question: "Is the password strong enough?",
    answer:
      "The encryption is AES-256, which is the strongest scheme a PDF supports. How hard it is to guess depends entirely on the password you pick, so use a long one rather than something short.",
  },
  {
    question: "What is the difference between the two passwords?",
    answer:
      "The first is what someone types to open the file. The second is the owner password, which opens it and lifts the permission flags — a restriction on printing or copying. If you leave the second blank, a PDF tool can strip the restrictions without knowing anything.",
  },
  {
    question: "Can this protection actually be removed?",
    answer:
      "It cannot be broken, but it can be unlocked by anyone who knows the password — that is what the unlock tool does. The permission flags are a deterrent against casual copying, not encryption, so do not rely on them to keep a document secret. Only the password does that.",
  },
  {
    question: "Will the pages still look the same?",
    answer:
      "Yes. Encryption wraps the whole file without touching its contents, so text, images and layout are exactly as they were.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The file is encrypted in this browser tab on your own device. Your password is never sent anywhere, not even to us.",
  },
];

function ProtectPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [password, setPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [permissions, setPermissions] = useState(1);
  const [stats, setStats] = useState<ResultStat[]>([]);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function pick(files: AcceptedFile[]) {
    setFile(files[0] ?? null);
    setStats([]);
    run.reset();
  }

  function startOver() {
    setFile(null);
    setPassword("");
    setOwnerPassword("");
    setStats([]);
    run.reset();
  }

  async function start() {
    if (!file) return;
    await run.run(async (report) => {
      const result = await protectPdf(
        file.file,
        password,
        ownerPassword,
        permissions,
        report,
      );
      setStats([
        { label: "Encryption", value: "AES-256" },
        { label: "Permissions", value: PERMISSIONS.find((p) => p.value === permissions)?.label ?? "Custom" },
      ]);
      return [result];
    });
  }

  const canApply = file !== null && password.length > 0;

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Add a password so the file cannot be opened without it, and decide
          what an opener is allowed to do once it is.
        </p>

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
            <FileList
              files={[file]}
              kind="pdf"
              disabled={busy}
              status={busy ? "Encrypting" : "Ready to protect"}
              onRemove={startOver}
            />

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {!busy && (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Password to open the file
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Required"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Owner password
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={(event) => setOwnerPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Optional, but recommended"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-ink-500 dark:text-ink-400">
                    Set this and the restrictions below cannot be lifted without
                    it. Leave it blank and any PDF tool can remove them.
                  </span>
                </label>

                <fieldset>
                  <legend className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                    What can someone do once they open it?
                  </legend>
                  <div className="mt-2 space-y-2">
                    {PERMISSIONS.map((option) => (
                      <label
                        key={option.value}
                        className={cx(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                          permissions === option.value
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                            : "border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="permissions"
                          value={option.value}
                          checked={permissions === option.value}
                          onChange={() => setPermissions(option.value)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-semibold text-ink-900 dark:text-ink-100">
                            {option.label}
                          </span>
                          <span className="block text-xs text-ink-500 dark:text-ink-400">
                            {option.hint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {run.status === "error" && run.error && (
                  <ErrorMessage
                    message={run.error}
                    onRetry={start}
                    onStartOver={startOver}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={start}
                    disabled={!canApply}
                    className={cx(button("primary", "lg"), !canApply && "opacity-50")}
                  >
                    Protect PDF
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className={button("secondary", "lg")}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="Your PDF is protected"
            stats={stats}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Protect Another PDF"
            note="Keep the password somewhere safe. There is no way to recover it — nobody, including us, can open the file without it."
          />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm font-normal text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100";

function About() {
  return (
    <>
      <p>
        A PDF you send to someone is a PDF they keep. Once it leaves your
        machine there is nothing stopping it from being forwarded, and "please
        do not share this" is a request rather than a control.
      </p>
      <p>
        This tool adds AES-256 encryption, the strongest scheme a PDF format
        supports, so the file genuinely cannot be opened without the password.
        On top of that you can restrict what an opener is allowed to do — print
        it, copy text out of it, or neither.
      </p>
      <p>
        Be honest about what those restrictions are worth. They are a deterrent
        against casual copying, not a lock, and anyone with a PDF tool can lift
        them unless you set an owner password. Only the password is real
        protection. And since there is no recovery, store it carefully — a
        forgotten password means the file is gone.
      </p>
    </>
  );
}