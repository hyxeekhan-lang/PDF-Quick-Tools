/**
 * The daily challenge.
 *
 * One short, genuinely useful thing per day, chosen from a fixed list by date.
 *
 * The design constraint that shaped all of this: a daily feature is where sites
 * turn into engagement machines — streaks, guilt notifications, artificial
 * scarcity. That is not what this is. So there is no account, no streak that
 * breaks, no way to lose anything, and nothing that nags. A visitor who never
 * comes back has lost nothing, which is the only version of this worth having.
 *
 * Selection is a pure function of the local date, so it needs no server, no
 * database and no API call. The list rotates on a fixed cycle long enough that
 * the same challenge does not come round twice within a memorable stretch.
 */

export type ChallengeKind = "tip" | "quiz" | "task";

export type ChallengeCategory =
  | "pdf-skills"
  | "study-productivity"
  | "document-management";

export interface ChallengeOption {
  id: string;
  label: string;
  /** Why this option is right, shown after answering. */
  note: string;
}

export interface DailyChallenge {
  id: string;
  kind: ChallengeKind;
  category: ChallengeCategory;
  title: string;
  /** The task, question, or piece of advice. Plain text, no HTML. */
  body: string;
  /** Where the visitor actually does it. Null for tasks with no single page. */
  href?: string | null;
  hrefLabel?: string | null;
  /** Only on a quiz. */
  options?: ChallengeOption[];
  /** The option id the visitor should pick. */
  answer?: string;
  /** Shown after an attempt. */
  explanation: string;
}

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  "pdf-skills": "PDF skills",
  "study-productivity": "Study productivity",
  "document-management": "Document management",
};

/**
 * The rotation.
 *
 * Written out rather than generated, because every entry has to be *correct* —
 * a made-up tip is worse than no tip, and this list is long-lived enough that
 * anything vague in it would be read and believed. Each one is also a thing a
 * person can actually do in a minute, because a daily challenge that takes an
 * hour is a daily challenge nobody finishes.
 */
