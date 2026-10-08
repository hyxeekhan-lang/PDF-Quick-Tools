import type { ToolHref } from "./tools";

/** How-to steps for the tools in batch B. Merged into HOW_TO by how-to.ts. */
export const HOW_TO_BATCH_B: Partial<Record<ToolHref, { title: string; body: string }[]>> = {
  "/edit-pdf": [
    {
      title: "Load the PDF you want to annotate",
      body: "Drop in the document and the tool counts its pages, which sets the highest page number you can target. Everything runs in this tab, so the file stays on your own machine.",
    },
    {
      title: "Type the text into a box",
      body: "One box holds one piece of text — a date, a note, a signature line. Press Add Another Box for anything more, such as a heading and a line beneath it.",
    },
    {
      title: "Set the position in points",
      body: "Coordinates start at the bottom-left corner, PDF's own convention. On A4 (about 595 by 842 points) x = 56 and y = 780 lands in a sensible top-left margin.",
    },
    {
      title: "Choose a readable size",
      body: "12 is normal body text, 18 to 24 reads as a heading. Below 8 the text is hard to read in print; above 36 it runs off most pages.",
    },
    {
      title: "Apply and download",
      body: "Press Apply Text to PDF. The finished file draws your boxes on top of the existing pages — nothing underneath changes, and only standard Helvetica fonts are available.",
    },
  ],
  "/compare-pdf": [
    {
      title: "Upload the version you already have",
      body: "Load the older document first; it is labelled Original so there is no confusion about which is which. A second drop area then appears underneath for the revised copy.",
    },
    {
      title: "Add the newer document",
      body: "Pick the revision you want to check it against, then press Compare PDFs. Both files are read in your browser and neither is uploaded to a server.",
    },
    {
      title: "Read the change list",
      body: "Lines only the original had are marked with a minus, lines only the new version has with a plus. Identical lines are left alone, so the output is a short list rather than the whole document.",
    },
    {
      title: "Download the marked-up text",
      body: "You get the comparison as a text file, plus counts of lines added, removed and unchanged. Use it to confirm a clause really changed rather than guessing from a side-by-side view.",
    },
  ],
  "/embed-file-in-pdf": [
    {
      title: "Choose the host PDF",
      body: "Pick the document the files will travel inside — an application, an invoice pack, a report with its data. This is the file you will send; the attachments never appear as pages in it.",
    },
    {
      title: "Add up to five files",
      body: "Use Browse files to select documents, spreadsheets, images, archives or text files. Anything already selected can be removed from the list before you build the PDF.",
    },
    {
      title: "Embed them together",
      body: "Press Embed Files and the attachments are packed into one copy of your PDF in a single pass. The file is assembled locally, so nothing is uploaded while it is built.",
    },
    {
      title: "Tell the recipient where to look",
      body: "Attachments open from the paperclip icon in the PDF reader, not from the page content. Say so in your email, since most people will not spot the icon on their own.",
    },
  ],
  "/add-pdf-bookmarks": [
    {
      title: "Load a document that needs navigating",
      body: "Bookmarks pay off on anything long enough to scroll — a report, a manual, a thesis. The tool reads the page count straight away so you know the range you are working with.",
    },
    {
      title: "Name a page, then add it",
      body: "Type the page number and the heading you want to see in the reader, then press Add. The title box clears itself so you can repeat the pair for the next section.",
    },
    {
      title: "Work through your chapters",
      body: "Keep going until every entry you want is listed; each one appears below with its page number. Anything added by mistake can be removed from the list before you apply.",
    },
    {
      title: "Save the PDF with its outline",
      body: "Press Add Bookmarks to write the outline into a copy of the file. Out-of-range page numbers are flagged before saving, so a mis-typed page will not slip through.",
    },
  ],
  "/ai-pdf-translator": [
    {
      title: "Upload a PDF with readable text",
      body: "The translator works on the text layer, which is extracted in your browser — not the file itself. Scanned or image-only pages have no text to work with and will fail.",
    },
    {
      title: "Set both languages",
      body: "Leave the source on auto-detect unless you know it, then choose your target from ten languages including Urdu, Arabic, Hindi and Chinese. The detected source is reported back with the result.",
    },
    {
      title: "Generate the translation",
      body: "Press Generate with AI. Only the extracted text goes to the AI provider, and long documents are processed in consecutive parts so translation runs past the opening pages.",
    },
    {
      title: "Copy out the plain text",
      body: "The result is one block of translated text, not a redesigned PDF: columns, images and fonts from the original are not carried over. Review idioms and technical terms before you rely on it.",
    },
  ],
  "/ai-pdf-rewriter": [
    {
      title: "Pick the document to rework",
      body: "Upload a PDF whose text extracts cleanly. Only that extracted text is sent for rewriting — the original file itself stays in your browser and is never uploaded.",
    },
    {
      title: "Choose a rewrite mode",
      body: "Six modes cover the usual jobs: Rewrite professionally, Simplify, Make concise, Expand, Improve clarity, and Change tone. Pick the one that matches why the draft is not working yet.",
    },
    {
      title: "Compare the two versions",
      body: "The result panel shows your original extracted text next to the rewrite, so you can check line by line that the meaning survived. A short note explains what the rewrite changed.",
    },
    {
      title: "Take what is useful and discard the rest",
      body: "The output is generated text, so read it before pasting. Long documents are handled in sections and the pieces are joined together, which can leave seams worth smoothing.",
    },
  ],
  "/ai-ask-pdf": [
    {
      title: "Load the document into the chat",
      body: "Upload a PDF and press Prepare document chat. The text is extracted in your browser and loaded into a conversation that answers only from that document.",
    },
    {
      title: "Start with a suggested question",
      body: "Three prompts are offered for a fresh chat — what the document is about, its key points, and any important dates. Type your own once you know what you need.",
    },
    {
      title: "Follow up without re-uploading",
      body: "Each question carries the earlier conversation with it, so you can narrow down step by step. Long PDFs are read in consecutive sections, not just the first pages.",
    },
    {
      title: "Check answers against the page",
      body: "The chat is told to use no outside knowledge and to say plainly when an answer is not in the file. Where it does answer, confirm anything important against the original text.",
    },
  ],
  "/ai-pdf-to-presentation": [
    {
      title: "Upload the source material",
      body: "Reports, lecture notes and white papers convert best because they already have headings to work from. Only the extracted text is sent to the AI provider; the PDF stays in your browser.",
    },
    {
      title: "Generate the slide outline",
      body: "Press Generate with AI and the document becomes between five and ten slides. Each one carries its own title, bullet points, key points and speaker notes drawn from the text.",
    },
    {
      title: "Treat it as an outline, not a deck",
      body: "What comes back is structured plain text — there is no PowerPoint file and nothing is formatted. Paste it into your own presentation software and apply your design.",
    },
    {
      title: "Prune before you present",
      body: "Slide count follows how much content was found, so a dense document produces dense slides. Cut anything the AI could not support from the source before speaking to it.",
    },
  ],
  "/ai-flashcard-generator": [
    {
      title: "Upload your study material",
      body: "Choose the PDF you are revising from — notes, a textbook chapter, a set of slides. Cards are built from the extracted text, so scanned pages will not produce anything.",
    },
    {
      title: "Decide how many you need",
      body: "Choose 5, 10, 20 or 50 cards. If your document is long enough to be split into parts, the count is divided across those parts and the sets rejoined.",
    },
    {
      title: "Flip through and copy",
      body: "Cards appear one at a time — tap to reveal the answer, then use Previous and Next to move on. Copy all sends the whole deck to your clipboard at once.",
    },
    {
      title: "Verify the facts",
      body: "Each card carries the topic it came from, which helps when a deck drifts off-topic. Check answers against your source, especially dates, figures and definitions.",
    },
  ],
  "/ai-citation-generator": [
    {
      title: "Upload the document to cite",
      body: "Use a PDF that contains its own title page, authorship and date. The tool reads metadata out of the text rather than inventing it, so a bare export will come back sparse.",
    },
    {
      title: "Choose APA, MLA, Chicago or Harvard",
      body: "The style you select is what the full reference is formatted in, and the in-text form is matched to it. Pick the one your department or journal actually requires.",
    },
    {
      title: "Generate and inspect the fields",
      body: "The result shows the finished citation, the in-text form, and a breakdown of the detected author, title, date and publisher — plus which fields could not be found.",
    },
    {
      title: "Fill the gaps yourself",
      body: "Missing details are listed rather than guessed, so nothing is silently invented. Look up the absent fields in the original source before you submit the reference.",
    },
  ],
  "/ai-grammar-checker": [
    {
      title: "Upload text that can be extracted",
      body: "The checker needs a real text layer. A scanned contract or photographed page has none, and the tool reports that rather than inventing sentences to correct.",
    },
    {
      title: "Run the review",
      body: "Press Generate with AI and the extracted text is checked for grammar, spelling, punctuation and awkward phrasing. Only the text is sent — the PDF stays on your device.",
    },
    {
      title: "Work through the issues list",
      body: "Every issue names a category and quotes the original wording alongside a suggested fix and a short explanation. Counts for grammar, spelling and clarity appear above the list.",
    },
    {
      title: "Read the corrected version alongside",
      body: "The full cleaned-up text sits next to your original for comparison. Check that the tone and emphasis survived the rewrite before copying anything back.",
    },
  ],
  "/ai-document-analyzer": [
    {
      title: "Upload a document you want read closely",
      body: "Reports, agreements and research papers give the most useful results. The original PDF is not uploaded; its extracted text is what the AI service receives.",
    },
    {
      title: "Generate the analysis",
      body: "The report comes back as a structured breakdown: document type, main topic, a written summary, key points, important dates, named entities, statistics, section names and keywords.",
    },
    {
      title: "Scan the lists first",
      body: "Dates, entities and statistics are the parts worth checking against the original, since they are easy to misattribute. They arrive as bulleted lists, so a quick scan catches most errors.",
    },
    {
      title: "Remember what this is not",
      body: "This describes your own document — it does not compare it against other sources and cannot detect copied content. For plagiarism, use a service built for that job.",
    },
  ],
  "/ai-resume-analyzer": [
    {
      title: "Upload your resume as a PDF",
      body: "Leave out identification numbers, addresses and anything sensitive before you upload. The file stays in your browser; only its extracted text is sent when you run the analysis.",
    },
    {
      title: "Optionally paste a job description",
      body: "Adding the vacancy text switches on a comparison of strengths and gaps, plus keyword coverage against that posting. Leave it blank for a review of the resume on its own terms.",
    },
    {
      title: "Generate the review",
      body: "You get a structural read on the document: skills, experience and education lists, sections that are missing, notes on clarity and readability, and a set of concrete improvements.",
    },
    {
      title: "Treat it as editing advice",
      body: "This is not a hiring prediction and assigns no score or odds of an offer. Use the gaps and improvements to rewrite the resume, then read it yourself before sending it out.",
    },
  ],
  "/ai-pdf-question-generator": [
    {
      title: "Upload the material to question",
      body: "Pick a PDF that covers something you want tested on. Questions are written against the extracted text, so the file itself is never uploaded.",
    },
    {
      title: "Set quantity, difficulty and format",
      body: "Choose 5, 10, 20 or 50 questions, then pick Easy, Medium or Hard, and Multiple choice, True/False or Short answer. Longer documents split the count across sections and rejoin the results.",
    },
    {
      title: "Generate the question set",
      body: "Each question arrives with its options, an answer, and an explanation hidden behind a Show answer toggle. You can copy the whole set as JSON and edit it elsewhere.",
    },
    {
      title: "Check every answer first",
      body: "Nothing here is guaranteed correct — check each answer against the source before handing the questions to students. Wrong keys are the fastest way to lose trust in a quiz.",
    },
  ],
};