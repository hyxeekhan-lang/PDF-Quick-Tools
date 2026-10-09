import { describe, expect, it } from "vitest";
import {
  cardsPrompt,
  MATERIAL_LABELS,
  normalizeQuestions,
  notesPrompt,
  questionsPrompt,
  STUDY_COUNT_OPTIONS,
  STUDY_DIFFICULTIES,
  summaryPrompt,
  type StudyMaterial,
} from "./study-mode";

const TEXT = "The Treaty of Lisbon entered into force on 1 January 2009. It replaced the earlier constitutional treaty.";

const PROMPTS: Record<StudyMaterial, (text: string) => string> = {
  summary: summaryPrompt,
  notes: notesPrompt,
  questions: (text) => questionsPrompt(text, 10, "Medium"),
  flashcards: (text) => cardsPrompt(text, 10),
};

describe("prompts", () => {
  it("gives every material the same grounding instruction", () => {
    // The rule that stops the model filling a gap from general knowledge. It is
    // repeated in each prompt on purpose: a student cannot tell an invented
    // definition from a real one, so this has to be asked for every time.
    for (const [material, build] of Object.entries(PROMPTS)) {
      const prompt = build(TEXT);
      expect(prompt, material).toContain("Answer only from the document text below");
      expect(prompt, material).toContain("Not covered in the document");
      expect(prompt, material).toContain(TEXT);
    }
  });

  it("puts the document after the rules, so the rules are not the first thing read", () => {
    // Prompt injection lives in document text. Rules stated before the
    // document can still be overridden by it; restating the intent after is what
    // actually helps.
    const prompt = questionsPrompt(TEXT, 10, "Medium");
    expect(prompt.lastIndexOf("Reminder, stated again now")).toBeGreaterThan(
      prompt.indexOf(TEXT),
    );
    expect(prompt.indexOf("Reminder, stated again now")).toBeGreaterThan(
      prompt.indexOf("--- END DOCUMENT ---"),
    );
  });

  it("truncates a very long document rather than sending all of it", () => {
    const huge = "The Treaty of Lisbon. ".repeat(20_000);
    const prompt = summaryPrompt(huge);
    // 8,000 tokens at roughly four characters each, plus the prompt around it.
    expect(prompt.length).toBeLessThan(40_000);
    expect(prompt).toContain("[Content truncated...]");
    expect(prompt.length).toBeLessThan(huge.length / 5);
  });

  it("asks for the count and difficulty the visitor actually chose", () => {
    for (const count of STUDY_COUNT_OPTIONS) {
      for (const difficulty of STUDY_DIFFICULTIES) {
        expect(questionsPrompt(TEXT, count, difficulty)).toContain(`Write ${count} practice questions`);
        expect(questionsPrompt(TEXT, count, difficulty)).toContain(`Difficulty: ${difficulty}`);
      }
    }
    expect(cardsPrompt(TEXT, 20)).toContain("Write 20 flashcards");
  });
});

describe("normalizeQuestions", () => {
  it("keeps a well-formed multiple choice question as it is", () => {
    const [question] = normalizeQuestions({
      questions: [
        {
          type: "mcq",
          question: "When did the treaty enter into force?",
          options: ["2007", "2009", "2011"],
          correct: 1,
          explanation: "The first paragraph gives 1 January 2009.",
        },
      ],
    });
    expect(question?.type).toBe("mcq");
    expect(question?.correct).toBe(1);
    expect(question?.options).toHaveLength(3);
    expect(question?.unmarkable).toBeUndefined();
  });

  it("accepts a correct answer given as the option's text", () => {
    const [question] = normalizeQuestions({
      questions: [
        {
          type: "mcq",
          question: "What did it replace?",
          options: ["The Maastricht Treaty", "The Rome Statute"],
          correct: "the rome statute",
          explanation: "Named in the second sentence.",
        },
      ],
    });
    expect(question?.correct).toBe(1);
    expect(question?.unmarkable).toBeUndefined();
  });

  it("does not mark a question whose correct answer cannot be found", () => {
    // The real failure this guards: an index past the end of the options would
    // mark a student wrong for the answer they actually gave.
    const [question] = normalizeQuestions({
      questions: [
        {
          type: "mcq",
          question: "Which body chaired it?",
          options: ["A", "B"],
          correct: 7,
          explanation: "Not in the text.",
        },
      ],
    });
    expect(question?.unmarkable).toBe(true);
    expect(question?.options).toHaveLength(2);
  });

  it("turns a multiple choice question with no usable options into short answer", () => {
    const [question] = normalizeQuestions({
      questions: [
        { type: "mcq", question: "When?", options: [], correct: 0, explanation: "Page 3." },
      ],
    });
    expect(question?.type).toBe("short-answer");
    expect(question?.options).toBeUndefined();
    expect(question?.correct).toBe("0");
  });

  it("keeps a true-false question true-false rather than flattening it", () => {
    const [question] = normalizeQuestions({
      questions: [
        { type: "true-false", question: "It entered force in 2009.", correct: true, explanation: "Yes." },
      ],
    });
    expect(question?.type).toBe("true-false");
    expect(question?.correct).toBe(true);
  });

  it("survives a response with no questions array at all", () => {
    expect(normalizeQuestions({} as never)).toEqual([]);
    expect(normalizeQuestions(null as never)).toEqual([]);
  });

  it("drops blank options that would render as empty buttons", () => {
    const [question] = normalizeQuestions({
      questions: [
        { type: "mcq", question: "Which?", options: ["A", "", null as never, "B"], correct: 0, explanation: "" },
      ],
    });
    expect(question?.options).toEqual(["A", "B"]);
  });
});

describe("labels", () => {
  it("names every material the page offers", () => {
    for (const material of ["summary", "notes", "questions", "flashcards"] as StudyMaterial[]) {
      expect(MATERIAL_LABELS[material]).toBeTruthy();
    }
  });
});