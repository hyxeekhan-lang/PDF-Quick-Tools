import { loadPdfJs } from "./pdf";
import { FriendlyError } from "./files";

/**
 * Extract text content from a PDF file using pdfjs-dist.
 * Returns the full text content of all pages.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  // Every exit from this function has to release the document: pdf.js keeps a
  // worker alive behind it and holds the whole ArrayBuffer, and every AI tool
  // calls this. Without this, a handful of runs on a large PDF is enough for
  // the browser to start killing the tab.
  try {
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item) => "str" in item)
          .map((item) => (item as { str: string }).str)
          .join(" ");
        if (pageText.trim()) {
          textParts.push(`[Page ${i}]\n${pageText.trim()}`);
        }
      } finally {
        page.cleanup();
      }
    }

    if (textParts.length > 0) {
      return textParts.join("\n\n");
    }

    const maxOcrPages = Math.min(pdf.numPages, 4);
    for (let i = 1; i <= maxOcrPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        page.cleanup();
        continue;
      }

      try {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const imageData = dataUrl.split(",")[1] ?? "";
        const response = await callGemini(
          "Extract all visible text from this scanned page. Preserve headings, paragraphs, and lists. If no text is visible, return exactly: NO_TEXT",
          { mimeType: "image/jpeg", data: imageData },
        );

        const cleaned = response.replace(/\s*NO_TEXT\s*/i, "").trim();
        if (cleaned) {
          textParts.push(`[Page ${i}]\n${cleaned}`);
        }
      } finally {
        // A canvas this size is tens of megabytes; dropping its dimensions is
        // what actually hands that memory back.
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }

    return textParts.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Truncate text to fit within token limits.
 * Rough estimate: 1 token ≈ 4 characters.
 */
export function truncateForTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Content truncated...]";
}

/**
 * Call Gemini through the same-origin Vercel Function. The browser never sees
 * the API credential; it only sends the prompt assembled for the chosen tool.
 */
export interface AiAttachment {
  mimeType: string;
  data: string;
}

export async function callGemini(
  prompt: string,
  attachment?: AiAttachment,
): Promise<string> {
  const response = await fetch("/api/ask-gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, attachment }),
  });
  const payload = (await response.json().catch(() => null)) as {
    text?: unknown;
    error?: unknown;
  } | null;

  if (!response.ok || typeof payload?.text !== "string") {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "The AI service is unavailable. Please try again.",
    );
  }
  return payload.text;
}

const AI_DOCUMENT_CHUNK_CHARS = 12_000;
const MAX_AI_DOCUMENT_CHUNKS = 14;
const MAX_AI_MERGE_PROMPT_CHARS = 33_000;
const MAX_AI_PROMPT_CHARS = 36_000;

