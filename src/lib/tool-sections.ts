import type { ToolHref } from "./tools";

export interface ToolSection {
  /** A distinct H2/H3-style heading, phrased as the reader's question or as the sub-topic. */
  heading: string;
  /** One short paragraph of real, specific content. 30-60 words. */
  body: string;
}

/** Per-tool sub-sections, so no two tool pages share the same heading set. */
export const TOOL_SECTIONS: Partial<Record<ToolHref, ToolSection[]>> = {
  "/compress-pdf": [
    {
      heading: "Why is my PDF so large in the first place?",
      body: "Nine times out of ten it is images. A single page scanned at 300 dpi with colour photographs can weigh more than a hundred pages of text. Flattened PDFs, embedded fonts duplicated per page and leftover editing data all add up too, which is why even a text-only file can be surprisingly heavy.",
    },
    {
      heading: "How much can compression realistically save?",
      body: "Scans and photo-heavy documents often drop by 60 to 90 percent. A PDF that is mostly live text is already compact, so expect a modest saving at best — if a text-only file is huge, something is embedded in it worth looking at before you settle for a small gain.",
    },
    {
      heading: "Strong, Recommended or Basic — which should I pick?",
      body: "Strong is for hitting a hard email attachment limit, and images get visibly recompressed. Recommended suits almost every scan. Basic keeps fonts and vector art crisp and only touches embedded images, which is the right choice when the text must stay sharp for printing.",
    },
  ],
  "/merge-pdf": [
    {
      heading: "Does merging re-encode my pages?",
      body: "No. Pages are copied across at their original size and quality, with their fonts and images untouched. The only thing that changes is the page count and the document-level structure, so merging a file you already compressed will not undo the compression.",
    },
    {
      heading: "What happens to bookmarks and internal links?",
      body: "They do not survive the join. Each source document keeps its own outline, but a cross-document link that pointed at page 12 of the old file now points somewhere arbitrary in the combined file. Fix navigation afterwards in a proper PDF editor if it matters.",
    },
    {
      heading: "Do the merged pages keep their mixed page sizes?",
      body: "They do. Combining an A4 report with a US Letter scan produces a document that flips size partway through, and some printers will fight it. Normalise the page size first if the result is going to a printer rather than a screen.",
    },
  ],
  "/split-pdf": [
    {
      heading: "Range versus single pages: which output do I need?",
      body: "One new PDF collects every page you pick into a single file, which is what you want for lifting a chapter out of a manual. Separate files turns each chosen page into its own one-page PDF delivered in a zip, handy when a counterparty asks for individual exhibits.",
    },
    {
      heading: "How do I choose non-contiguous pages?",
      body: "You can take pages 1, 2 and 5 while leaving 3 and 4 behind — the picker treats your selection as a set, not a span. Pages always come out in their original order, so the sequence never scrambles even if you ticked them out of sequence.",
    },
    {
      heading: "Can I split a PDF that is password protected?",
      body: "No. Encryption has to be removed before any page can be copied out, so unlock the document first and then split the clean copy. Doing it in that order also avoids you re-applying the password to every fragment afterwards.",
    },
  ],
  "/pdf-to-jpg": [
    {
      heading: "Which quality setting should I use?",
      body: "Balanced is right for anything you will view on a screen. High quality matters when you need to read small print or crop into the image later, at the cost of much larger files. Small files are for firing a page off over a chat app and nothing more.",
    },
    {
      heading: "Do I get one image or one per page?",
      body: "Convert a single page and you receive a single JPG. Convert several and each page becomes its own image, delivered together in a zip. That distinction matters if you planned to email one picture of a whole spread.",
    },
    {
      heading: "Why did my converted page look blurry or cropped?",
      body: "Quality settings change how hard the page is resampled, not its aspect ratio — pages always come out whole. If the text looks soft, the original scan was low resolution to begin with and no export setting can recover detail that was never captured.",
    },
  ],
  "/jpg-to-pdf": [
    {
      heading: "A4, Letter or Fit to image — what should I pick?",
      body: "A4 is the default almost everywhere outside North America, and Letter is the equivalent in the US and Canada. Fit to image makes each page exactly the shape of the picture, which suits photo galleries and screenshots but produces an oddly sized, non-standard document.",
    },
    {
      heading: "Why does my photo end up with white space around it?",
      body: "On a fixed page size the image is scaled to fit and centred, so a landscape shot on a portrait page leaves wide margins. Turn on the margin option to shrink that border, or switch the page size to Fit to image so the photo fills the page instead.",
    },
    {
      heading: "Will my PDF from these photos be searchable?",
      body: "No. Images pasted onto a page carry no text layer, so the resulting PDF cannot be searched or selected from. Run it through the OCR tool afterwards if you need the words to come out as text rather than as pictures of words.",
    },
  ],
  "/rotate-pdf": [
    {
      heading: "Can I rotate only the sideways pages?",
      body: "Yes. Every page is ticked by default so a document-wide fix is one click, but clear the selection and tick just the scans that came out at an angle. Mixed-orientation documents are extremely common after a phone camera and a flatbed scanner have both been used.",
    },
    {
      heading: "Why is the file size barely different afterwards?",
      body: "Rotation only changes an orientation flag stored per page. The page content itself is never touched or re-encoded, so the images inside stay at exactly the quality they arrived with and the byte count barely moves.",
    },
    {
      heading: "Which way does 90 degrees actually turn the page?",
      body: "Right is a quarter turn clockwise, left is anticlockwise, and 180 flips the page upside down without mirroring it. If a page still looks wrong after rotating, it was probably scanned mirrored rather than rotated, and rotation will not correct that.",
    },
  ],
  "/rearrange-pdf-pages": [
    {
      heading: "Can I put the pages in any order I like?",
      body: "You choose the sequence freely — collate a batch of scanned pages, put a cover at the front, or move an appendix ahead of its references. Nothing is re-ordered automatically behind your back, so what you set is what you get.",
    },
    {
      heading: "What about a table of contents that stops matching?",
      body: "Page numbers printed in the footer travel with their pages, so moving a page leaves its printed number in the wrong place. Internal links and bookmarks that jumped to a page number may also land off target. Update the numbering afterwards if either applies.",
    },
    {
      heading: "Should I fix the scan order or the reading order?",
      body: "They are different problems. A duplex scan often interleaves the odd and even sides; a mis-sequenced document needs those separated first, then possibly a reversed booklet order applied. Decide which fault you have before rearranging, or you will do it twice.",
    },
  ],
  "/delete-pdf-pages": [
    {
      heading: "Do the kept pages stay exactly as they were?",
      body: "Yes. Remaining pages are copied across untouched, in their original order and at their original quality, with nothing re-encoded or resized. The only visible consequence is that the document has fewer pages, so the numbering runs shorter.",
    },
    {
      heading: "Does deleting a page renumber the rest?",
      body: "The pages you remove leave no gaps — page 5 of a ten-page document becomes page 4 once page 3 goes. Printed page numbers already burned into the footer do not update, so a formal document with fixed numbering will need those corrected by hand.",
    },
    {
      heading: "Can I delete every page by accident?",
      body: "You can untick everything, and the result would be a PDF with no pages, which is why the action stays unavailable until at least one page remains selected. Keep the original until you have opened the shortened file and confirmed it is what you wanted.",
    },
  ],
  "/extract-pdf-pages": [
    {
      heading: "Extracting versus deleting — what is the actual difference?",
      body: "Extraction builds a new document from the pages you tick and discards everything else. Deletion does the opposite: it keeps the whole file minus the pages you tick. The two produce the same output only when together they account for every page.",
    },
    {
      heading: "How large can the extracted file get?",
      body: "Its pages carry their original embedded images, so extracting a handful of photo-heavy pages can still produce a multi-megabyte file. Compress it afterwards if the destination has an upload limit, rather than assuming the smaller page count means a smaller file.",
    },
    {
      heading: "Will the extracted pages still open correctly on their own?",
      body: "Yes, pages are copied at full quality with their fonts, images and page size intact. Internal hyperlinks pointing to pages you left behind are the one thing that will not survive, since those targets are no longer inside the new document.",
    },
  ],
  "/add-page-numbers": [
    {
      heading: "Can I start numbering from something other than one?",
      body: "Set any whole starting number and the first selected page is labelled with it. That solves the awkward case where page 1 is a cover you want left unnumbered, and the body of the document should read 1 onwards from the second physical sheet.",
    },
    {
      heading: "What happens to the original page content?",
      body: "Everything already on the page is preserved. The tool adds a small text label at the corner you choose and nothing else, so a scanned page keeps its exact appearance and the file size moves only by the few kilobytes the label adds.",
    },
    {
      heading: "Which corner should the number sit in?",
      body: "Bottom centre matches most books and reports. Bottom right is the common choice for loose documents because it mirrors the page count. Where a cover or a graphic already occupies the corner, tick that page off rather than trying to nudge the label.",
    },
  ],
  "/watermark-pdf": [
    {
      heading: "How faint should a watermark be?",
      body: "Opacity runs from 0.05 to 1, and the default sits around 0.22 — visible enough to signal ownership but faint enough to read through. A DRAFT or CONFIDENTIAL mark benefits from being stronger than a routine ownership label, because its job is to stop the wrong copy circulating.",
    },
    {
      heading: "What angle should I use for a diagonal mark?",
      body: "Around -35 degrees is the familiar look for draft and review copies, because it crosses both halves of a page and resists cropping. Horizontal suits wide tables, and vertical works for narrow portrait formats where a diagonal would fall off the edge.",
    },
    {
      heading: "Can I keep some pages completely clean?",
      body: "Yes, pages are individually selectable and all start ticked. Leave the cover, a table of contents or a signed final page unmarked, which looks far more professional than watermarking every single sheet identically.",
    },
  ],
  "/sign-pdf": [
    {
      heading: "Where exactly does the signature land?",
      body: "Near the lower-right corner of each selected page you tick, scaled to suit typical document layouts. That is where signature blocks usually sit, so a multi-page contract can be signed in one pass rather than page by page.",
    },
    {
      heading: "Is a drawn signature the same as a digital signature?",
      body: "No. This produces a visual signature drawn onto the page as an embedded image, which matches how a paper signature looks but carries no cryptographic guarantee. Anyone with an image editor can lift it. Use a proper certificate-based signing tool when tamper-evidence is required.",
    },
    {
      heading: "How do I get a clean signature from a trackpad or finger?",
      body: "Sign on a flat surface rather than a lap, and use a stylus or the edge of your hand as a rest to stop wobble. Slow strokes beat fast scribbles, and clearing and starting again costs nothing if the first attempt looks cramped.",
    },
  ],
  "/ocr-pdf": [
    {
      heading: "Will this work on a scanned document?",
      body: "That is exactly what it is for. A clean typed scan reads roughly 95 percent of words correctly and the tool reports the confidence it reached. It struggles the way any scanner does: faint contrast, crooked pages, small print in dense tables and decorative fonts.",
    },
    {
      heading: "How much can I realistically expect to save?",
      body: "A page photographed on a phone at an angle loses several percent to deskewing alone, and handwriting drops much further. Skewed, low-contrast or double-scanned pages are the common failure cases — if accuracy matters, re-scan them flat and straight before running OCR.",
    },
    {
      heading: "What does the confidence score actually tell me?",
      body: "It reflects how sure the recogniser was across the text it read, not how correct the output is. A high score on a page of unusual fonts can still contain errors, so spot-check names, numbers and dates before relying on the searchable output.",
    },
  ],
  "/pdf-to-word": [
    {
      heading: "Why does my Word file not look identical to the PDF?",
      body: "PDF records where glyphs sit on the page; Word re-flows content into a live layout. Multi-column layouts, footnotes and text boxes all have to be rebuilt as Word structures, so spacing will shift and complex pages will never match the original exactly.",
    },
    {
      heading: "Which elements get lost in the conversion?",
      body: "Interactive form fields, embedded files, annotations and some vector graphics do not survive. Headings are detected and carried across where they can be inferred, which is what the result screen counts, but visual styling is approximated rather than copied.",
    },
    {
      heading: "It says no text was found — what now?",
      body: "That message means the PDF is image-only, which is the normal output of a scanner or a phone camera. Run it through the OCR tool first to build a text layer, then convert that result and the words will come through as editable text.",
    },
  ],
  "/word-to-pdf": [
    {
      heading: "Why has my layout drifted from the Word version?",
      body: "Word's layout engine is not reproduced exactly. Fonts installed on your machine but absent in the converter get substituted, and spacing, bullets and table widths all shift slightly as a result. Install the fonts you care about, or expect an approximation.",
    },
    {
      heading: "Do images and tables survive the export?",
      body: "Images are carried across and the result screen counts how many were kept. Tables are redrawn from their cell structure, so they hold together and stay editable, though very wide or heavily merged tables can lose some of their original geometry.",
    },
    {
      heading: "Which Word files are accepted?",
      body: "The modern .docx format, up to 50 MB. Legacy .doc files are a different binary format and are not supported — open them in Word and save as .docx first if you have an old file that needs converting.",
    },
  ],
  "/pdf-to-excel": [
    {
      heading: "How does it decide where the columns start?",
      body: "It reads the text positions of each cell and looks for vertical bands of alignment across several rows, so it anchors on the numbers rather than on ruled lines. A table with no visible borders is handled better than one drawn as a set of merged boxes with no text grid.",
    },
    {
      heading: "Do the values stay as numbers?",
      body: "Yes, values that parse cleanly are written as numbers and dates, so you can sort and total them straight away. Anything with mixed content in a column — a stray note, a currency symbol, two values in one cell — is kept as text to avoid corrupting it.",
    },
    {
      heading: "Why were no tables found on this page?",
      body: "Usually because the page is a scan with no text layer, or the layout is a form rather than a grid. OCR the document first, or accept that the table cannot be recovered automatically and copy the figures across by hand.",
    },
  ],
  "/excel-to-pdf": [
    {
      heading: "What happens to a sheet wider than the page?",
      body: "Fit to page squeezes the columns so nothing is cut off, at the cost of small text that may be hard to read when printed. As it is keeps your column widths and lets wide sheets spill onto extra pages, which keeps the text legible but fragments the layout.",
    },
    {
      heading: "Why do my formulas appear as text?",
      body: "The workbook is read as values, not calculated. A cell showing a formula is exported using its cached result, and any cell where that result was never stored — a formula added and never opened in Excel — comes through as raw formula text instead.",
    },
    {
      heading: "Do dates and numbers come out right?",
      body: "They do, formatted using the cell's own display format so a currency column keeps its symbols and a date column keeps its pattern. Formats Excel applies only visually through conditional formatting are not reproduced in the PDF.",
    },
  ],
  "/pdf-to-png": [
    {
      heading: "PNG versus JPG — why would I pick this one?",
      body: "PNG is lossless and keeps sharp text edges and screenshots crisp, while JPG is far smaller for photographic pages. Choose PNG when you will crop, zoom or drop the image into a design tool, and JPG when the page is a photo and file size matters more.",
    },
    {
      heading: "How does the resolution setting work?",
      body: "High resolution renders at twice the base scale, which is what you want for printing or cropping into detail. Balanced is sharp on a screen with a sensible file size, and Lightweight is for quick uploads where you will not be enlarging anything.",
    },
    {
      heading: "Is the text in the resulting image selectable?",
      body: "No, and nothing can make it so — a raster image has no text layer by definition. If you need searchable or editable output, extract the text from the PDF itself rather than trying to read words back out of a PNG.",
    },
  ],
  "/image-to-text": [
    {
      heading: "What kind of picture does this read most reliably?",
      body: "A flat, straight-on photo of printed text in a plain font. Contrast matters more than resolution, so a slightly dark but perfectly straight page beats a high-resolution shot taken at an angle, which the reader has to deskew before it can make sense of the lines.",
    },
    {
      heading: "Can it do handwriting?",
      body: "Occasionally, on neat short words. Cursive, joined-up script and anything written quickly will come back as approximations or missing lines. Typed documents are the reliable case; treat anything handwritten as a draft to check rather than a transcript to trust.",
    },
    {
      heading: "What happens with a two-column page?",
      body: "Reading order can jump between columns, so the extracted text may interleave left and right lines. One column at a time in separate crops gives a far cleaner result than trying to untangle the whole page afterwards.",
    },
  ],
  "/redact-pdf": [
    {
      heading: "Why a black box is not real redaction",
      body: "The rectangle hides content from view but the underlying characters remain in the file. If a recipient opens the PDF and pulls up the text layer, the words underneath can still be there, so treat this as a visual mask rather than a secure deletion.",
    },
    {
      heading: "How do I make sure nothing is half-covered?",
      body: "Zoom in before drawing and overshoot both ends of every string you are hiding, because a box that stops a character short leaves it readable. After applying, scroll back over each marked page and check that no fragment of a name or number peeks out at an edge.",
    },
    {
      heading: "Why does the redaction look odd in some apps?",
      body: "Different viewers draw annotations differently, and some previewers ignore the mark entirely, showing the original page underneath. Check the downloaded file in the same reader your recipient will use, rather than trusting a thumbnail from your own browser.",
    },
  ],
  "/protect-pdf": [
    {
      heading: "What is the difference between the two passwords?",
      body: "The first is the user password — the one someone must type just to open the document. The second is the owner password, which guards the permission flags and stops a utility stripping them. Without an owner password those flags can be removed by anyone with a PDF editor.",
    },
    {
      heading: "Does a password stop a determined attacker?",
      body: "No. AES-256 is only as strong as the password you choose, and it protects the file at rest rather than stopping anyone who receives it. Use a long passphrase; anything short can be cracked offline at a rate no one would want to publish.",
    },
    {
      heading: "Which permission level should I pick?",
      body: "Allow printing is a sensible middle ground for a document people need but should not edit. Allow neither blocks printing, copying and editing at once, which breaks copy-paste even for a reader who legitimately wants the text. Allow everything only adds the encryption.",
    },
  ],
  "/unlock-pdf": [
    {
      heading: "Can this guess or crack the password?",
      body: "No, and nothing reasonably can. You must already know the password that opens the document — this tool removes protection from a file you legitimately hold, it does not recover a lost one from a colleague's locked archive.",
    },
    {
      heading: "Which password do I type?",
      body: "The one required to open the file, not the owner password used to guard permissions. If the document opens without a prompt at all, it was never encrypted and the tool will tell you there was nothing to remove.",
    },
    {
      heading: "Does removing protection damage the document?",
      body: "The pages, images and fonts are copied through unchanged, so quality and layout are unaffected. The file does become unprotected, so do the unlocking, share the copy you need and put the original away rather than passing it on unlocked.",
    },
  ],
  "/fill-pdf-form": [
    {
      heading: "Which forms can actually be filled in?",
      body: "Only PDFs with real interactive AcroForm fields — the boxes, dropdowns and radio buttons a form designer created. A form that is just a printed layout with lines drawn on it has nothing to click, and the tool will report that no fields were found.",
    },
    {
      heading: "Why is my filled-in form not reusable later?",
      body: "Filling the fields writes your values into the document, but it does not save a blank template with your answers as defaults. Keep the original untouched as the blank, or use a form tool that supports save-and-reuse if you complete the same form repeatedly.",
    },
    {
      heading: "What about a field that asks for a signature?",
      body: "A signature line is usually just a drawn box on the page, not a fillable field, so this tool leaves it alone. Add the signature separately after filling everything else, using the signing tool on the exported document.",
    },
  ],
  "/highlight-pdf": [
    {
      heading: "What is a highlight actually made of?",
      body: "A translucent colour rectangle drawn over the text, not a change to the characters themselves. That is why the words stay readable underneath and remain selectable and searchable, exactly as they were in the original.",
    },
    {
      heading: "Why did my highlight appear on the wrong lines?",
      body: "You drew across the region you wanted, and the tool maps that area back to the nearest text line, so very tightly spaced or multi-column text can land the mark one line out. Narrow the box to sit on the single line you mean, and check the result before saving.",
    },
    {
      heading: "Will the colour survive on an e-reader?",
      body: "Usually, because it is drawn as an annotation into the page rather than as part of the bitmap. Some readers that flatten annotations on import will drop the colour, and PowerPoint will not retain it at all. Check the file where it is actually going to be used.",
    },
  ],
  "/edit-pdf": [
    {
      heading: "How do I work out where to put the coordinates?",
      body: "The origin is the bottom-left corner of the page, y increases upward, so a box near the top of the sheet needs a large y. Think of it as measuring up from the bottom edge in points — one point is one seventy-second of an inch, so a typical body position is around y 700 to 780.",
    },
    {
      heading: "Why did my text come out as question marks or blanks?",
      body: "Only the standard Helvetica fonts are available, and characters outside the Latin alphabet — Urdu, Chinese, Arabic, many symbols — cannot be drawn. English and other Latin-alphabet text renders normally; anything else silently drops out.",
    },
    {
      heading: "Can I change or delete text already in the PDF?",
      body: "No. This adds text at a position; it does not select and rewrite existing content. To correct a typo in the original, edit the source document and export again, or use a full editor that rewrites the text stream — expect to reflow anything around the change by hand.",
    },
  ],
  "/repair-pdf": [
    {
      heading: "What kinds of damaged file can be recovered?",
      body: "Broken cross-reference tables, missing end-of-file markers, damaged object offsets and slightly truncated downloads all rewrite cleanly. A file that is severely truncated, or whose page content was never fully written, can only be recovered as far as the bytes that survived.",
    },
    {
      heading: "Will the pages come back at full quality?",
      body: "Repair rebuilds the file structure, not the page content. Images, fonts and text are copied through exactly as they were, so there is no re-rendering and no quality loss — the repaired file's size tells you how much of the original survived.",
    },
    {
      heading: "Does it work on encrypted documents?",
      body: "No. Encryption sits above the file structure, so a password-protected PDF has to be unlocked before repair can make sense of it. Do that first, then repair the decrypted copy, and re-apply protection afterwards if you need it.",
    },
  ],
};

// The second half of the sections, written as a separate file so the two could
// be drafted independently. Merged here so callers have one import.
import { TOOL_SECTIONS_B } from "./tool-sections-b";

/** Per-tool sub-sections for any tool, from either half. */
export function toolSectionsFor(href: ToolHref): ToolSection[] {
  return TOOL_SECTIONS[href] ?? TOOL_SECTIONS_B[href] ?? [];
}
