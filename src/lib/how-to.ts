import type { ToolHref } from "./tools";
import { HOW_TO_BATCH_A } from "./how-to-batch-a";
import { HOW_TO_BATCH_B } from "./how-to-batch-b";

/**
 * The numbered walkthrough shown on each tool page, keyed by the tool's path.
 *
 * Kept in one place rather than inline in each route so the wording stays
 * consistent and reviewable as a set. These are the real sequences behind each
 * tool's UI, written out so someone who has never seen the page can follow
 * them, which is what the content guidelines are asking for: pages that stand
 * on their own rather than just wrapping an upload box.
 */
export const HOW_TO: Partial<Record<ToolHref, { title: string; body: string }[]>> = {
  "/compress-pdf-to-specific-size": [
    {
      title: "Drop in the PDF you need to shrink",
      body: "One file at a time, up to 50 MB. If it is already smaller than your target, you get it straight back unchanged — compressing it would only make it bigger.",
    },
    {
      title: "Choose a target size",
      body: "Pick 100 KB, 200 KB, 500 KB or 1 MB, or type your own such as 250 KB. These are the limits that upload forms and mail servers actually enforce.",
    },
    {
      title: "Pick how hard to work at it",
      body: "Low will work hardest to hit a small target and may soften the text. High gives up rather than pushing a page below the point where it stays readable.",
    },
    {
      title: "Download the result",
      body: "The screen shows the real measured sizes and whether the target was met. If it says it could not reach the target, the file you get is the smallest legible one we could make, with its actual size stated.",
    },
  ],
  "/compress-pdf": [
    {
      title: "Drop in your PDF",
      body: "Drag the file onto the page, or tap the drop area to pick it from your device. One file at a time, up to 50 MB.",
    },
    {
      title: "Pick a compression level",
      body: "Strong gives the smallest file, Recommended balances size against readability, and Basic keeps quality very close to the original. Most scans are best on Recommended.",
    },
    {
      title: "Compress and wait",
      body: "Press Compress PDF. The work runs in this tab, so a large file can take a moment. The progress bar fills as each page is processed.",
    },
    {
      title: "Download the smaller copy",
      body: "Check the size shown against your original, then download. If the text now looks soft or the photos look banded, go up one level and compress again.",
    },
  ],
  "/merge-pdf": [
    {
      title: "Add two or more files",
      body: "Drop in your first PDF, then add the rest. They appear in a list where you can see the order they will be joined in.",
    },
    {
      title: "Put them in the right order",
      body: "Use the move controls on each row to push a file up or down. Page count is shown next to every name so you can check nothing is missing.",
    },
    {
      title: "Merge the documents",
      body: "Press Merge PDF. The pages are copied into one file in the order shown, keeping each page's original size and orientation.",
    },
    {
      title: "Save the combined PDF",
      body: "Download the result and open it once to confirm every page is where you expect before you send it on.",
    },
  ],
  "/split-pdf": [
    {
      title: "Choose your PDF",
      body: "Drop in the document you want to break up. You can select a single page or a continuous range such as 3-7.",
    },
    {
      title: "Set the range",
      body: "Type the first and last page numbers, or tick pages in the preview if you only need a few scattered ones. The page count updates as you choose.",
    },
    {
      title: "Split the file",
      body: "Press Split PDF. The selected pages are copied into a new document and everything else is left behind.",
    },
    {
      title: "Download the new file",
      body: "Your original stays exactly as it was. Save the extracted copy and keep the source if you may need the other pages later.",
    },
  ],
  "/pdf-to-jpg": [
    {
      title: "Load your PDF",
      body: "Drop in the document. Every page is rendered at the quality you pick below, so a long file takes a moment to prepare.",
    },
    {
      title: "Choose pages and quality",
      body: "Tick the pages you need, or select all. Quality controls both the image resolution and the file size — higher is sharper but heavier.",
    },
    {
      title: "Convert to images",
      body: "Press Convert to JPG. Each selected page becomes a separate image file.",
    },
    {
      title: "Save your images",
      body: "Download them one at a time. If you need them in a single PDF instead, JPG to PDF does the reverse in one pass.",
    },
  ],
  "/jpg-to-pdf": [
    {
      title: "Add your images",
      body: "Drop in JPG, PNG or WebP files, or pick them from your device. Add as many as the job needs.",
    },
    {
      title: "Order them",
      body: "Drag or use the move controls to get the sequence right. This is the page order in the finished PDF, so it is worth checking.",
    },
    {
      title: "Pick a page size",
      body: "Choose A4, US Letter or Match image. Match image sizes each page to its own picture, which suits photo albums better than a fixed size.",
    },
    {
      title: "Build and download",
      body: "Press Create PDF, then download the finished document with one image per page.",
    },
  ],
  "/rotate-pdf": [
    {
      title: "Load the PDF",
      body: "Drop in the file. Pages appear as thumbnails so you can see which ones are sideways.",
    },
    {
      title: "Select the pages",
      body: "Tick the pages that need turning, or use Select all if the whole document is upside down.",
    },
    {
      title: "Choose the angle",
      body: "Rotate 90 degrees for a portrait page on its side, 180 for one that is upside down, or 270 for the other sideways direction.",
    },
    {
      title: "Save the rotated copy",
      body: "Press Rotate PDF and download. This changes the page permanently, so keep the original if you may need it the other way up.",
    },
  ],
  "/rearrange-pdf-pages": [
    {
      title: "Open your document",
      body: "Drop in the PDF and every page loads as a draggable thumbnail.",
    },
    {
      title: "Drag pages into place",
      body: "Grab a page and drop it where you want it. On a phone, use the move buttons on each card instead of dragging.",
    },
    {
      title: "Check the first and last page",
      body: "Front and back covers are the usual thing to get wrong. Scroll back to the top once before you continue.",
    },
    {
      title: "Save the new order",
      body: "Press Save PDF and download. Page sizes and content are untouched — only the sequence changes.",
    },
  ],
  "/delete-pdf-pages": [
    {
      title: "Load the PDF",
      body: "Drop in your document and every page appears as a thumbnail with a checkbox.",
    },
    {
      title: "Tick the pages to remove",
      body: "Select every page you do not need. Blank separator pages and duplicate scans are the usual candidates.",
    },
    {
      title: "Delete them",
      body: "Press Delete Pages. The ticked pages are dropped and the remaining ones close up in order.",
    },
    {
      title: "Download the shorter PDF",
      body: "Give the new file a different name so it does not overwrite your source while it is still open.",
    },
  ],
  "/extract-pdf-pages": [
    {
      title: "Choose your PDF",
      body: "Drop in the document you want pages from.",
    },
    {
      title: "Pick the pages to keep",
      body: "Enter a range like 2-5, or tick individual thumbnails. This is the opposite of Delete Pages: you choose what stays.",
    },
    {
      title: "Extract them",
      body: "Press Extract Pages. The chosen pages are copied into a new document, keeping their original order and size.",
    },
    {
      title: "Save the new file",
      body: "Download the extracted document. Your original is not modified.",
    },
  ],
  "/add-page-numbers": [
    {
      title: "Load the PDF",
      body: "Drop in the document you want to number.",
    },
    {
      title: "Choose the pages",
      body: "Usually you want to skip the cover. Untick page 1, or any front matter you do not want numbered.",
    },
    {
      title: "Set position, size and start",
      body: "Pick bottom centre, bottom outside and similar positions. The starting number is useful when the document continues from an earlier part.",
    },
    {
      title: "Apply and download",
      body: "Press Add Page Numbers, then save the result. Check the first numbered page before distributing it.",
    },
  ],
  "/watermark-pdf": [
    {
      title: "Upload your PDF",
      body: "Drop in the document you want to mark.",
    },
    {
      title: "Type the watermark text",
      body: "Enter something like DRAFT, CONFIDENTIAL or a date. Shorter words stay readable at large sizes; long ones have to shrink to fit.",
    },
    {
      title: "Style it",
      body: "Set the size, colour and angle. Around 30 degrees in a light grey is the usual choice because it stays legible without hiding the page.",
    },
    {
      title: "Pick the pages and apply",
      body: "Tick the pages to stamp, press Add Watermark, then download. This is a visual mark, not protection — it can be removed from the file.",
    },
  ],
  "/sign-pdf": [
    {
      title: "Open the document",
      body: "Drop in the PDF that needs signing.",
    },
    {
      title: "Draw your signature",
      body: "Sign with a finger, stylus or mouse in the box. A short, confident signature works better than a long one — see how it looks before you place it.",
    },
    {
      title: "Place it on a page",
      body: "Pick the page and drag the signature into position. Resize it to about the height of the line you are signing above.",
    },
    {
      title: "Flatten and download",
      body: "Press Sign PDF. The signature becomes part of the page, so it can no longer be moved or deleted by a recipient.",
    },
  ],
  "/insert-blank-page": [
    {
      title: "Load your PDF",
      body: "Drop in the document you want to add sheets to.",
    },
    {
      title: "Choose where they go",
      body: "Insert at the end for a spare back page, at the start for a cover, or after every page when you are printing double-sided and need the backs blank.",
    },
    {
      title: "Set the size",
      body: "Match the original pages unless you specifically want a different sheet size in the blank.",
    },
    {
      title: "Insert and download",
      body: "Press Insert Pages and save the result. Blank pages count towards your page total, so check the new count before printing.",
    },
  ],
  "/add-header-footer": [
    {
      title: "Choose the PDF",
      body: "Drop in the document you want to label.",
    },
    {
      title: "Type your line",
      body: "A file name, a date, a document reference or a confidential marking all work well. Keep it short so it fits on a printed page.",
    },
    {
      title: "Pick top or bottom",
      body: "Headers sit above the content and footers below. Margins are respected, so the line will not overlap the page text.",
    },
    {
      title: "Apply to every page",
      body: "The line is stamped on every page. Press Add Header and Footer, then download.",
    },
  ],
  "/change-page-size": [
    {
      title: "Upload your PDF",
      body: "Drop in the document whose pages need resizing.",
    },
    {
      title: "Choose the new size",
      body: "Pick A4, US Letter or Legal, then set portrait or landscape. Match the orientation of the page content or it will look sideways.",
    },
    {
      title: "Apply the change",
      body: "Press Change Page Size. Existing content is scaled to fit the new box rather than cropped, so nothing is lost.",
    },
    {
      title: "Download and print a test",
      body: "Save the file and print one page before a full run. Very dense pages can end up small at the new size.",
    },
  ],
  "/crop-pdf": [
    {
      title: "Open the PDF",
      body: "Drop in the file. This is usually a scan with wide white borders or a slightly crooked edge.",
    },
    {
      title: "Pick the pages",
      body: "Every page starts selected. Untick any you want to leave alone, such as a cover that is already the right size.",
    },
    {
      title: "Choose a crop size",
      body: "Select A4, US Letter, square or business card. The visible area is trimmed to that size and centred on the page.",
    },
    {
      title: "Crop and download",
      body: "Press Crop PDF and save. Cropping trims what is displayed — it does not shrink the file much, so use Compress PDF if size is the goal.",
    },
  ],
  "/flatten-pdf": [
    {
      title: "Upload the form or annotated PDF",
      body: "Drop in a file with fields, comments, annotations or sticky notes that you want to lock down.",
    },
    {
      title: "Flatten it",
      body: "Press Flatten PDF. Every form field, comment and annotation is drawn directly onto the page.",
    },
    {
      title: "Check the result",
      body: "Open the downloaded file. Fields should no longer be clickable and the text should look unchanged.",
    },
    {
      title: "Use it safely",
      body: "A flattened form is final, so fill it in carefully before flattening. You cannot edit the fields afterwards.",
    },
  ],
  "/grayscale-pdf": [
    {
      title: "Load your PDF",
      body: "Drop in the document. This is aimed at printed documents rather than colour images you want to keep vivid.",
    },
    {
      title: "Choose pages and quality",
      body: "Tick the pages to convert and set the resolution. Higher quality looks cleaner on paper but produces a larger file.",
    },
    {
      title: "Convert to black and white",
      body: "Press Grayscale PDF. Colours become shades of grey, which is usually enough to read a text document.",
    },
    {
      title: "Download for printing",
      body: "A greyscale file costs far less to print and often comes out smaller. Check a photo page for banding before printing the whole run.",
    },
  ],
  "/remove-pdf-metadata": [
    {
      title: "Upload the PDF",
      body: "Drop in a file you plan to send to someone else.",
    },
    {
      title: "Review what will be removed",
      body: "PDFs often carry the author name, the software that made them, the title, keywords and creation dates. None of it is needed by the person receiving the file.",
    },
    {
      title: "Strip the details",
      body: "Press Remove Metadata. The visible content is untouched — only the hidden properties are cleared.",
    },
    {
      title: "Download the clean copy",
      body: "Useful before uploading to a public form or sharing a draft that still carries your name in the properties.",
    },
  ],
  "/extract-pdf-text": [
    {
      title: "Choose your PDF",
      body: "Drop in the document you want the words from. This works on PDFs with selectable text.",
    },
    {
      title: "Pick the pages",
      body: "Run the whole document or just a section. Text-only pages convert fastest.",
    },
    {
      title: "Extract the text",
      body: "Press Extract Text. The words are pulled out in reading order, one line per row as they appear on the page.",
    },
    {
      title: "Download the .txt file",
      body: "Open it in any text editor. Scanned images have no text layer, so those come out empty — OCR is not part of this tool.",
    },
  ],
  "/ai-summarizer": [
    {
      title: "Upload your PDF",
      body: "Drop in the document you want shortened. Longer documents produce a more detailed summary.",
    },
    {
      title: "Choose what to include",
      body: "Pick key points, main topics, or the reading time estimate — or all three, depending on how much detail you need.",
    },
    {
      title: "Generate the summary",
      body: "Press Generate. The text of your PDF is sent to the AI provider to produce the summary, so check that you are comfortable with that before running it.",
    },
    {
      title: "Read and copy",
      body: "Review the result against the original, especially for figures and numbers, which are the part AI summaries most often get wrong.",
    },
  ],
  "/ai-chat": [
    {
      title: "Upload your PDF",
      body: "Drop in the document you want to ask about. Scanned pages without a text layer will give weak answers.",
    },
    {
      title: "Ask your question",
      body: "Type it in plain language, the way you would ask a colleague. Questions about specific pages work best.",
    },
    {
      title: "Read the answer against the page",
      body: "Answers are drawn from your document, but the wording is generated. Check anything important against the original before you rely on it.",
    },
    {
      title: "Keep asking",
      body: "The conversation stays on this document, so follow-up questions work without re-uploading anything.",
    },
  ],
  "/multi-pdf-chat": [
    {
      title: "Add up to five PDFs",
      body: "Drop in two, three or five files. Every one you add is named on screen so you can see exactly what the answer will be drawn from. Scans need OCR first, and password-protected files will be refused with an explanation.",
    },
    {
      title: "Start asking questions",
      body: "Press Start asking questions to read the files, then type your question in plain language — or use one of the four suggested actions, which ask about every document at once.",
    },
    {
      title: "Check the sources under each answer",
      body: "Each answer is followed by the documents it came from, and a page number where one could be identified. Open that page before you rely on anything: the wording is generated even when the source is correct.",
    },
    {
      title: "Follow up without re-uploading",
      body: "The conversation stays on this set of documents, so you can narrow in with follow-up questions. Change documents starts over with a different set.",
    },
  ],
  "/study-mode": [
    {
      title: "Upload one document",
      body: "A lecture, a chapter, a paper, a set of notes. This is one upload, not four — the summarizer, notes, quiz and flashcard pages all still exist separately if you only want one of them.",
    },
    {
      title: "Pick a size and a difficulty",
      body: "5, 10 or 20 questions or cards, and Easy, Medium or Hard. Ten is a reasonable default for a single sitting. If you are revising for an exam, Hard and 20 are worth the wait.",
    },
    {
      title: "Work through the four tabs",
      body: "Summary to know what you are dealing with, notes to revise from, questions to test yourself on, flashcards for quick recall. Each tab is generated by its own request, so “Generate” on an empty tab makes exactly what that tab needs rather than a thin slice of everything.",
    },
    {
      title: "Check the explanations",
      body: "Every question carries an explanation naming the part of the document it came from. That is the part worth using — it lets you confirm an answer instead of accepting it. If something is not in your document, that is a real failure worth noticing.",
    },
  ],
  "/ai-quiz": [
    {
      title: "Upload a document",
      body: "Use a PDF that covers material you actually want to be tested on — lecture notes, a chapter, a set of notes.",
    },
    {
      title: "Choose the question types",
      body: "Multiple choice is the quickest to mark, true/false checks understanding, and short answer tests recall more strictly.",
    },
    {
      title: "Generate the quiz",
      body: "Press Generate Quiz. The extracted text goes to the AI provider, which writes the questions against it.",
    },
    {
      title: "Work through it",
      body: "Take the quiz, then check your answers. Treat anything the AI marked wrong with suspicion before you revise from it.",
    },
  ],
  "/ai-notes": [
    {
      title: "Upload your PDF",
      body: "Drop in a chapter, article or set of notes. Longer inputs give a more complete set of notes.",
    },
    {
      title: "Set the depth",
      body: "Short gives you the headline points, standard adds structure and detail, and detailed is for dense material you need properly summarised.",
    },
    {
      title: "Build the notes",
      body: "Press Generate Notes. The text of your document is sent to the AI provider to be turned into structured notes.",
    },
    {
      title: "Edit before you rely on it",
      body: "Check definitions and any figures against the source. Generated notes compress well but can lose nuance.",
    },
  ],
};

/** Steps for a tool, or an empty list when a tool has none written yet. */
export function howToFor(href: ToolHref): { title: string; body: string }[] {
  return HOW_TO[href] ?? HOW_TO_BATCH_A[href] ?? HOW_TO_BATCH_B[href] ?? [];
}
