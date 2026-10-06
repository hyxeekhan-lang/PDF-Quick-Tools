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
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import type { AcceptedFile } from "#/lib/files";
import { unlockPdf } from "#/lib/operations-password";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/unlock-pdf");

export const Route = createFileRoute("/unlock-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: UnlockPage,
});

const FAQ = [
  {
    question: "Can it guess the password?",
    answer:
      "No, and nothing can. There is no way around a correct AES-256 password except a password someone else chose, which is slow enough to be impractical. This tool opens a file when you already know the password.",
  },
  {
    question: "Which password do I type?",
    answer:
      "Either one. A PDF can be locked against opening, against editing and printing, or both, and each uses a different password. Type whichever you have and it tries both roles.",
  },
  {
    question: "What if the file was not protected at all?",
    answer:
      "It still works. A PDF with no password opens straight away, and you get back a clean copy with nothing changed.",
  },
  {
    question: "Does unlocking damage the file?",
    answer:
      "No. Decryption removes the encryption layer and leaves the pages exactly as they were. You get a normal PDF that any reader can open.",
  },
  {
    question: "Are my files uploaded anywhere?",
    answer:
      "No. The file is decrypted in this browser tab on your own device, and the password you type is never sent anywhere.",
  },
];

function UnlockPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [password, setPassword] = useState("");
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
    setStats([]);
    run.reset();
  }

  async function start() {
    if (!file) return;
    await run.run(async (report) => {
      const result = await unlockPdf(file.file, password, report);
      setStats([
        { label: "Result", value: "Password removed", highlight: true },
      ]);
      return [result];
    });
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          If you know the password, this removes it and hands back a normal PDF
          that opens anywhere. If you do not know it, nothing can help — that
          is the point of the encryption.
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
              status={busy ? "Unlocking" : "Ready to unlock"}
              onRemove={startOver}
            />

            {busy && <ProgressBar progress={run.progress} />}

            {!busy && (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Password for this file
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="off"
                    placeholder="The password it was protected with"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-ink-500 dark:text-ink-400">
                    Leave this blank if the file was never protected — it will
                    still give you a clean copy.
                  </span>
                </label>

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
                    className={button("primary", "lg")}
                  >
                    Unlock PDF
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
            title="Your PDF is unlocked"
            stats={stats}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Unlock Another PDF"
            note="The pages are untouched. Only the password layer was removed."
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
        A password-protected PDF is doing its job when you cannot open it. So
        why does anyone need an unlocker? More often than not because you
        protected a file yourself, or someone sent you one and forgot to mention
        the password.
      </p>
      <p>
        This removes the password from a file you already have the password
        for, and hands back a plain PDF that opens in any reader. If the file
        was never protected, it still gives you a clean copy.
      </p>
      <p>
        It cannot guess, recover or crack a password you do not have, and
        neither can anything else — a correct AES-256 password takes longer to
        brute-force than any file is worth. If you have lost the password, you
        need it back from whoever set it.
      </p>
    </>
  );
}