export const CHALLENGES: DailyChallenge[] = [
  {
    id: "exact-size-attachment",
    kind: "tip",
    category: "pdf-skills",
    title: "Stop guessing at an attachment limit",
    body:
      "An email server that rejects anything over 1 MB does not compress your PDF for you — it refuses to send the message. Compress to the exact size the limit asks for, and you find out immediately whether you were under it or not.",
    href: "/compress-pdf-to-specific-size",
    hrefLabel: "Compress to an exact size",
    explanation:
      "Ordinary compression aims for the smallest file; this one aims for a specific size, which is the number that actually gets checked. It reports the real measured size either way, so a target it could not reach is visible rather than surprising.",
  },
  {
    id: "ocr-before-ai",
    kind: "tip",
    category: "study-productivity",
    title: "OCR a scan before asking an AI tool about it",
    body:
      "An AI tool reads the text layer of a PDF. A scan has no text layer, so it has almost nothing to answer from — which is why asking about a photographed page usually returns something vague. Run OCR PDF first, then ask the question.",
    href: "/ocr-pdf",
    hrefLabel: "Open OCR PDF",
    explanation:
      "OCR adds the missing text layer, and every AI tool on this site gets markedly better the moment it exists. It costs you one extra step and a few seconds per page, and it is the difference between an answer drawn from your document and one drawn from guesswork.",
  },
  {
    id: "check-before-sending",
    kind: "task",
    category: "document-management",
    title: "Open one PDF you are about to send, and read page one",
    body:
      "Not the whole thing — page one. Black bars from a redacted copy, a leftover editing note, a signature field, an embarrassing filename in the title bar. It takes thirty seconds and it is the single most common way a mistake leaves an office.",
    href: null,
    hrefLabel: null,
    explanation:
      "Redactions copied from an annotated draft are a real and recurring problem, and they are invisible until someone opens the file. Page one is where they cluster, because that is where people add notes.",
  },
  {
    id: "answer-back",
    kind: "task",
    category: "study-productivity",
    title: "Turn one page of notes into five questions",
    body:
      "Do not re-read your notes a fourth time. Close them, write five questions from memory, then open the notes to check. The re-reading felt like studying; the questions are the test.",
    href: "/ai-quiz",
    hrefLabel: "Generate questions from a PDF",
    explanation:
      "Recognition during re-reading is comfortable and proves very little, whereas recall under mild pressure is what an exam actually asks for. This is the whole argument for active recall, and five questions is enough to find the gaps.",
  },
  {
    id: "which-tool-would-you-reach-for",
    kind: "quiz",
    category: "pdf-skills",
    title: "Which tool is for making a page range into a separate file?",
    body: "You have a 300-page manual and need only chapter 4 as its own PDF. What do you use?",
    options: [
      {
        id: "split",
        label: "Split PDF",
        note: "Correct. Split takes the page range you name and writes it into a new document.",
      },
      {
        id: "extract",
        label: "Extract PDF Pages",
        note:
          "This also works, and pulls chosen pages into a new file. Split is the more direct answer when you want one range as one file.",
      },
      {
        id: "merge",
        label: "Merge PDF",
        note:
          "Merge joins separate files into one — it is the wrong direction. You have one large file and want a smaller one out of it.",
      },
      {
        id: "compress",
        label: "Compress PDF",
        note:
          "Compression makes a file smaller in bytes, not shorter in pages. Your 300-page manual would still have 300 pages.",
      },
    ],
    answer: "split",
    href: "/split-pdf",
    hrefLabel: "Open Split PDF",
    explanation:
      "Choosing the wrong direction is the usual mistake: merge and split are opposites, and compression answers a completely different question — about size rather than content.",
  },
  {
    id: "why-a-file-is-huge",
    kind: "quiz",
    category: "document-management",
    title: "A 40 MB PDF that is only twelve pages. Why is it so large?",
    body: "Twelve pages should be a small file. Something else is going on. What is it most likely?",
    options: [
      {
        id: "images",
        label: "Scanned images at high resolution",
        note:
          "Correct. A page scanned at 300 dpi in colour runs to several megabytes on its own, and twelve of those adds up fast.",
      },
      {
        id: "font",
        label: "It has too many fonts",
        note:
          "Fonts do add up, but rarely to this. A font is shared across pages, so twelve pages of text stays small however many typefaces it uses.",
      },
      {
        id: "pages",
        label: "It has a lot of text",
        note:
          "Text is the cheapest thing a PDF can contain. A very long text document is usually one of the smaller files you will meet.",
      },
      {
        id: "metadata",
        label: "It has a lot of metadata",
        note:
          "Metadata matters at kilobytes, not megabytes. It is worth stripping for tidiness, but it will not explain a 40 MB file.",
      },
    ],
    answer: "images",
    explanation:
      "This is worth knowing before you spend time on the wrong fix. Almost every unexpectedly large PDF is images, and that is why compression works so well on scans and barely at all on text.",
  },
  {
    id: "ask-two-documents",
    kind: "task",
    category: "study-productivity",
    title: "Ask one question that only exists between two documents",
    body:
      "Open a report and its appendix — or a contract and its schedule — and ask what changed, what conflicts, or which deadline applies first. Questions that span documents are the ones a single-document chat cannot answer.",
    href: "/multi-pdf-chat",
    hrefLabel: "Open Multi-PDF Chat",
    explanation:
      "This is the case multi-document chat exists for. Answering across several files while keeping each one labelled is a different job from reading one file well, and it is where contract review and revision actually happen.",
  },
  {
    id: "name-your-files",
    kind: "tip",
    category: "document-management",
    title: "Name files for the person who opens them second",
    body:
      "The person who opens your file knows the filename before they know what it contains. Something like scan-2026-10-09.pdf tells them nothing; q3-contract-final-v4-signed.pdf tells them the version they are holding.",
    href: null,
    hrefLabel: null,
    explanation:
      "File names survive being emailed, and they are how anyone finds a document six months later — including future you. Adding a version number is the part that prevents the wrong draft being sent, which is the actual failure this prevents.",
  },
  {
    id: "flatten-before-web",
    kind: "tip",
    category: "pdf-skills",
    title: "Flatten before you send a form-fillable PDF",
    body:
      "A PDF that still contains fields can be filled in by someone else, and the values can change without the file changing size. Flatten it and the text becomes part of the page — final, and not editable by accident.",
    href: "/flatten-pdf",
    hrefLabel: "Open Flatten PDF",
    explanation:
      "Flattening converts form fields into ordinary page content. It is the right last step for anything signed or final, because it closes the gap where a filled-in value can be changed after you sent it.",
  },
  {
    id: "study-recall",
    kind: "quiz",
    category: "study-productivity",
    title: "Which study method actually performs best?",
    body:
      "Four students revise the same material the same number of hours. Who does best on the test a week later?",
    options: [
      {
        id: "reread",
        label: "Re-reads their notes four times",
        note:
          "Re-reading is comfortable and mostly ineffective. It builds a feeling of familiarity that has little to do with being able to produce the answer.",
      },
      {
        id: "highlight",
        label: "Highlights the important passages",
        note:
          "Highlighting is re-reading with a marker. It costs a bit more attention but produces almost the same illusion of knowing.",
      },
      {
        id: "recall",
        label: "Closes the notes and tests themselves",
        note:
          "Correct. Retrieval practice — recalling before checking — is the strongest effect in the learning literature, and the effort of struggling is what makes it stick.",
      },
      {
        id: "summarize",
        label: "Writes a one-page summary of each chapter",
        note:
          "Summary is better than re-reading — it involves some production. It still leaves the material there to look at, which is the part that matters.",
      },
    ],
    answer: "recall",
    explanation:
      "The uncomfortable effort of trying to remember something, and then finding out you were wrong, is what makes it stick. This is why testing yourself on a PDF beats reading it a fourth time.",
  },
  {
    id: "check-page-count",
    kind: "task",
    category: "pdf-skills",
    title: "Count the pages you expect, and check the file delivers them",
    body:
      "Open a PDF you are about to submit and confirm the page count matches what you intended. A PDF that is missing its last two pages looks exactly like one that was meant to end there.",
    href: null,
    hrefLabel: null,
    explanation:
      "Truncated and mis-ordered files are quiet failures — nothing errors, the PDF opens fine, and the content is simply wrong. A ten-second count catches what no tool on this site can.",
  },
  {
    id: "before-you-merge",
    kind: "tip",
    category: "document-management",
    title: "Merge in the right order, and check it after",
    body:
      "Merge joins files exactly as listed, so the order in your list is the order in the document. Drag the rows before you merge rather than after — reordering pages inside a finished PDF means rebuilding it.",
    href: "/merge-pdf",
    hrefLabel: "Open Merge PDF",
    explanation:
      "The list is the plan. Getting it right first is cheaper than starting over, because there is no step in which to insert a file at position three once the document exists.",
  },
  {
    id: "deskew-scan",
    kind: "tip",
    category: "pdf-skills",
    title: "Straighten a scan before anything else",
    body:
      "A scan tilted two degrees makes every crop guess, every margin trim, and every OCR line slightly wrong. Deskew it first; every later step gets easier and more accurate.",
    href: null,
    hrefLabel: null,
    explanation:
      "Small angles compound. Crop presets assume a clean rectangle and shave the first line of text off a skewed page, and OCR handles a slanted baseline considerably worse than a straight one.",
  },
  {
    id: "secure-vs-encrypt",
    kind: "quiz",
    category: "document-management",
    title: "You need a PDF that cannot be opened without a password. Which tool?",
    body: "Two tools sound similar here. One of them is what you want.",
    options: [
      {
        id: "protect",
        label: "Protect PDF — permissions only",
        note:
          "This restricts printing and copying but leaves the content readable by anyone who opens the file. It stops a reader, not a determined person.",
      },
      {
        id: "encrypt",
        label: "Encrypt PDF — password required to open",
        note:
          "Correct. Encryption makes the content unreadable without the password, which is what 'cannot be opened' actually means.",
      },
      {
        id: "watermark",
        label: "Watermark PDF",
        note:
          "A watermark marks who leaked a document. It does nothing to stop anyone opening or copying it.",
      },
      {
        id: "redact",
        label: "Redact PDF",
        note:
          "Redaction removes content that should not be visible. It answers a different question entirely — what is hidden rather than who can open it.",
      },
    ],
    answer: "encrypt",
    explanation:
      "Permissions are a request and encryption is a lock. Asking for a password and getting permissions instead gives a file that anyone can still open — a common and expensive mix-up.",
  },
  {
    id: "one-tool-per-job",
    kind: "tip",
    category: "study-productivity",
    title: "Run OCR once, then use everything else on the real text",
    body:
      "If a document needs OCR, do it as its own step and carry the result forward. Every later tool — summarising, translating, asking questions — gets better text and produces a better result.",
    href: "/ai-pdf-translator",
    hrefLabel: "Open PDF Translator",
    explanation:
      "OCR is the foundation everything else stands on. Running it once and reusing that file is faster than hoping several tools each make their own imperfect attempt at the same scan.",
  },
];

/**
 * The local date as `YYYY-MM-DD`.
 *
 * Local rather than UTC on purpose. A challenge that changed at 00:00 UTC would
 * roll over in the middle of somebody's afternoon, and one that rolled over at
 * midnight would mean asking someone in Auckland to come back tomorrow to read
 * the same tip. The visitor's own day is the one they think in.
 */
export function localDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Picks the challenge for a date.
 *
 * Days since the epoch, so the rotation starts on a fixed day and repeats every
 * `CHALLENGES.length` days — deterministic, identical for every visitor, and
 * needing no storage to stay in step.
 */
export function challengeForDate(now: Date = new Date()): DailyChallenge {
  const days = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
  const index = ((days % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
  return CHALLENGES[index]!;
}