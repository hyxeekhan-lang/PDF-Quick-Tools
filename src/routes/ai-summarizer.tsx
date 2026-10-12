import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileUploader } from "#/components/FileUploader";
import { ProgressBar, ErrorMessage } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { GenerateButton } from "#/components/GenerateButton";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile, FriendlyError } from "#/lib/files";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";
import {
  extractPdfText,
  mergeSummaryPrompt,
  processAiDocument,
  summarizePrompt,
} from "#/lib/ai";
import { AiSummaryPanel, type AiSummary } from "#/components/AiSummaryPanel";

const tool = toolByHref("/ai-summarizer");

export const Route = createFileRoute("/ai-summarizer")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: AiSummarizerPage,
});

const FAQ = [
  {
    question: "How does the AI summarizer work?",
    answer:
      "Upload a PDF and our AI will extract the text content, analyze it, and generate a concise summary with key points, main topics, and estimated reading time.",
  },
  {
    question: "Is my PDF uploaded to a server?",
    answer:
      "The PDF text is extracted in your browser. The extracted text may be sent to our AI provider for analysis, while the original file stays on your device.",
  },
  {
    question: "What types of PDFs work best?",
    answer:
      "Text-based PDFs work best. Scanned documents may not extract text properly. The AI works with documents in any language.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "PDFs up to 50 MB can be uploaded. The AI reads extracted text in consecutive parts; exceptionally long documents may need to be split into smaller PDFs.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. There is no signup and no email required. Upload your PDF and generate a summary.",
  },
];

function AiSummarizerPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFile(incoming[0] ?? null);
    if (run.status !== "idle") run.reset();
    setSummary(null);
  }

  function startOver() {
    setFile(null);
    setSummary(null);
    run.reset();
  }

  const handleSummarize = useCallback(async () => {
    if (!file) return;
    await run.run(async (report) => {
      report(10, "Extracting text from PDF...");
      const text = await extractPdfText(file.file, (percent, label) =>
        report(5 + percent * 0.25, label),
      );
      if (!text.trim()) {
        throw new FriendlyError("Could not extract text from this PDF. It may be a scanned document.");
      }

      const response = await processAiDocument(
        text,
        (chunk) => summarizePrompt(chunk),
        mergeSummaryPrompt,
        report,
      );

      report(90, "Finalizing...");
      // Parse the JSON response
      try {
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned) as AiSummary;
        parsed.readingTime = `${Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)} min read`;
        setSummary(parsed);
      } catch {
        // If JSON parsing fails, create a basic summary from the text
        setSummary({
          summary: response.slice(0, 500),
          keyPoints: [],
          topics: [],
          readingTime: `${Math.ceil(text.split(/\s+/).length / 200)} min read`,
        });
      }

      report(100, "Done!");
      return [];
    });
  }, [file, run]);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    const text = [
      summary.summary,
      "",
      "Key Points:",
      ...summary.keyPoints.map((p) => `• ${p}`),
      "",
      "Topics:",
      ...summary.topics.map((t) => `• ${t}`),
      "",
      `Reading Time: ${summary.readingTime}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [summary]);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {run.status !== "done" && !summary && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            compact={!!file}
            label={file ? "Change PDF" : "Upload PDF to Summarize"}
          />
        )}

        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {file && !summary && run.status !== "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-ink-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>

            {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={handleSummarize}
                onStartOver={startOver}
              />
            )}

            {!busy && run.status !== "error" && (
              <div className="flex flex-wrap gap-2">
                <GenerateButton onClick={handleSummarize}>Summarize with AI</GenerateButton>
                <button
                  type="button"
                  onClick={startOver}
                  className={button("secondary", "lg")}
                >
                  Change File
                </button>
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                {file?.name}
              </p>
              <button
                type="button"
                onClick={startOver}
                className={button("ghost", "sm")}
              >
                Start Over
              </button>
            </div>
            <AiSummaryPanel
              result={summary}
              onRegenerate={handleSummarize}
              onCopy={handleCopy}
              copied={copied}
            />
          </div>
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        The AI Summarizer reads your PDF and creates a concise summary with the
        most important information. It identifies key points, main topics, and
        estimates how long the original document would take to read.
      </p>
      <p>
        This is perfect for quickly understanding long documents, research papers,
        reports, or any PDF where you need the gist without reading every page.
        The PDF text is extracted in the browser and may be sent to our AI
        provider for analysis. The original file stays on your device.
      </p>
      <p>
        For best results, use text-based PDFs rather than scanned documents.
        The AI can handle documents in multiple languages.
      </p>
    </>
  );
}
