import type { Report } from "#/hooks/useToolRun";
import { makeResult, sanitizeFilename, type ResultFile } from "./files";
import { loadPdfLib, save, toBlobPart } from "./pdf";

/**
 * Presentation of translated text.
 *
 * Two problems have to be solved that the translation itself does not solve.
 *
 * **Direction.** Urdu, Arabic, Persian, Hebrew and Urdu-adjacent scripts are
 * written right to left, and pasting them into a left-to-right container
 * produces text that reads as though it were garbled — the words are correct
 * and the punctuation has drifted to the wrong end of the sentence. The browser
 * can lay out direction properly through the `dir` attribute, but only if the
 * page tells it what direction the content is in.
 *
 * **Download.** A translated PDF is genuinely useful, and for most of the
 * languages on the list it is straightforward: lay the translated text out in
 * pages with an embedded font. It is not possible for the right-to-left
 * scripts. A PDF font is a table of glyphs, not a shaping engine — pdf-lib draws
 * the characters it is given and does not join them, reorder them for
 * bidirectional text, or apply the contextual forms Arabic and Urdu need. The
 * output would be technically valid and completely unreadable.
 *
 * So the PDF export is offered only where it can be correct, and for the other
 * scripts the tool says plainly why there is no button rather than shipping one
 * that produces broken output. This is the difference between a limitation and a
 * bug: the visitor is told about it.
 */

export const TRANSLATION_LANGUAGES = [
  "English",
  "Urdu",
  "Arabic",
  "Persian",
  "Hebrew",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Turkish",
  "Chinese",
  "Japanese",
  "Korean",
  "Russian",
  "Indonesian",
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

/** Scripts written and read right to left. */
const RTL_LANGUAGES = new Set<TranslationLanguage>(["Urdu", "Arabic", "Persian", "Hebrew"]);

/** Whether text in this language should be laid out right to left. */
export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.has(language as TranslationLanguage);
}

/**
 * Whether a downloadable PDF can be produced for this language.
 *
 * CJK is excluded too, for a different reason: pdf-lib's standard fonts are
 * WinAnsi-encoded and have no ideographs at all, so a Chinese or Japanese
 * translation would come out as blank pages or mojibake. Scripts that are
 * shaped or simply not covered by the embedded font are excluded here rather
 * than discovered by the visitor after waiting for a download.
 */
export function supportsPdfExport(language: string): boolean {
  if (isRtl(language)) return false;
  return !["Chinese", "Japanese", "Korean", "Russian", "Hindi"].includes(language);
}

/** The `dir` value a container of translated text should carry. */
export function directionFor(language: string): "rtl" | "ltr" {
  return isRtl(language) ? "rtl" : "ltr";
}

const PAGE_WIDTH = 595.28; // A4 at 72 dpi
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
/** Helvetica's glyph widths are ~0.6 em; good enough for a line-break estimate. */
const CHARS_PER_LINE = Math.floor((PAGE_WIDTH - MARGIN * 2) / (FONT_SIZE * 0.6));

/**
 * Wraps text to the page width.
 *
 * pdf-lib draws a string at one position and does not wrap it, so a long
 * paragraph drawn naively runs off the edge of the page and is silently lost.
 * Word wrapping has to happen here.
 */
function wrap(text: string, charsPerLine: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line === "") {
        line = word;
      } else if (line.length + 1 + word.length <= charsPerLine) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
      // A single word longer than the line — a URL, or a run of text with no
      // spaces from a bad extraction — has to be broken or it overflows.
      while (line.length > charsPerLine) {
        lines.push(line.slice(0, charsPerLine));
        line = line.slice(charsPerLine);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Builds a translated PDF from the translated text.
 *
 * Returns a refusal rather than a broken file when the language cannot be
 * rendered correctly, so the caller never has to decide whether a download it
 * is about to offer will actually work.
 */
export async function buildTranslatedPdf(
  translatedText: string,
  targetLanguage: string,
  sourceName: string,
  report: Report,
): Promise<{ result: ResultFile } | { unsupported: true; reason: string }> {
  if (!supportsPdfExport(targetLanguage)) {
    return {
      unsupported: true,
      reason: isRtl(targetLanguage)
        ? `${targetLanguage} is written right to left, and a PDF font stores individual glyphs without joining them together the way the script requires. Producing one here would give you correctly shaped words in the wrong order, so there is no PDF export for ${targetLanguage} — copy the text instead, which will render properly in any word processor.`
        : `${targetLanguage} needs glyphs that the fonts available in the browser do not carry. Use Copy instead, and paste it into a word processor that has the script.`,
    };
  }

  report(20, "Laying out your translation");
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const lines = wrap(translatedText, CHARS_PER_LINE);
  const linesPerPage = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

  report(55, "Writing pages");
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let used = 0;
  for (const [index, line] of lines.entries()) {
    if (used >= linesPerPage) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      used = 0;
    }
    // An empty line has no glyphs to draw, and drawing an empty string at a
    // y position still costs a text-showing operator per page — worth skipping
    // on a long document.
    if (line !== "") {
      page.drawText(line, {
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - used * LINE_HEIGHT - FONT_SIZE,
        size: FONT_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.12),
      });
    }
    used += 1;
    if (index % 200 === 0) {
      report(55 + Math.round((index / Math.max(1, lines.length)) * 35));
    }
  }

  report(95, "Saving your PDF");
  const bytes = await save(doc);
  const base = sanitizeFilename(sourceName, "translated").replace(/\.pdf$/i, "");
  return {
    result: makeResult(
      toBlobPart(bytes),
      `${base}-${targetLanguage.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      "application/pdf",
    ),
  };
}