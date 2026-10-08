import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileUploader } from "#/components/FileUploader";
import { ProgressBar, ErrorMessage } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { BrainIcon } from "#/components/Icons";
import { GenerateButton } from "#/components/GenerateButton";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile, FriendlyError } from "#/lib/files";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";
import { extractPdfText, mergeQuizPrompt, processAiDocument, quizPrompt } from "#/lib/ai";
import { AiQuizPanel, type QuizQuestion } from "#/components/AiQuizPanel";

const tool = toolByHref("/ai-quiz");

export const Route = createFileRoute("/ai-quiz")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: AiQuizPage,
});

const FAQ = [
  {
    question: "How does the quiz generator work?",
    answer:
      "Upload a PDF and the AI will analyze the content to create multiple choice, true/false, and short answer questions based on the material.",
  },
  {
    question: "How many questions are generated?",
    answer:
      "Typically 8-10 questions with a mix of multiple choice, true/false, and short answer formats to test different aspects of the content.",
  },
  {
    question: "Can I retake the quiz?",
    answer:
      "Yes! You can reset your answers and try again, or generate an entirely new set of questions from the same PDF.",
  },
  {
    question: "Is this good for studying?",
    answer:
      "Absolutely! It's perfect for self-testing on lecture notes, textbooks, research papers, or any study material in PDF format.",
  },
];

function AiQuizPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFile(incoming[0] ?? null);
    setQuestions(null);
    if (run.status !== "idle") run.reset();
  }

  function startOver() {
    setFile(null);
    setQuestions(null);
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
        (chunk) => quizPrompt(chunk),
        mergeQuizPrompt,
        report,
      );

      report(90, "Finalizing...");
      try {
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned) as { questions: QuizQuestion[] };
        setQuestions(parsed.questions);
      } catch {
        throw new FriendlyError("Could not generate quiz. Please try again.");
      }

      report(100, "Done!");
      return [];
    });
  }, [file, run]);

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="pdf"
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            label="Upload PDF for Quiz"
          />
        )}

        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {file && !questions && (
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
                <GenerateButton onClick={handleGenerate}>Generate Quiz</GenerateButton>
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

        {questions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                <BrainIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                Quiz: {file?.name}
              </p>
              <button
                type="button"
                onClick={startOver}
                className={button("ghost", "sm")}
              >
                Start Over
              </button>
            </div>
            <AiQuizPanel questions={questions} onRegenerate={handleGenerate} />
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
        The AI Quiz Generator creates study questions from any PDF document.
        Upload your lecture notes, textbook chapters, or research papers and get
        instant quiz questions to test your understanding.
      </p>
      <p>
        Questions come in three formats: multiple choice for testing recognition,
        true/false for testing comprehension, and short answer for testing
        recall. Each question includes an explanation to help you learn.
      </p>
      <p>
        This is perfect for students, educators, and anyone who wants to actively
        engage with their reading material instead of just passively reading it.
      </p>
    </>
  );
}
