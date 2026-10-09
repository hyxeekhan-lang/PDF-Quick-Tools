import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileUploader } from "#/components/FileUploader";
import { FileList as ChosenFiles } from "#/components/FileList";
import { OptionCards } from "#/components/OptionCards";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import {
  ErrorMessage,
  ProgressBar,
  SuccessPanel,
  type ResultStat,
} from "#/components/ToolFeedback";
import { useToolRun } from "#/hooks/useToolRun";
import {
  compressPdfToExactSize,
  EXACT_PRESETS,
  parseTargetSize,
  type ExactQuality,
} from "#/lib/exact-size";
import { formatBytes, type AcceptedFile, type ResultFile } from "#/lib/files";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const TOOL = toolByHref("/compress-pdf-to-specific-size");

const TITLE = "Compress PDF to Exact Size — Hit Any KB or MB Target";
const DESCRIPTION =
  "Shrink a PDF to a specific file size — 100 KB, 200 KB, 500 KB, 1 MB or your own target. Runs entirely in your browser.";

export const Route = createFileRoute("/compress-pdf-to-specific-size")({
  head: () =>
    pageHead({ title: TITLE, description: DESCRIPTION, path: "/compress-pdf-to-specific-size" }),
  component: ExactSizePage,
});

const FAQ = [
  {
    question: "Will my PDF definitely reach the size I choose?",
    answer:
      "Not always, and we would rather tell you than quietly hand you a file that misses the target. A PDF has a floor below which its pages stop being readable, so a high-resolution scan may not fit under 100 KB without becoming unreadable. When that happens you get the smallest legible file we could make, with its real size shown. If the result is too small or too large for your purpose, try the same file with a different target.",
  },
  {
    question: "Why does hitting an exact size take longer than normal compression?",
    answer:
      "Normal compression makes three versions and keeps the smallest. Hitting a target means re-rendering your pages several times at different quality and resolution settings, checking the real size each time, and stopping as soon as it fits. On a long scanned document that is noticeably more work — it is why the progress bar shows several passes rather than one.",
  },
  {
    question: "What is the difference between low, balanced and high?",
    answer:
      "They set how far down the quality search is allowed to go. Low will work harder to reach a small target and may reduce text sharpness. High gives up sooner rather than pushing a page below the point where it stays readable. If a target is unreachable, Low is the setting most likely to reach it.",
  },
  {
    question: "Is my file uploaded?",
    answer:
      "No. Every render happens in this browser tab on your own device. Your PDF is never sent to a server, which is also why a very large document depends on how much memory your phone or computer has free.",
  },
  {
    question: "My PDF was already smaller than the target. Why was nothing changed?",
    answer:
      "Because compressing it would only have made it larger and cost you quality for nothing. The tool returns your original file untouched and says so.",
  },
];

const PRESET_OPTIONS = EXACT_PRESETS.map((preset) => ({
  value: String(preset.bytes),
  label: preset.label,
  description: "Fit under this size",
}));

const QUALITY_OPTIONS = [
  { value: "high" as const, label: "High", description: "Best looking, gives up sooner" },
  { value: "balanced" as const, label: "Balanced", description: "Good for most documents" },
  { value: "low" as const, label: "Low", description: "Works hardest to hit small targets" },
];

interface Result extends ResultFile {
  originalSize: number;
  compressedSize: number;
  targetMet: boolean;
  impossible: boolean;
}

