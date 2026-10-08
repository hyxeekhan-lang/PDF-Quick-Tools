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
import { extractPdfText, mergeNotesPrompt, notesPrompt, processAiDocument } from "#/lib/ai";
import { AiNotesPanel, type AiNotes } from "#/components/AiNotesPanel";

const tool = toolByHref("/ai-notes");

export const Route = createFileRoute("/ai-notes")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: AiNotesPage,
});

const FAQ = [
  {
    question: "How does the notes generator work?",
    answer:
      "Upload a PDF and the AI will extract the content, identify key topics, and create well-organized study notes with headings, bullet points, and summaries.",
  },
  {
    question: "What format are the notes in?",
    answer:
      "Notes are organized with a title, overview, collapsible sections with key points, and a concluding summary. You can copy them as plain text.",
  },
  {
    question: "Can I customize the notes?",
    answer:
      "You can regenerate the notes to get a different format or focus. The AI will create a fresh set of notes each time.",
  },
  {
    question: "What types of PDFs work best?",
    answer:
      "Text-based PDFs like lecture notes, textbooks, research papers, and reports work best. Scanned documents may not extract text properly.",
  },
];

function AiNotesPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [notes, setNotes] = useState<AiNotes | null>(null);
  const [copied, setCopied] = useState(false);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFile(incoming[0] ?? null);
    setNotes(null);
    if (run.status !== "idle") run.reset();
  }

  function startOver() {
    setFile(null);
    setNotes(null);
    run.reset();
  }

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    await run.run(async (report) => {
      report(10, "Extracting text...");
      const text = await extractPdfText(file.file);
      if (!text.trim()) {
        throw new FriendlyError("Could not extract text from this PDF. It may be a scanned document.");
      }

      const response = await processAiDocument(
        text,
        (chunk) => notesPrompt(chunk),
        mergeNotesPrompt,
        report,
      );

      report(90, "Finalizing...");
      try {
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned) as AiNotes;
        setNotes(parsed);
      } catch {
        throw new FriendlyError("Could not generate notes. Please try again.");
      }

      report(100, "Done!");
      return [];
    });
  }, [file, run]);

  const handleCopy = useCallback(() => {
    if (!notes) return;
    const lines = [
      `# ${notes.title}`,
      "",
      notes.overview,
      "",
      "---",
      "",
    ];
    for (const section of notes.sections) {
      lines.push(`## ${section.heading}`, "");
      for (const point of section.points) {
        lines.push(`• ${point}`);
      }
      if (section.details) {
        lines.push("", section.details);
      }
      lines.push("");
    }
    lines.push("---", "", "Summary:", notes.summary);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [notes]);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            label="Upload PDF for Notes"
          />
        )}

        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {file && !notes && (
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

            {busy && <ProgressBar progress={run.progress} />}

            {run.status === "error" && run.error && (
              <ErrorMessage
                message={run.error}
                onRetry={handleGenerate}
                onStartOver={startOver}
              />
            )}

            {!busy && run.status !== "error" && (
              <div className="flex flex-wrap gap-2">
                <GenerateButton onClick={handleGenerate}>Generate Notes</GenerateButton>
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

        {notes && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                Notes: {file?.name}
              </p>
              <button
                type="button"
                onClick={startOver}
                className={button("ghost", "sm")}
              >
                Start Over
              </button>
            </div>
            <AiNotesPanel
              result={notes}
              onRegenerate={handleGenerate}
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
        The AI Notes Generator transforms your PDF into well-structured study
        notes. Upload any document and get organized notes with clear headings,
        key points, and a helpful summary.
      </p>
      <p>
        Notes are organized into collapsible sections, making it easy to focus on
        specific topics. Each section includes bullet points for quick review and
        additional details for deeper understanding.
      </p>
      <p>
        This is perfect for students reviewing lecture notes, professionals
        summarizing reports, or anyone who wants to create organized notes from
        lengthy documents.
      </p>
    </>
  );
}
