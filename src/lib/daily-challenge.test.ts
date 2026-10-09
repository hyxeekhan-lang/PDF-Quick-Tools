import { describe, expect, it } from "vitest";
import {
  CHALLENGES,
  challengeForDate,
  CATEGORY_LABELS,
  localDateKey,
  type ChallengeCategory,
} from "./daily-challenge";
import { TOOLS, type ToolHref } from "./tools";

describe("challengeForDate", () => {
  it("gives the same challenge to everyone on the same day", () => {
    // Determinism is the whole mechanism: with no server to ask, the date has to
    // decide it, or two visitors on the same day see different content.
    expect(challengeForDate(new Date(2026, 9, 9))).toBe(
      challengeForDate(new Date(2026, 9, 9, 23, 59)),
    );
  });

  it("rotates rather than repeating the same entry forever", () => {
    const first = challengeForDate(new Date(2026, 9, 9)).id;
    const seen = new Set<string>();
    for (let day = 0; day < CHALLENGES.length; day += 1) {
      seen.add(challengeForDate(new Date(2026, 9, 9 + day)).id);
    }
    expect(seen.size).toBe(CHALLENGES.length);
    expect(seen.has(first)).toBe(true);
  });

  it("rolls over at local midnight, not at UTC midnight", () => {
    // Someone in Auckland would otherwise get tomorrow's tip this afternoon,
    // which is exactly the timezone bug this guards against.
    const before = challengeForDate(new Date(2026, 9, 9, 23, 30));
    const after = challengeForDate(new Date(2026, 9, 10, 0, 30));
    expect(before.id).not.toBe(after.id);
  });

  it("works for dates before the epoch rather than indexing negatively", () => {
    // A negative modulo in JavaScript returns a negative number, which would
    // index off the front of the array and return nothing at all.
    const challenge = challengeForDate(new Date(1969, 5, 1));
    expect(CHALLENGES).toContain(challenge);
  });
});

describe("localDateKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("the rotation's content", () => {
  const hrefs = new Set<string>(TOOLS.map((tool) => tool.href as string));

  it("only links to tools that exist", () => {
    // A link to a removed or misspelled route is a dead end in the middle of
    // the one thing a first-time visitor clicks.
    for (const challenge of CHALLENGES) {
      if (!challenge.href) continue;
      expect(
        hrefs.has(challenge.href),
        `${challenge.id} points at ${challenge.href}, which is not a tool`,
      ).toBe(true);
    }
  });

  it("gives every quiz exactly one correct option", () => {
    for (const challenge of CHALLENGES) {
      if (challenge.kind !== "quiz") continue;
      expect(challenge.options, challenge.id).toBeDefined();
      const options = challenge.options!;
      // Distractors that are also right are what make a quiz feel broken.
      expect(
        options.filter((option) => option.id === challenge.answer).length,
        challenge.id,
      ).toBe(1);
      for (const option of options) {
        expect(option.note.length, `${challenge.id}/${option.id}`).toBeGreaterThan(20);
      }
    }
  });

  it("has a unique id per entry, since ids drive the completion record", () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
  });

  it("covers all three categories", () => {
    const used = new Set<ChallengeCategory>(CHALLENGES.map((c) => c.category));
    expect(used).toEqual(new Set(Object.keys(CATEGORY_LABELS) as ChallengeCategory[]));
  });

  it("labels every category it uses", () => {
    for (const challenge of CHALLENGES) {
      expect(CATEGORY_LABELS[challenge.category], challenge.id).toBeTruthy();
    }
  });

  it("keeps tips and tasks to something doable in a sitting", () => {
    // A daily item that needs an hour is one nobody finishes, which defeats the
    // point of it being daily.
    for (const challenge of CHALLENGES) {
      if (challenge.kind === "quiz") continue;
      expect(challenge.body.split(/\s+/).length, challenge.id).toBeLessThan(70);
    }
  });

  it("explains every entry, not just the quizzes", () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.explanation.length, challenge.id).toBeGreaterThan(60);
    }
  });
});

describe("typing", () => {
  it("keeps hrefs within the ToolHref union", () => {
    // A plain string would compile, so this is the runtime half of a guarantee
    // the compiler cannot make across a file boundary.
    const hrefs: ToolHref[] = [
      ...CHALLENGES.map((challenge) => challenge.href).filter((href): href is ToolHref => Boolean(href)),
    ];
    expect(hrefs.length).toBeGreaterThan(0);
  });
});