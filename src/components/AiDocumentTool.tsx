import { useCallback, useState } from "react";
import { AiChat, type ChatMessage } from "./AiChat";
import { SparkIcon } from "./Icons";
import { ErrorMessage, ProgressBar } from "./ToolFeedback";
import { AiNotice } from "./AiNotice";
import { FileUploader } from "./FileUploader";
import { ToolPanel, ToolShell } from "./ToolShell";
import { button } from "./ui";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile, FriendlyError, makeResult, triggerDownload } from "#/lib/files";
import {
  callGemini,
  chatPrompt,
  documentPrompt,
  extractPdfText,
  parseAiJson,
  type AiDocumentOptions,
  type AiDocumentTask,
} from "#/lib/ai";
import { pageHead } from "#/lib/seo";
import { toolByHref, type ToolHref } from "#/lib/tools";

const LANGUAGES = ["English", "Urdu", "Arabic", "Spanish", "French", "German", "Hindi", "Chinese", "Portuguese", "Turkish"];
const taskByHref: Record<string, AiDocumentTask | "ask"> = {
  "/ai-pdf-translator": "translator",
  "/ai-pdf-rewriter": "rewriter",
  "/ai-ask-pdf": "ask",
  "/ai-pdf-to-presentation": "presentation",
  "/ai-flashcard-generator": "flashcards",
  "/ai-citation-generator": "citations",
  "/ai-grammar-checker": "grammar",
  "/ai-document-analyzer": "analyzer",
  "/ai-resume-analyzer": "resume",
  "/ai-pdf-question-generator": "questions",
};

