import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileUploader } from "#/components/FileUploader";
import { ProgressBar, ErrorMessage } from "#/components/ToolFeedback";
import { ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { ChatIcon } from "#/components/Icons";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile, FriendlyError } from "#/lib/files";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";
import {
  extractPdfText,
  callGemini,
  chatPrompt,
  mergeChatPrompt,
  processAiDocument,
  type AiAttachment,
} from "#/lib/ai";
import { AiChat, type ChatMessage } from "#/components/AiChat";

const tool = toolByHref("/ai-chat");

export const Route = createFileRoute("/ai-chat")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: AiChatPage,
});

const FAQ = [
  {
    question: "How does AI Chat work?",
    answer:
      "Upload a PDF and ask any question about its content. The AI reads the document and provides answers based on what's in the PDF.",
  },
  {
    question: "Can I ask follow-up questions?",
    answer:
      "Yes! You can have a conversation about the PDF. Ask as many questions as you need to understand the content.",
  },
  {
    question: "Is my PDF uploaded?",
    answer:
      "The PDF text is extracted in your browser. Extracted text may be sent to the AI provider for answering your questions, while the original file stays on your device.",
  },
  {
    question: "What languages are supported?",
    answer:
      "The AI can understand and answer questions about PDFs in most languages, and can respond in English.",
  },
];

const SUGGESTED_QUESTIONS = [
  "What is this document about?",
  "What are the main conclusions?",
  "Can you explain the key concepts?",
  "What are the important dates or numbers?",
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("The image could not be read.")));
    reader.readAsDataURL(file);
  });
}

function AiChatPage() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pdfText, setPdfText] = useState("");
  const [imageAttachment, setImageAttachment] = useState<AiAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFile(incoming[0] ?? null);
    setMessages([]);
    setPdfText("");
    setImageAttachment(null);
    setIsSending(false);
    setChatError(null);
    setLastQuestion(null);
    if (run.status !== "idle") run.reset();
  }

  function startOver() {
    setFile(null);
    setMessages([]);
    setPdfText("");
    setImageAttachment(null);
    setIsSending(false);
    setChatError(null);
    setLastQuestion(null);
    run.reset();
  }

  const handleLoadPdf = useCallback(async () => {
    if (!file) return;
    await run.run(async (report) => {
      report(20, "Loading PDF...");
      if (file.file.type.startsWith("image/")) {
        const dataUrl = await readFileAsDataUrl(file.file);
        setImageAttachment({
          mimeType: file.file.type,
          data: dataUrl.split(",")[1] ?? "",
        });
        setPdfText("Image attachment ready.");
      } else {
        const text = await extractPdfText(file.file, (percent, label) =>
          report(5 + percent * 0.25, label),
        );
        if (!text.trim()) {
          throw new FriendlyError("Could not extract text from this PDF. It may be a scanned document.");
        }
        setPdfText(text);
      }
      report(100, "Ready!");
      return [];
    });
  }, [file, run]);

  const handleSend = useCallback(
    async (question: string, addUserMessage = true) => {
      if (!pdfText || isSending) return;

      if (addUserMessage) {
        const userMsg: ChatMessage = {
          role: "user",
          content: question,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }
      setChatError(null);
      setLastQuestion(question);
      setIsSending(true);

      try {
        const history = messages
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n");
        const response = imageAttachment
          ? await callGemini(
              `You are a helpful AI assistant. Answer the user's question about the uploaded image clearly and concisely. User question: ${question}`,
              imageAttachment,
            )
          : await processAiDocument(
              pdfText,
              (chunk) => chatPrompt(chunk, question),
              (parts) => mergeChatPrompt(parts, question, history),
            );

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error) {
        setChatError(
          error instanceof Error
            ? error.message
            : "Sorry, the AI could not process that question. Please try again.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [imageAttachment, isSending, messages, pdfText],
  );

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {!file && (
          <FileUploader
            kind="document"
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            label="Upload PDF or image to Chat"
          />
        )}

        {run.status === "error" && !file && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {file && !pdfText && (
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
                onRetry={handleLoadPdf}
                onStartOver={startOver}
              />
            )}

            {!busy && run.status !== "error" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLoadPdf}
                  className={button("primary", "lg")}
                >
                  <ChatIcon className="h-4 w-4" />
                  Start Chatting
                </button>
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

        {pdfText && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                <ChatIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                Chat with: {file?.name}
              </p>
              <button
                type="button"
                onClick={startOver}
                className={button("ghost", "sm")}
              >
                Start Over
              </button>
            </div>
            <AiChat
              onSend={handleSend}
              messages={messages}
              isLoading={isSending}
              suggestedQuestions={messages.length === 0 ? SUGGESTED_QUESTIONS : undefined}
              error={chatError}
              onRetry={lastQuestion ? () => handleSend(lastQuestion, false) : undefined}
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
        AI Chat lets you have a conversation with your PDF. Upload any document
        and ask questions about its content — the AI will answer based on what's
        in the file.
      </p>
      <p>
        This is great for understanding complex documents, finding specific
        information quickly, or getting explanations of technical content. You can
        ask follow-up questions to dive deeper into any topic.
      </p>
      <p>
        The PDF text is extracted in your browser and may be sent to our AI
        provider for analysis. The original file stays on your device.
      </p>
    </>
  );
}
