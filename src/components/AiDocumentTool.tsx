import { useCallback, useState } from "react";
import { AiChat, type ChatMessage } from "./AiChat";
import { SparkIcon } from "./Icons";
import { ErrorMessage, ProgressBar } from "./ToolFeedback";
import { AiNotice } from "./AiNotice";
import { AiFlashcardPanel, type Flashcard } from "./AiFlashcardPanel";
import { FileUploader } from "./FileUploader";
import { ToolPanel, ToolShell } from "./ToolShell";
import { button } from "./ui";
import { useToolRun } from "#/hooks/useToolRun";
import { type AcceptedFile, FriendlyError, makeResult, triggerDownload } from "#/lib/files";
import {
  chatPrompt,
  documentPrompt,
  extractPdfText,
  mergeAiDocumentPrompt,
  parseAiJson,
  processAiDocument,
  type AiDocumentOptions,
  type AiDocumentTask,
} from "#/lib/ai";
import {
  buildTranslatedPdf,
  directionFor,
  isRtl,
  supportsPdfExport,
  TRANSLATION_LANGUAGES,
} from "#/lib/translate";
import { pageHead } from "#/lib/seo";
import { toolByHref, type ToolHref } from "#/lib/tools";

/**
 * Shared with the translation lib so the list offered, the direction applied
 * and the PDF export decision can never disagree about what a language is.
 */
const LANGUAGES: readonly string[] = TRANSLATION_LANGUAGES;
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
    { question: "Will the translation keep my formatting?", answer: "The original layout is not carried over. What comes back is the translated text with its own paragraphs, laid out right-to-left when the target language needs it. You can copy it, and for languages whose script the embedded fonts can render you can also download it as a PDF." },
    { question: "How accurate is machine translation here?", answer: "Quality depends on how clear the source text is and on the AI provider handling the request. Technical terms, idioms, and long sentences are the most likely to come out wrong, so review the output before using it." },
    { question: "Which languages are supported?", answer: "Seventeen: English, Urdu, Arabic, Persian, Hebrew, Hindi, Spanish, French, German, Italian, Portuguese, Turkish, Chinese, Japanese, Korean, Russian, and Indonesian. You can also leave the source set to auto-detect." },
    { question: "Why is there no PDF download when I translate to Urdu or Arabic?", answer: "Because a PDF file stores individual glyphs but does not contain the engine that joins and reorders them. Writing Urdu this way gives you correctly spelled letters in the wrong order — a file that opens fine and reads as nonsense. So there is no PDF button for right-to-left languages, and the text is laid out right-to-left on screen so you can read and copy it correctly. For Chinese, Japanese, Korean, Russian and Hindi the reason is different but the outcome is the same: the fonts available here do not carry those glyphs. Both cases offer Copy instead, and pasting into Word or Google Docs gives you a properly typeset result." },
    { question: "Will it translate a scanned document?", answer: "No. Translation reads the text layer of your PDF, and a scan has none. Run it through OCR PDF first and translate the result — that step is what makes the difference between a real translation and a confident guess. The tool says this on the upload screen rather than letting you spend a translation on an empty document." },
    { question: "Is the translation any good?", answer: "It is a machine translation from a language model, and it is wrong sometimes in ways that matter — technical terms, idioms, names, and numbers are where it fails most often. Read it before you rely on it, and never paste it into anything legal, medical, or official without a second pair of eyes on the terms that matter." },
  ],
  rewriter: [
    { question: "Will rewriting change the meaning?", answer: "The tool is asked to keep the original meaning and only adjust style, tone, or length. Because the output is generated, check that no important detail was dropped or altered." },
    { question: "How much text is sent to the AI service?", answer: "The extracted text is processed in consecutive parts so long PDFs can be analyzed beyond the first pages. Very long documents may need to be split into smaller PDFs." },
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
    { question: "How long can my document be?", answer: "The AI analyzes the extracted text in consecutive parts, rather than stopping after the first section. Extremely long documents may need to be split into smaller PDFs." },
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
    { question: "How much of my document is available to it?", answer: "The AI reads the extracted text in consecutive parts, so it can answer questions about content throughout a long PDF. Extremely long documents may need to be split into smaller PDFs." },
  ],
};