const faqByTask: Record<AiDocumentTask | "ask", { question: string; answer: string }[]> = {
  translator: [
    { question: "Will the translation keep my formatting?", answer: "Text is extracted from your PDF and translated as plain text, so page layout, columns, and images from the original are not carried over. Copy or download the result and re-apply your layout if you need it." },
    { question: "How accurate is machine translation here?", answer: "Quality depends on how clear the source text is and on the AI provider handling the request. Technical terms, idioms, and long sentences are the most likely to come out wrong, so review the output before using it." },
    { question: "Which languages are supported?", answer: "The language list includes English, Urdu, Arabic, Spanish, French, German, Hindi, Chinese, Portuguese, and Turkish. You can also leave the source set to auto-detect." },
  ],
  rewriter: [
    { question: "Will rewriting change the meaning?", answer: "The tool is asked to keep the original meaning and only adjust style, tone, or length. Because the output is generated, check that no important detail was dropped or altered." },
    { question: "How much text is sent to the AI service?", answer: "Extracted text is truncated to a fixed length before it is sent, so very long documents are analysed in part. Shorten your selection or split the document if you need every sentence rewritten." },
    { question: "Can I get the original text back?", answer: "Yes. The result panel shows the original extracted text alongside the rewritten version so you can compare them line by line." },
  ],
  presentation: [
    { question: "Do I get an actual PowerPoint file?", answer: "No. You get structured slide content — slide titles, bullet points, and speaker notes — as text that you can copy or download. You still need to apply it in your own presentation software." },
    { question: "How many slides will I get?", answer: "The slide count follows the amount of content the AI finds in your document, so a short PDF produces fewer slides than a long one." },
    { question: "Are the slides editable?", answer: "They are plain text. Nothing is formatted automatically, so treat the output as a well-organised outline rather than a finished deck." },
  ],
  flashcards: [
    { question: "How many cards can I create?", answer: "You choose 5, 10, 20, or 50 cards. The tool creates that many cards based on the content found in your PDF." },
    { question: "Can I edit or delete a card?", answer: "Cards can be copied to your clipboard in bulk, but individual cards cannot be edited in the tool. You can regenerate the whole set instead." },
    { question: "Are the cards correct?", answer: "Cards are generated from your document's text and can contain mistakes. Check each answer against the source, especially for dates, numbers, and definitions." },
  ],
  citations: [
    { question: "Which citation styles are supported?", answer: "APA, MLA, Chicago, and Harvard. Pick the style before generating and the output is formatted in that style." },
    { question: "Are the citations real and verifiable?", answer: "Citations are generated from the references found in your document text. Always confirm each source exists and that the details match before submitting the work." },
    { question: "What if my document has no references?", answer: "If no sources can be identified, the tool says so rather than producing invented references." },
  ],
  grammar: [
    { question: "What does the tool check?", answer: "It reviews the extracted text for grammar, spelling, punctuation, and sentence structure, and rewrites unclear sentences." },
    { question: "Does it preserve my tone?", answer: "It aims to keep your meaning and tone while fixing errors, but rewrites are generated and can change emphasis. Read the corrected text before copying it back." },
    { question: "Does it work on scanned PDFs?", answer: "Only if the pages have extractable text. If text cannot be extracted, the tool shows an error rather than guessing at your content." },
  ],
  analyzer: [
    { question: "What does the analysis include?", answer: "The tool produces a structured report covering topics, key themes, tone, structure, and notable details found in your document." },
    { question: "Is this a plagiarism check?", answer: "No. It summarises and describes your own document. It does not compare your text against other sources and cannot detect copied content." },
    { question: "How long can my document be?", answer: "Extracted text is truncated to a fixed length before analysis, so very long documents are only partly covered." },
  ],
  resume: [
    { question: "Does this predict whether I will get a job?", answer: "No. It reviews your resume's content and structure and, if you paste a job description, compares wording and skills. It does not score or predict hiring outcomes." },
    { question: "Should I paste personal details?", answer: "Avoid contact details, identification numbers, and anything sensitive. Only the text you choose to send is processed." },
    { question: "Is my resume uploaded?", answer: "The file stays in your browser. Extracted text is sent to the AI service only when you run the analysis." },
  ],
  questions: [
    { question: "How many questions are generated?", answer: "You choose 5, 10, 20, or 50 questions, plus a difficulty level and question type such as multiple choice, true/false, or short answer." },
    { question: "Are the answers guaranteed correct?", answer: "No. Questions and answers are generated from your document and can be wrong. Check each answer against the original text before using the questions with students." },
    { question: "Can I edit a question?", answer: "Not inside the tool. You can copy the full set as JSON and edit it elsewhere." },
  ],
  ask: [
    { question: "What can this chat do?", answer: "It answers questions about the PDF you loaded. It is instructed to rely only on that document's text and to say so plainly when an answer is not in the file." },
    { question: "Does it use outside knowledge?", answer: "No. If the answer is not in your document, the chat is asked to say that instead of answering from general knowledge." },
    { question: "How much of my document is available to it?", answer: "The extracted text is truncated to a fixed length before the chat starts, so questions about content beyond that point may not be answered." },
  ],
};

const aboutByTask: Record<AiDocumentTask | "ask", string> = {
  translator: "Text is extracted from your PDF in the browser and sent to the AI service to translate into your chosen language. Only the extracted text is transmitted — the original PDF file never leaves your device, and the result comes back as plain text you can copy or download.",
  rewriter: "The text layer of your PDF is extracted locally and rewritten by the AI service according to the style you select. The original PDF is not uploaded, and the tool shows the original text beside the rewrite so you can compare them.",
  presentation: "Slide content is drafted from the text of your PDF and returned as structured titles, bullet points, and speaker notes. This produces an outline you can paste into your own presentation software — it does not create a downloadable slide file.",
  flashcards: "Your PDF's text is used to generate study cards, which you can flip through in the browser and copy in bulk. The original document is not uploaded; only extracted text is sent to generate the cards.",
  citations: "References found in your PDF's text are formatted in the citation style you choose. The original file stays in your browser and only its extracted text is sent, so verify every reference before relying on it.",
  grammar: "The text layer of your PDF is checked by the AI service for grammar, spelling, punctuation, and clarity. The original document remains on your device and only its extracted text is sent for review.",
  analyzer: "Your PDF's text is analysed for topics, structure, and tone, and the findings are returned as a structured report. The original file is never uploaded, and the analysis covers only the extracted text.",
  resume: "The text of your resume is sent to the AI service for a content and structure review, optionally compared against a job description you paste in. The original file stays in your browser and is not uploaded.",
  questions: "Your PDF's text is used to draft practice questions in the format, difficulty, and quantity you choose. The original document is not uploaded, and results are plain text you can copy or download.",
  ask: "The text of your PDF is extracted in your browser and loaded into a chat that answers questions about that document only. The original file is not uploaded, and the chat is instructed to say when an answer is not in the document.",
};