export function splitAiDocumentText(
  text: string,
  maxChars = AI_DOCUMENT_CHUNK_CHARS,
): string[] {
  if (!text) return [];
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new Error("The AI document chunk size must be a positive integer.");
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const boundary = Math.max(
        text.lastIndexOf("\n\n", end),
        text.lastIndexOf("\n", end),
        text.lastIndexOf(" ", end),
      );
      if (boundary > start + Math.floor(maxChars * 0.8)) end = boundary;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Processes the entire extracted document in bounded requests and combines
 * partial results without silently dropping later pages.
 */
export async function processAiDocument(
  text: string,
  makeChunkPrompt: (chunk: string, index: number, total: number) => string,
  makeMergePrompt: (parts: string[]) => string,
  report?: (progress: number, message: string) => void,
  mergeWithoutAi?: (parts: string[]) => string,
): Promise<string> {
  const chunks = splitAiDocumentText(text);
  if (chunks.length === 0) {
    throw new FriendlyError("The PDF did not contain any text to process.");
  }
  if (chunks.length > MAX_AI_DOCUMENT_CHUNKS) {
    throw new FriendlyError(
      `This document is too long for one AI run. Please split it into smaller PDFs (up to ${MAX_AI_DOCUMENT_CHUNKS} text parts per run).`,
    );
  }

  let completed = 0;
  const parts: string[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const prompt = makeChunkPrompt(chunks[index]!, index, chunks.length);
    if (prompt.length > MAX_AI_PROMPT_CHARS) {
      throw new FriendlyError("This AI request is too long. Please shorten the extra instructions and try again.");
    }
    parts.push(await callGemini(prompt));
    completed += 1;
    report?.(
      15 + Math.round((completed / chunks.length) * 45),
      chunks.length > 1
        ? `Analyzed document part ${completed} of ${chunks.length}...`
        : "Analyzed document...",
    );
  }

  if (mergeWithoutAi) return mergeWithoutAi(parts);
  if (parts.length === 1) return parts[0]!;

  let pending = parts;
  while (pending.length > 1) {
    const groups: string[][] = [];
    let group: string[] = [];
    for (const part of pending) {
      const candidate = [...group, part];
      if (
        group.length > 0 &&
        makeMergePrompt(candidate).length > MAX_AI_MERGE_PROMPT_CHARS
      ) {
        groups.push(group);
        group = [part];
      } else {
        group = candidate;
      }
    }
    if (group.length > 0) groups.push(group);
    if (groups.length === pending.length) {
      throw new FriendlyError("The AI returned too much text to safely combine. Please split the PDF and try again.");
    }

    const next: string[] = [];
    for (const current of groups) {
      if (current.length === 1) {
        next.push(current[0]!);
        continue;
      }
      const prompt = makeMergePrompt(current);
      if (prompt.length > MAX_AI_PROMPT_CHARS) {
        throw new FriendlyError("The AI results are too large to combine safely. Please split the PDF and try again.");
      }
      next.push(await callGemini(prompt));
      completed += 1;
      report?.(60 + Math.min(38, completed - chunks.length), "Combining results from all document parts...");
    }
    pending = next;
  }

  return pending[0]!;
}

export function mergeAiPartialsPrompt(
  toolName: string,
  parts: string[],
  instructions: string,
  outputShape: string,
): string {
  return `You are combining results from consecutive parts of one PDF for the ${toolName} tool.
The partial results below are already completed work, not source text. Combine all of them in their original order. Do not ignore later parts, invent details, or repeat the same point. Follow the merge instructions and return valid JSON only.

Merge instructions: ${instructions}

Required output shape:
${outputShape}

Partial results:
${JSON.stringify(parts)}`;
}

export function mergeAiDocumentPrompt(
  task: AiDocumentTask,
  parts: string[],
  options: AiDocumentOptions = {},
): string {
  const instructions: Record<AiDocumentTask, string> = {
    translator:
      "Concatenate translatedText values in source order without translating them again. Keep the detected source and target languages.",
    rewriter:
      "Concatenate rewrittenText values in source order without rewriting them again. Keep the selected mode and combine notes briefly.",
    presentation:
      "Combine slides in source order, remove duplicate slides, and retain the document title.",
    flashcards:
      `Combine distinct cards from all parts and return up to ${options.cardCount ?? 10} cards. Select across the entire document, not only the first parts.`,
    citations:
      "Combine detected metadata without guessing. Prefer a detected value over a missing value and include all missing field names.",
    grammar:
      "Combine all distinct issues and add the grammar, spelling, and clarity counts across parts.",
    analyzer:
      "Combine all distinct dates, entities, statistics, sections, keywords, and key points. Write one concise whole-document summary.",
    resume:
      "Combine all distinct skills, experience, education, missing sections, keyword coverage, improvements, and job-match strengths and gaps. Keep scalar fields concise.",
    questions:
      `Combine distinct questions from all parts and return up to ${options.questionCount ?? 10} questions. Select across the entire document, not only the first parts.`,
  };
  const outputShapes: Record<AiDocumentTask, string> = {
    translator: '{"sourceLanguage":"...","targetLanguage":"...","translatedText":"..."}',
    rewriter: '{"mode":"...","rewrittenText":"...","notes":"..."}',
    presentation: '{"title":"...","slides":[{"title":"...","content":["..."],"keyPoints":["..."],"speakerNotes":"..."}]}',
    flashcards: '{"cards":[{"question":"...","answer":"...","topic":"..."}]}',
    citations: '{"style":"...","fullCitation":"...","inTextCitation":"...","detectedFields":{"author":"...","title":"...","date":"...","publisher":"..."},"missingFields":["..."]}',
    grammar: '{"summary":{"grammar":0,"spelling":0,"clarity":0},"issues":[{"category":"...","original":"...","suggestion":"...","explanation":"..."}]}',
    analyzer: '{"documentType":"...","mainTopic":"...","summary":"...","keyPoints":[],"importantDates":[],"entities":[],"statistics":[],"sections":[],"keywords":[]}',
    resume: '{"structure":"...","skills":[],"experience":[],"education":[],"missingSections":[],"keywordCoverage":[],"clarity":"...","readability":"...","improvements":[],"jobMatch":{"strengths":[],"gaps":[]}}',
    questions: '{"questions":[{"type":"...","question":"...","options":["..."],"answer":"...","explanation":"..."}]}',
  };
  return mergeAiPartialsPrompt(
    `AI PDF ${task}`,
    parts,
    instructions[task],
    outputShapes[task],
  );
}

export function mergeSummaryPrompt(parts: string[]): string {
  return mergeAiPartialsPrompt(
    "AI PDF Summarizer",
    parts,
    "Combine all partial summaries into one concise summary of the entire PDF. Preserve the most important points and topics from every part. Estimate reading time from the full document if possible.",
    '{"summary":"...","keyPoints":["..."],"topics":["..."],"readingTime":"X min read"}',
  );
}

export function mergeNotesPrompt(parts: string[]): string {
  return mergeAiPartialsPrompt(
    "AI PDF Notes",
    parts,
    "Combine sections from every part in source order, remove duplicate points, and write one whole-document overview and conclusion.",
    '{"title":"...","overview":"...","sections":[{"heading":"...","points":["..."],"details":"..."}],"summary":"..."}',
  );
}

export function mergeQuizPrompt(parts: string[]): string {
  return mergeAiPartialsPrompt(
    "AI PDF Quiz",
    parts,
    "Combine questions from all parts, remove duplicates, select a balanced set of 8-10 questions covering the whole document, and preserve correct answers and explanations.",
    '{"questions":[{"type":"mcq|true-false|short-answer","question":"...","options":["..."],"correct":0,"explanation":"..."}]}',
  );
}

export function mergeChatPrompt(parts: string[], question: string, history = ""): string {
  return `Answer the user's question using only the evidence in these partial answers from consecutive sections of the same PDF. Combine relevant evidence from all sections, avoid repeating points, and say clearly if the document does not provide the answer. Do not add outside knowledge.

Conversation so far:
${history || "(No earlier messages.)"}

User question: ${question}

Partial answers in document order:
${JSON.stringify(parts)}

Give one clear, concise answer.`;
}

/**
 * Streaming version — falls back to non-streaming.
 */
export async function callGeminiStream(
  prompt: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const result = await callGemini(prompt);
  onChunk(result);
  return result;
}

// ── Prompt Templates ──────────────────────────────────────────────

export function summarizePrompt(text: string): string {
  return `Analyze the following PDF content and provide a comprehensive summary.

PDF Content:
${truncateForTokens(text, 8000)}

Please provide:
1. **Summary**: A concise 2-3 sentence summary of the document
2. **Key Points**: 5-8 bullet points of the most important information
3. **Main Topics**: 3-5 main topics covered in the document
4. **Reading Time**: Estimated reading time for the original document (assume 200 words/minute)

Format your response as JSON with this exact structure:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "topics": ["...", "..."],
  "readingTime": "X min read"
}`;
}

export function chatPrompt(text: string, question: string): string {
  return `You are a helpful AI assistant that answers questions about PDF documents.

PDF Content:
${truncateForTokens(text, 8000)}

User Question: ${question}

Please provide a clear, concise answer based on the PDF content. If the answer is not in the document, say so politely. Keep your response focused and helpful.`;
}

export function suggestToolsPrompt(text: string): string {
  return `Analyze the following PDF content and suggest which PDF tools would be most useful for this document.

PDF Content:
${truncateForTokens(text, 4000)}

Based on the content, suggest 3-5 tools from this list with a brief reason for each:
- Compress PDF: Reduce file size
- Merge PDF: Combine multiple PDFs
- Split PDF: Extract specific pages
- PDF to JPG: Convert pages to images
- JPG to PDF: Convert images to PDF
- Rotate PDF: Fix page orientation
- Delete Pages: Remove unwanted pages
- Extract Pages: Keep only specific pages
- Add Page Numbers: Label selected pages with page numbers

Format as JSON array:
[
  { "tool": "Compress PDF", "reason": "...", "href": "/compress-pdf" },
  ...
]`;
}

export function quizPrompt(text: string): string {
  return `Create a quiz based on the following PDF content. Generate a mix of question types.

PDF Content:
${truncateForTokens(text, 8000)}

Generate 8-10 questions with this mix:
- 4 Multiple Choice Questions (4 options each, 1 correct)
- 3 True/False questions
- 3 Short Answer questions

Format as JSON:
{
  "questions": [
    {
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    },
    {
      "type": "true-false",
      "question": "...",
      "correct": true,
      "explanation": "..."
    },
    {
      "type": "short-answer",
      "question": "...",
      "correctAnswer": "...",
      "explanation": "..."
    }
  ]
}`;
}

export function notesPrompt(text: string): string {
  return `Create well-structured study notes from the following PDF content.

PDF Content:
${truncateForTokens(text, 8000)}

Generate organized notes with:
1. **Title**: A descriptive title for the notes
2. **Overview**: 2-3 sentence overview
3. **Sections**: 3-6 sections, each with:
   - Section heading
   - Key points (bullet points)
   - Important details
4. **Summary**: A brief concluding summary

Format as JSON:
{
  "title": "...",
  "overview": "...",
  "sections": [
    {
      "heading": "...",
      "points": ["...", "..."],
      "details": "..."
    }
  ],
  "summary": "..."
}`;
}

export function actionsPrompt(text: string): string {
  return `Based on this PDF content, suggest 3-4 quick AI actions the user might want to take.

PDF Content:
${truncateForTokens(text, 3000)}

Suggest actions like:
- Summarize this document
- Explain key concepts
- List important dates/deadlines
- Create study notes
- Generate quiz questions
- Extract action items
- Find key statistics
- Simplify the language

Format as JSON array:
[
  { "label": "...", "prompt": "..." },
  ...
]

The prompt field should be a complete instruction that could be sent to an AI.`;
}

export type AiDocumentTask =
  | "translator"
  | "rewriter"
  | "presentation"
  | "flashcards"
  | "citations"
  | "grammar"
  | "analyzer"
  | "resume"
  | "questions";

export interface AiDocumentOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  rewriteMode?: string;
  cardCount?: number;
  citationStyle?: string;
  questionCount?: number;
  difficulty?: string;
  questionType?: string;
  jobDescription?: string;
}