const aboutByTask: Record<AiDocumentTask | "ask", string> = {
  translator: "Text is extracted from your PDF in the browser and sent to the AI service to translate into your chosen language. Only the extracted text is transmitted — the original PDF file never leaves your device. The result comes back as text laid out in the correct direction for the target script, which you can copy, and as a downloadable PDF for the languages whose glyphs can be rendered correctly.",
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

interface ChatState {
  messages: ChatMessage[];
  question: string;
}

function mergeFullTextResults(task: "translator" | "rewriter", parts: string[]): string {
  const results = parts.map((part) => parseAiJson<Record<string, unknown>>(part));
  if (task === "translator") {
    return JSON.stringify({
      sourceLanguage: results.find((part) => part.sourceLanguage)?.sourceLanguage ?? "Not detected",
      targetLanguage: results.find((part) => part.targetLanguage)?.targetLanguage ?? "Not detected",
      translatedText: results.map((part) => String(part.translatedText ?? "")).filter(Boolean).join("\n\n"),
    });
  }
  return JSON.stringify({
    mode: results.find((part) => part.mode)?.mode ?? "Rewrite",
    rewrittenText: results.map((part) => String(part.rewrittenText ?? "")).filter(Boolean).join("\n\n"),
    notes: results.map((part) => String(part.notes ?? "")).filter(Boolean).join("\n"),
  });
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

function ResultView({ task, result, onCopy, onRegenerate, copied, onDownloadPdf }: { task: AiDocumentTask; result: Record<string, unknown>; onCopy: () => void; onRegenerate: () => void; copied?: boolean; onDownloadPdf?: () => void }) {
  const cards = Array.isArray(result.cards) ? result.cards as Flashcard[] : [];
  const questions = Array.isArray(result.questions) ? result.questions as Record<string, unknown>[] : [];
  if (task === "flashcards" && cards.length > 0) {
    // Shared with Study Mode rather than a second copy that can drift.
    return (
      <AiFlashcardPanel
        cards={cards}
        onRegenerate={onRegenerate}
        onCopy={onCopy}
        copied={copied}
      />
    );
  }

  if (task === "questions" && questions.length > 0) {
    return <div className="space-y-4">{questions.map((question, index) => <article key={index} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-950/60"><h3 className="font-semibold text-ink-900 dark:text-white">{index + 1}. {String(question.question ?? "Question")}</h3><div className="mt-3 text-sm text-ink-600 dark:text-ink-400">{displayValue(question.options)}</div><details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-brand-700 dark:text-brand-300">Show answer and explanation</summary><p className="mt-2 text-ink-700 dark:text-ink-300"><strong>Answer:</strong> {String(question.answer ?? "Not detected")}</p><p className="mt-1 text-ink-600 dark:text-ink-400">{String(question.explanation ?? "")}</p></details></article>)}</div>;
  }

  if (task === "translator") {
    const target = String(result.targetLanguage ?? "English");
    const translated = String(result.translatedText ?? "");
    // Paragraphs rather than one blob, because the model's own paragraph breaks
    // are the only structure the translated text still carries — and in a
    // right-to-left script the direction attribute is what stops the browser
    // rendering correct words with the punctuation on the wrong side.
    return <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-ink-100 px-2.5 py-1 font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          From: {String(result.sourceLanguage ?? "Not detected")}
        </span>
        <span className="rounded-lg bg-ink-100 px-2.5 py-1 font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          To: {target}
        </span>
      </div>
      <div
        dir={directionFor(target)}
        lang={target}
        className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-ink-50 p-4 text-[15px] leading-loose text-ink-800 dark:bg-ink-950/60 dark:text-ink-200"
      >
        {translated || "No translated text was returned."}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onCopy} className={button("secondary", "sm")}>Copy text</button>
        {supportsPdfExport(target) && onDownloadPdf ? (
          <button type="button" onClick={onDownloadPdf} className={button("primary", "sm")}>Download as PDF</button>
        ) : (
          <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {isRtl(target)
              ? `No PDF download for ${target}: a PDF font cannot join and reorder right-to-left letters, so the file would be unreadable. Copy the text instead.`
              : `No PDF download for ${target} — the fonts available here do not carry that script. Copy the text instead.`}
          </p>
        )}
      </div>
      {isRtl(target) && (
        <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          Copy this into a word processor rather than a plain text editor if the
          letter spacing looks wrong — some editors do not apply the direction
          that was set here.
        </p>
      )}
    </div>;
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
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const busy = run.status === "working";

  const reset = useCallback(() => { setFile(null); setPdfText(""); setResult(null); setChat({ messages: [], question: "" }); setChatError(null); setIsSending(false); run.reset(); }, [run]);
  const add = useCallback((incoming: AcceptedFile[]) => { setFile(incoming[0] ?? null); setPdfText(""); setResult(null); setChat({ messages: [], question: "" }); setChatError(null); if (run.status !== "idle") run.reset(); }, [run]);

  const generate = useCallback(async () => {
    if (!file || task === "ask") return;
    await run.run(async (report) => {
      report(15, "Extracting text from PDF...");
      const text = await extractPdfText(file.file);
      if (!text.trim()) throw new FriendlyError("Could not extract text from this PDF. It may be scanned or image-only.");
      const response = await processAiDocument(
        text,
        (chunk, _index, total) => {
          const requestedCount =
            task === "flashcards"
              ? options.cardCount
              : task === "questions"
                ? options.questionCount
                : undefined;
          const chunkOptions =
            requestedCount === undefined
              ? options
              : {
                  ...options,
                  ...(task === "flashcards"
                    ? { cardCount: Math.max(1, Math.ceil(requestedCount / total)) }
                    : { questionCount: Math.max(1, Math.ceil(requestedCount / total)) }),
                };
          return documentPrompt(task, chunk, chunkOptions);
        },
        (parts) => mergeAiDocumentPrompt(task, parts, options),
        report,
        task === "translator" || task === "rewriter"
          ? (parts) => mergeFullTextResults(task, parts)
          : undefined,
      );
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
      const response = await processAiDocument(
        pdfText,
        (chunk) => `${chatPrompt(chunk, question)}\n\nConversation so far:\n${history}\n\nDo not use outside knowledge. If the answer is not in the PDF, say that clearly.`,
        (parts) => `Answer the user's question using only these answers from consecutive sections of the PDF. Combine relevant evidence, avoid repetition, and say clearly if the answer is not in the document. Do not use outside knowledge.\n\nQuestion: ${question}\nConversation so far:\n${history || "(No earlier messages.)"}\n\nPartial answers:\n${JSON.stringify(parts)}\n\nGive one clear, concise answer.`,
      );
      setChat((current) => ({ ...current, messages: [...current.messages, { role: "assistant", content: response, timestamp: Date.now() }] }));
    } catch (error) { setChatError(error instanceof Error ? error.message : "The AI could not answer. Please try again."); } finally { setIsSending(false); }
  }, [chat.messages, isSending, pdfText]);

  /**
   * Builds the downloadable PDF for a translation, and says why it cannot when
   * it cannot. The refusal is a message the visitor sees, not a silent no-op.
   */
  const downloadTranslatedPdf = useCallback(async () => {
    if (!result || task !== "translator" || !file) return;
    setPdfNote(null);
    await run.run(async (report) => {
      const outcome = await buildTranslatedPdf(
        String(result.translatedText ?? ""),
        String(result.targetLanguage ?? "English"),
        file.name,
        report,
      );
      if ("unsupported" in outcome) {
        setPdfNote(outcome.reason);
        return [];
      }
      triggerDownload(outcome.result);
      window.setTimeout(() => URL.revokeObjectURL(outcome.result.url), 1000);
      return [outcome.result];
    });
  }, [result, task, file, run]);

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
        {task === "translator" && (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-600 ring-1 ring-ink-200 dark:bg-ink-950/60 dark:text-ink-400 dark:ring-ink-700">
            Translation works from the text layer of your PDF. A scanned document
            has no text layer, so it would come back empty or badly wrong — run{" "}
            <a href="/ocr-pdf" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">
              OCR PDF
            </a>{" "}
            first, then translate the result. Scanned pages cannot be translated
            directly, and we would rather say that than return a confident
            translation of nothing.
          </p>
        )}
        {busy && <ProgressBar progress={run.progress} onCancel={run.cancel} />}
        {run.status === "error" && run.error && <ErrorMessage message={run.error} onRetry={isAsk ? loadForChat : generate} onStartOver={reset} />}
        {!busy && run.status !== "error" && <button type="button" onClick={isAsk ? loadForChat : generate} className={button("primary", "lg", "gap-2.5")}><SparkIcon />{isAsk ? "Prepare document chat" : "Generate with AI"}</button>}
      </div>}
      {showingResult && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-ink-900 dark:text-white">{tool.name}: {file?.name}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={reset} className={button("secondary", "sm")}>Start over</button>{!isAsk && result && <><button type="button" onClick={copyResult} className={button("ghost", "sm")}>Copy</button><button type="button" onClick={() => downloadText(`${file?.name.replace(/\.pdf$/i, "") ?? "ai-result"}-${tool.name.toLowerCase().replaceAll(" ", "-")}.txt`, JSON.stringify(result, null, 2))} className={button("primary", "sm")}>Download</button></>}</div></div>
        {pdfNote && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/60">{pdfNote}</p>}
        {isAsk ? <AiChat onSend={ask} messages={chat.messages} isLoading={isSending} suggestedQuestions={chat.messages.length === 0 ? ["What is this document about?", "What are the key points?", "What important dates are mentioned?"] : undefined} error={chatError} onRetry={chat.messages.at(-1)?.role === "user" ? () => ask(chat.messages.at(-1)?.content ?? "", false) : undefined} /> : result && <ResultView task={task} result={result} onCopy={copyResult} onRegenerate={generate} onDownloadPdf={task === "translator" ? downloadTranslatedPdf : undefined} />}
        <AiNotice />
      </div>}
    </ToolPanel>
  </ToolShell>;
}

export function aiDocumentHead(href: ToolHref) {
  const tool = toolByHref(href);
  return pageHead({ title: tool.title, description: tool.description, path: tool.href });
}