interface AiDocumentToolProps {
  href: ToolHref;
}

interface Flashcard {
  question: string;
  answer: string;
  topic?: string;
}

interface ChatState {
  messages: ChatMessage[];
  question: string;
}

function displayValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-ink-500">Not detected</span>;
  if (Array.isArray(value)) {
    return value.length > 0 ? (
      <ul className="list-disc space-y-1 pl-5">{value.map((item, index) => <li key={index}>{displayValue(item)}</li>)}</ul>
    ) : <span className="text-ink-500">None detected</span>;
  }
  if (typeof value === "object") {
    return <div className="space-y-3">{Object.entries(value as Record<string, unknown>).map(([key, item]) => <div key={key}><dt className="font-semibold capitalize text-ink-800 dark:text-ink-200">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-1 text-ink-600 dark:text-ink-400">{displayValue(item)}</dd></div>)}</div>;
  }
  return String(value);
}

function downloadText(filename: string, text: string) {
  const result = makeResult(text, filename, "text/plain;charset=utf-8");
  triggerDownload(result);
  window.setTimeout(() => URL.revokeObjectURL(result.url), 1000);
}

function ResultView({ task, result, onCopy }: { task: AiDocumentTask; result: Record<string, unknown>; onCopy: () => void }) {
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = Array.isArray(result.cards) ? result.cards as Flashcard[] : [];
  const questions = Array.isArray(result.questions) ? result.questions as Record<string, unknown>[] : [];
  if (task === "flashcards" && cards.length > 0) {
    const card = cards[flashcardIndex];
    return <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-ink-900 dark:text-white">Card {flashcardIndex + 1} of {cards.length}</p><span className="text-xs text-ink-500">{card.topic ?? "Study card"}</span></div>
      <button type="button" onClick={() => setFlipped((current) => !current)} className="min-h-48 w-full rounded-2xl bg-brand-50 p-8 text-left ring-1 ring-brand-200 transition hover:bg-brand-100 dark:bg-brand-600/10 dark:ring-brand-600/30 dark:hover:bg-brand-600/20"><p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{flipped ? "Answer" : "Question"}</p><p className="mt-4 text-xl font-semibold text-ink-900 dark:text-white">{flipped ? card.answer : card.question}</p><p className="mt-6 text-xs text-ink-500">Tap to flip</p></button>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={flashcardIndex === 0} onClick={() => { setFlashcardIndex((current) => current - 1); setFlipped(false); }} className={button("secondary", "sm")}>Previous</button><button type="button" disabled={flashcardIndex === cards.length - 1} onClick={() => { setFlashcardIndex((current) => current + 1); setFlipped(false); }} className={button("secondary", "sm")}>Next</button><button type="button" onClick={onCopy} className={button("ghost", "sm")}>Copy all</button></div>
    </div>;
  }

  if (task === "questions" && questions.length > 0) {
    return <div className="space-y-4">{questions.map((question, index) => <article key={index} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-950/60"><h3 className="font-semibold text-ink-900 dark:text-white">{index + 1}. {String(question.question ?? "Question")}</h3><div className="mt-3 text-sm text-ink-600 dark:text-ink-400">{displayValue(question.options)}</div><details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-brand-700 dark:text-brand-300">Show answer and explanation</summary><p className="mt-2 text-ink-700 dark:text-ink-300"><strong>Answer:</strong> {String(question.answer ?? "Not detected")}</p><p className="mt-1 text-ink-600 dark:text-ink-400">{String(question.explanation ?? "")}</p></details></article>)}</div>;
  }

  return <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(result).map(([key, value]) => <div key={key} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-950/60"><dt className="text-sm font-semibold capitalize text-ink-900 dark:text-white">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-2 max-h-96 overflow-auto text-sm leading-relaxed">{displayValue(value)}</dd></div>)}</dl>;
}