/** Build strict, document-grounded prompts for the extended AI tool suite. */
export function documentPrompt(
  task: AiDocumentTask,
  text: string,
  options: AiDocumentOptions = {},
): string {
  const content = truncateForTokens(text, 8000);
  const base = `You are a careful document assistant. Use only the supplied PDF text. Never invent facts, names, dates, citations, statistics or bibliographic fields. If information is missing, write "Not detected in the document". Return valid JSON only, with no Markdown fences.\n\nPDF TEXT:\n${content}\n\n`;

  switch (task) {
    case "translator":
      return `${base}Translate the document text from ${options.sourceLanguage ?? "auto-detected language"} to ${options.targetLanguage ?? "English"}. Preserve headings, paragraphs and page markers as much as possible. Return {"sourceLanguage":"...","targetLanguage":"...","translatedText":"..."}.`;
    case "rewriter":
      return `${base}Rewrite the document using this mode: ${options.rewriteMode ?? "Improve clarity"}. Preserve the meaning and structure. Return {"mode":"...","rewrittenText":"...","notes":"..."}.`;
    case "presentation":
      return `${base}Create a presentation outline from the document. Return {"title":"...","slides":[{"title":"...","content":["..."],"keyPoints":["..."],"speakerNotes":"..."}]}. Use 5-10 slides and omit unsupported claims.`;
    case "flashcards":
      return `${base}Generate exactly ${options.cardCount ?? 10} study flashcards. Return {"cards":[{"question":"...","answer":"...","topic":"..."}]}. Every answer must be supported by the document.`;
    case "citations":
      return `${base}Create a ${options.citationStyle ?? "APA"} citation from detected document metadata. Return {"style":"...","fullCitation":"...","inTextCitation":"...","detectedFields":{"author":"...","title":"...","date":"...","publisher":"..."},"missingFields":["..."]}. Do not guess missing fields.`;
    case "grammar":
      return `${base}Review the text for grammar, spelling, punctuation, clarity, awkward wording and repetition. Return {"summary":{"grammar":0,"spelling":0,"clarity":0},"issues":[{"category":"...","original":"...","suggestion":"...","explanation":"..."}]}. Keep issues grounded in exact document text.`;
    case "analyzer":
      return `${base}Analyze the document. Return {"documentType":"...","mainTopic":"...","summary":"...","keyPoints":["..."],"importantDates":["..."],"entities":["..."],"statistics":["..."],"sections":["..."],"keywords":["..."]}.`;
    case "resume":
      return `${base}Analyze this resume as a document, not as a hiring guarantee. ${options.jobDescription ? `Compare it with this job description:\n${options.jobDescription}` : "Do not infer a target job."} Return {"structure":"...","skills":["..."],"experience":["..."],"education":["..."],"missingSections":["..."],"keywordCoverage":["..."],"clarity":"...","readability":"...","improvements":["..."],"jobMatch":{"strengths":["..."],"gaps":["..."]}}.`;
    case "questions":
      return `${base}Generate exactly ${options.questionCount ?? 10} ${options.difficulty ?? "Medium"} questions of type ${options.questionType ?? "Multiple choice"}. Return {"questions":[{"type":"...","question":"...","options":["..."],"answer":"...","explanation":"..."}]}. Questions and answers must be supported by the document.`;
  }
}

export function parseAiJson<T>(response: string): T {
  const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