function ExactSizePage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [target, setTarget] = useState("204800");
  const [custom, setCustom] = useState("");
  const [quality, setQuality] = useState<ExactQuality>("balanced");
  const [stats, setStats] = useState<ResultStat[]>([]);
  const [outcome, setOutcome] = useState<Result | null>(null);
  const run = useToolRun("Compress PDF to Exact Size");
  const busy = run.status === "working";

  const chosenBytes = custom.trim() !== "" ? parseTargetSize(custom) : Number(target);
  const customError =
    custom.trim() !== "" && parseTargetSize(custom) === null
      ? "Enter a size like 250 KB, 1.5 MB, or a number of bytes."
      : null;

  function pick(files: AcceptedFile[]) {
    setFile(files[0]);
    setStats([]);
    setOutcome(null);
    run.reset();
  }

  function startOver() {
    setFile(null);
    setStats([]);
    setOutcome(null);
    run.reset();
  }

  async function compress() {
    if (!file || chosenBytes === null) return;
    await run.run(async (report) => {
      const result = await compressPdfToExactSize(file.file, chosenBytes, quality, report);
      const saved = result.originalSize - result.compressedSize;
      const percent =
        result.originalSize > 0 ? Math.round((saved / result.originalSize) * 100) : 0;

      setStats([
        { label: "Original size", value: formatBytes(result.originalSize) },
        { label: "Compressed size", value: formatBytes(result.compressedSize) },
        { label: "Target", value: formatBytes(chosenBytes) },
        {
          label: "Saved",
          value: percent > 0 ? `${percent}%` : "0%",
          highlight: percent > 0,
        },
      ]);

      const next: Result = {
        ...result.result,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        targetMet: result.targetMet,
        impossible: result.impossible,
      };
      setOutcome(next);
      return [result.result];
    });
  }

  const missed = outcome ? !outcome.targetMet : false;

  return (
    <ToolShell tool={TOOL} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader kind="pdf" toolName={TOOL.name} onFiles={pick} onRejected={run.fail} />
        )}

        {file && run.status !== "done" && (
          <>
            <ChosenFiles kind="pdf" files={[file]} onRemove={startOver} />

            <OptionGroup legend="Target size" hint="Pick a common limit, or type your own below.">
              <OptionCards
                name="target"
                value={custom.trim() === "" ? target : "custom"}
                onChange={(value) => {
                  if (value !== "custom") {
                    setTarget(value);
                    setCustom("");
                  }
                }}
                options={PRESET_OPTIONS}
              />
              <div className="mt-3">
                <label htmlFor="custom-target" className="text-sm text-ink-600 dark:text-ink-400">
                  Or enter your own target
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    id="custom-target"
                    type="text"
                    inputMode="text"
                    value={custom}
                    onChange={(event) => setCustom(event.target.value)}
                    placeholder="e.g. 250 KB or 2.5 MB"
                    aria-invalid={customError !== null}
                    aria-describedby={customError ? "custom-target-error" : undefined}
                    className="w-44 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700"
                  />
                  {custom.trim() !== "" && (
                    <button
                      type="button"
                      onClick={() => setCustom("")}
                      className="text-xs font-semibold text-ink-500 underline underline-offset-2 dark:text-ink-400"
                    >
                      Use a preset instead
                    </button>
                  )}
                </div>
                {customError && (
                  <p id="custom-target-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {customError}
                  </p>
                )}
              </div>
            </OptionGroup>

            <OptionGroup
              legend="Compression setting"
              hint="How far down the quality search to go when the target is hard to reach."
            >
              <OptionCards name="quality" value={quality} onChange={(value) => setQuality(value as ExactQuality)} options={QUALITY_OPTIONS} />
            </OptionGroup>

            {busy && <ProgressBar progress={run.progress} />}

            <ErrorMessage
              message={
                run.error ??
                (customError && custom.trim() !== "" ? customError : undefined)
              }
            />

            <button
              type="button"
              onClick={compress}
              disabled={busy || customError !== null}
              className="w-full rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : `Compress to ${chosenBytes !== null ? formatBytes(chosenBytes) : "target"}`}
            </button>

            {busy && (
              <button
                type="button"
                onClick={run.cancel}
                className="block w-full text-center text-sm text-ink-500 underline underline-offset-2 dark:text-ink-400"
              >
                Cancel
              </button>
            )}
          </>
        )}

        {run.status === "done" && outcome && (
          <SuccessPanel
            title={outcome.targetMet ? "Target reached" : "Closest we could get"}
            stats={stats}
            results={run.results}
            toolName={TOOL.name}
            onStartOver={startOver}
            startOverLabel="Compress another"
            note={
              outcome.targetMet
                ? "This file is under your target. Check that the pages are still readable before you send it — very small targets trade sharpness for size."
                : missed
                  ? `We could not reach ${chosenBytes === null ? "your target" : formatBytes(chosenBytes)} without making the pages unreadable, so this is the smallest file we could produce. It is ${formatBytes(outcome.compressedSize)}. Try a larger target, or the Low setting.`
                  : undefined
            }
          />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Most compression tools answer one question: how small can this file get?
        That is the wrong question when something is already telling you a
        number. An email server rejecting anything over 1&nbsp;MB, a university
        portal capping submissions at 500&nbsp;KB, a job application form asking
        for 200&nbsp;KB — in each case the size is a hard limit you already know,
        and what you need is the <strong>smallest file that is still legible at
        that size</strong>, not the smallest file period.
      </p>
      <p>
        This tool works towards that number. It renders your pages, measures the
        real file, and if it is still too large it tries again at a lower quality
        and a lower resolution, stopping as soon as it fits. Every size you see
        on the result screen was measured from a file this tool actually
        produced — nothing is estimated.
      </p>
      <p>
        <strong>Sometimes the target cannot be met.</strong> A PDF has a floor
        below which its pages stop being readable, and a high-resolution scan or
        a document full of photographs may not fit under a small limit without
        becoming unreadable. When that happens you get the smallest legible file
        we could make, with its real size shown, rather than a file that quietly
        misses the target. Try a larger target or the Low setting in that case.
      </p>
      <p>
        Nothing is uploaded. Every render happens in this browser tab on your own
        device, so your document never travels across the internet at all.
      </p>
    </>
  );
}