function Options({ task, options, setOptions }: { task: AiDocumentTask | "ask"; options: AiDocumentOptions; setOptions: (next: AiDocumentOptions) => void }) {
  if (task === "translator") return <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Source language<select value={options.sourceLanguage} onChange={(event) => setOptions({ ...options, sourceLanguage: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700"><option>Auto-detect</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label><label className="text-sm font-semibold">Target language<select value={options.targetLanguage} onChange={(event) => setOptions({ ...options, targetLanguage: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label></div>;
  if (task === "rewriter") return <label className="text-sm font-semibold">Rewrite style<select value={options.rewriteMode} onChange={(event) => setOptions({ ...options, rewriteMode: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{["Rewrite professionally", "Simplify", "Make concise", "Expand", "Improve clarity", "Change tone"].map((mode) => <option key={mode}>{mode}</option>)}</select></label>;
  if (task === "flashcards") return <label className="text-sm font-semibold">Number of cards<select value={options.cardCount} onChange={(event) => setOptions({ ...options, cardCount: Number(event.target.value) })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{[5, 10, 20, 50].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>;
  if (task === "citations") return <label className="text-sm font-semibold">Citation style<select value={options.citationStyle} onChange={(event) => setOptions({ ...options, citationStyle: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{["APA", "MLA", "Chicago", "Harvard"].map((style) => <option key={style}>{style}</option>)}</select></label>;
  if (task === "questions") return <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Questions<select value={options.questionCount} onChange={(event) => setOptions({ ...options, questionCount: Number(event.target.value) })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{[5, 10, 20, 50].map((count) => <option key={count} value={count}>{count}</option>)}</select></label><label className="text-sm font-semibold">Difficulty<select value={options.difficulty} onChange={(event) => setOptions({ ...options, difficulty: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{["Easy", "Medium", "Hard"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="text-sm font-semibold">Type<select value={options.questionType} onChange={(event) => setOptions({ ...options, questionType: event.target.value })} className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700">{["Multiple choice", "True/False", "Short answer"].map((type) => <option key={type}>{type}</option>)}</select></label></div>;
  if (task === "resume") return <label className="text-sm font-semibold">Optional job description<span className="mt-1 block text-xs font-normal text-ink-500">Use this to compare content and keywords. It does not predict hiring outcomes.</span><textarea value={options.jobDescription ?? ""} onChange={(event) => setOptions({ ...options, jobDescription: event.target.value })} rows={5} placeholder="Paste a job description..." className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 font-normal ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700" /></label>;
  return null;
}

export function AiDocumentToolPage({ href }: AiDocumentToolProps) {
  const tool = toolByHref(href);
  const task = taskByHref[href];
  const run = useToolRun(tool.name);
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [options, setOptions] = useState<AiDocumentOptions>({ sourceLanguage: "Auto-detect", targetLanguage: "English", rewriteMode: "Improve clarity", cardCount: 10, citationStyle: "APA", questionCount: 10, difficulty: "Medium", questionType: "Multiple choice" });
  const [chat, setChat] = useState<ChatState>({ messages: [], question: "" });
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const busy = run.status === "working";

  const reset = useCallback(() => { setFile(null); setPdfText(""); setResult(null); setChat({ messages: [], question: "" }); setChatError(null); setIsSending(false); run.reset(); }, [run]);
  const add = useCallback((incoming: AcceptedFile[]) => { setFile(incoming[0] ?? null); setPdfText(""); setResult(null); setChat({ messages: [], question: "" }); setChatError(null); if (run.status !== "idle") run.reset(); }, [run]);

  const generate = useCallback(async () => {
    if (!file || task === "ask") return;
    await run.run(async (report) => {
      report(15, "Extracting text from PDF...");
      const text = await extractPdfText(file.file);
      if (!text.trim()) throw new FriendlyError("Could not extract text from this PDF. It may be scanned or image-only.");
      report(45, "Preparing your document analysis...");
      const response = await callGemini(documentPrompt(task, text, options));
      report(85, "Formatting the result...");
      try {
        const parsed = parseAiJson<Record<string, unknown>>(response);
        setResult(task === "rewriter" || task === "grammar" ? { originalText: text, ...parsed } : parsed);
      } catch {
        setResult(task === "rewriter" || task === "grammar" ? { originalText: text, result: response } : { result: response });
      }
      report(100, "Ready");
      return [];
    });
  }, [file, options, run, task]);

  const loadForChat = useCallback(async () => {
    if (!file || task !== "ask") return;
    await run.run(async (report) => { report(20, "Extracting text from PDF..."); const text = await extractPdfText(file.file); if (!text.trim()) throw new FriendlyError("Could not extract text from this PDF. It may be scanned or image-only."); setPdfText(text); report(100, "Ready to chat"); return []; });
  }, [file, run, task]);

  const ask = useCallback(async (question: string, addMessage = true) => {
    if (!pdfText || isSending || !question.trim()) return;
    if (addMessage) setChat((current) => ({ ...current, messages: [...current.messages, { role: "user", content: question, timestamp: Date.now() }] }));
    setChatError(null); setIsSending(true);
    try {
      const history = chat.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
      const response = await callGemini(`${chatPrompt(pdfText, question)}\n\nConversation so far:\n${history}\n\nDo not use outside knowledge. If the answer is not in the PDF, say that clearly.`);
      setChat((current) => ({ ...current, messages: [...current.messages, { role: "assistant", content: response, timestamp: Date.now() }] }));
    } catch (error) { setChatError(error instanceof Error ? error.message : "The AI could not answer. Please try again."); } finally { setIsSending(false); }
  }, [chat.messages, isSending, pdfText]);

  const copyResult = useCallback(() => { if (result) void navigator.clipboard.writeText(JSON.stringify(result, null, 2)); }, [result]);
  const isAsk = task === "ask";
  const showingResult = isAsk ? Boolean(pdfText) : Boolean(result);

  return <ToolShell tool={tool} faq={faqByTask[task]} about={<p>{aboutByTask[task]}</p>}>
    <ToolPanel>
      {!file && <FileUploader kind="pdf" toolName={tool.name} onFiles={add} onRejected={run.fail} label={`Upload PDF to ${tool.name.replace("AI ", "")}`} />}
      {run.status === "error" && !file && run.error && <ErrorMessage message={run.error} />}
      {file && !showingResult && <div className="space-y-5">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{file.name}</p><p className="text-xs text-ink-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p></div><button type="button" onClick={reset} className={button("ghost", "sm")}>Change file</button></div>
        {!isAsk && <Options task={task} options={options} setOptions={setOptions} />}
        {busy && <ProgressBar progress={run.progress} />}
        {run.status === "error" && run.error && <ErrorMessage message={run.error} onRetry={isAsk ? loadForChat : generate} onStartOver={reset} />}
        {!busy && run.status !== "error" && <button type="button" onClick={isAsk ? loadForChat : generate} className={button("primary", "lg", "gap-2.5")}><SparkIcon />{isAsk ? "Prepare document chat" : "Generate with AI"}</button>}
      </div>}
      {showingResult && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-ink-900 dark:text-white">{tool.name}: {file?.name}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={reset} className={button("secondary", "sm")}>Start over</button>{!isAsk && result && <><button type="button" onClick={copyResult} className={button("ghost", "sm")}>Copy</button><button type="button" onClick={() => downloadText(`${file?.name.replace(/\.pdf$/i, "") ?? "ai-result"}-${tool.name.toLowerCase().replaceAll(" ", "-")}.txt`, JSON.stringify(result, null, 2))} className={button("primary", "sm")}>Download</button></>}</div></div>
        {isAsk ? <AiChat onSend={ask} messages={chat.messages} isLoading={isSending} suggestedQuestions={chat.messages.length === 0 ? ["What is this document about?", "What are the key points?", "What important dates are mentioned?"] : undefined} error={chatError} onRetry={chat.messages.at(-1)?.role === "user" ? () => ask(chat.messages.at(-1)?.content ?? "", false) : undefined} /> : result && <ResultView task={task} result={result} onCopy={copyResult} />}
        <AiNotice />
      </div>}
    </ToolPanel>
  </ToolShell>;
}

export function aiDocumentHead(href: ToolHref) {
  const tool = toolByHref(href);
  return pageHead({ title: tool.title, description: tool.description, path: tool.href });
}
