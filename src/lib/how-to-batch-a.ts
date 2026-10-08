import type { ToolHref } from "./tools";

/** How-to steps for the tools in batch A. Merged into HOW_TO by how-to.ts. */
export const HOW_TO_BATCH_A: Partial<Record<ToolHref, { title: string; body: string }[]>> = {
  "/redact-pdf": [
    {
      title: "Open the document you want to share",
      body: "Drop the PDF onto the page and a page preview appears in the tab. Every page can be viewed one at a time, so you can find the sensitive lines before drawing anything.",
    },
    {
      title: "Drag a box over each sensitive detail",
      body: "Click and drag across the text to cover it — a PAN number, an account number, a phone line, a signature. Zoom in first, and overshoot the ends of the string rather than stopping short of them.",
    },
    {
      title: "Step through the remaining pages",
      body: "Use the page controls to move on and keep covering anything identifying. Earlier boxes stay where you drew them, so you can build up a full set of marks across the document in one pass.",
    },
    {
      title: "Apply the redaction and check the result",
      body: "Press Redact PDF and each mark becomes an opaque black rectangle. Scroll back over the pages you marked to confirm nothing important is half-covered before you download the file.",
    },
    {
      title: "Understand what the cover actually does",
      body: "The rectangle hides content from view but does not remove it from the file. If a recipient pulls up the text layer, the words underneath can still be there, so treat this as a visual mask rather than a secure deletion.",
    },
  ],
  "/protect-pdf": [
    {
      title: "Choose the PDF to encrypt",
      body: "Drop the file onto the page. Nothing is read yet — you still get a chance to set passwords and permissions before the protection is written into the document.",
    },
    {
      title: "Type the password that opens the file",
      body: "This is the one someone must enter just to view the document, and the button stays disabled until it has at least one character. Use something long; AES-256 is only as strong as the password you choose.",
    },
    {
      title: "Set an owner password as well",
      body: "The second field is optional but worth filling. Without an owner password, a PDF utility can strip the permission flags without knowing anything, because nothing is guarding them.",
    },
    {
      title: "Decide what an opener may do",
      body: "Four presets are available: allow everything, allow printing, allow copying, or block printing, copying and editing together. These are deterrent flags rather than encryption, so they discourage casual reuse rather than protecting content.",
    },
    {
      title: "Apply the password and verify it",
      body: "Press the button and the result panel confirms AES-256 and the permission set. Open the downloaded file once and make sure you can still read it before sending it on — an unreadable attachment is an easy mistake.",
    },
  ],
  "/unlock-pdf": [
    {
      title: "Load the locked PDF",
      body: "Upload the file that will not open normally. If it is already fine, there is nothing to do — a file without encryption passes straight through and comes back unchanged.",
    },
    {
      title: "Enter the password it was set with",
      body: "Type the password into the single field provided. A wrong password fails immediately and leaves the encrypted file exactly as it was, so you can try again without losing anything.",
    },
    {
      title: "Remove the password and permission flags",
      body: "Press the unlock button and the document is rewritten without its password. The owner password goes too, which means the restrictions on printing or copying come off along with it.",
    },
    {
      title: "Check the freed copy opens cleanly",
      body: "The result panel confirms the password was removed. Open the downloaded file in Acrobat or your phone's reader to be certain it opens with no prompt before you rely on it.",
    },
    {
      title: "Know when unlocking is the wrong move",
      body: "This only works on a file whose password you already know. It cannot recover a password you have forgotten, and using it on someone else's encrypted document without their permission is not a legal shortcut in most places.",
    },
  ],
  "/ocr-pdf": [
    {
      title: "Upload the scan",
      body: "Drop in a scanned PDF and the pages appear as thumbnails. A scan is a photograph of a document, so its words are visible to you but invisible to anything trying to search or copy them.",
    },
    {
      title: "Tick the image-only pages",
      body: "All pages are selected to begin with. Clear the tick on any page that already has a real text layer, because those are detected and passed through untouched rather than being read again.",
    },
    {
      title: "Run the recognition",
      body: "Press Make PDF Searchable. English text is read on your device and drawn back onto the page invisibly, lined up over the letters in the image, so the scan still looks exactly the same.",
    },
    {
      title: "Read the confidence score",
      body: "The result panel shows how many pages were read, how many already had text, and an overall confidence figure. Low confidence usually points to a small, blurry or skewed scan that is worth re-scanning at a higher resolution.",
    },
    {
      title: "Test the output before relying on it",
      body: "Open the result and use Ctrl+F to search for a word you know is on a page. Searching is the real proof: if the text layer landed correctly, matches will jump to the right spots.",
    },
  ],
  "/pdf-to-word": [
    {
      title: "Upload the PDF you need to edit",
      body: "Drop the file onto the page and its pages are listed with thumbnails. Only pages with a genuine text layer convert well; a scanned page arrives as an empty shell.",
    },
    {
      title: "Select the pages to convert",
      body: "Every page starts ticked. Clear any you do not need, or untick a scanned page entirely so the result does not contain a blank-looking page with nothing in it.",
    },
    {
      title: "Convert and wait for the document",
      body: "Press the convert button and the layout is rebuilt as a .docx file. The result panel reports pages converted, how many headings were detected, and any pages that were skipped.",
    },
    {
      title: "Expect to tidy up afterwards",
      body: "A PDF records where each block of text sits, not what role it plays, so column order and paragraph breaks are approximations. Expect to fix spacing, and check any table that spanned a page break.",
    },
    {
      title: "Reflow the document to taste",
      body: "Download the .docx and open it in Word, Google Docs or LibreOffice. From there you can restyle headings properly, fix any misordered columns and export to PDF again if the layout needs tidying.",
    },
  ],
  "/word-to-pdf": [
    {
      title: "Add a .docx file",
      body: "Upload a Word document in the modern .docx format, up to 50 MB. Older .doc files need saving to .docx in Word first, since the older format stores layout very differently.",
    },
    {
      title: "Check which file is selected",
      body: "Added documents appear in a list with a remove button. Only the first file is converted, so if several slipped in, remove the extras before pressing convert to avoid converting the wrong one.",
    },
    {
      title: "Run the conversion",
      body: "Press convert and the document is laid out into pages in the browser. Progress is shown as it goes, and the whole file is processed on your device rather than on a server.",
    },
    {
      title: "Read the page and image counts",
      body: "The result panel tells you how many pages came out and how many images were carried across. An unexpected page count is usually a wide table or a large image forcing an extra break.",
    },
    {
      title: "Spot-check before sending it on",
      body: "Download the PDF and open it. Page breaks are approximated from the Word flow, so footers, floating text boxes and columns are the places most likely to have shifted slightly.",
    },
  ],
  "/pdf-to-excel": [
    {
      title: "Upload the PDF holding the table",
      body: "Drop the file onto the page. The tables are found by looking at where text sits in lines and columns, so a well-aligned table extracts almost perfectly and a jumbled one does not.",
    },
    {
      title: "Choose the pages to pull from",
      body: "Pages are listed with tick boxes. Include only the pages where the table actually sits, since a page with two separate tables will produce two separate sheets.",
    },
    {
      title: "Run the extraction",
      body: "Press convert and each detected table becomes its own worksheet in a .xlsx workbook. The result panel shows how many tables were found, the longest and widest of them, and how many pages had no text at all.",
    },
    {
      title: "Understand what a row means",
      body: "Header rows are carried through as the first row of cells, but totals lines and merged cells sometimes arrive as ordinary data. Check the column count against the sheet before doing anything with the numbers.",
    },
    {
      title: "Do the maths in Excel, not here",
      body: "Download the workbook and use it like any other spreadsheet file. Formulas, sorting and pivot tables all work normally, which is the whole point of getting the numbers out of the PDF in the first place.",
    },
  ],
  "/excel-to-pdf": [
    {
      title: "Upload the workbook",
      body: "Choose an .xlsx or .xls file. The sheet names are read from the workbook itself, so you will see the real tabs listed rather than guessing at how the file is organised.",
    },
    {
      title: "Pick which sheets to include",
      body: "All sheets is the default and every one starts on a fresh page. First sheet only is useful when the rest are working tabs you never meant to hand over.",
    },
    {
      title: "Set the page orientation",
      body: "Landscape suits wide tables with many columns; portrait suits tall, narrow sheets with few columns and lots of rows. Picking the wrong one is the usual reason columns get cut off.",
    },
    {
      title: "Decide how columns are handled",
      body: "Fit to page squeezes every column so nothing is clipped, which shrinks the text on very wide sheets. As it is keeps your original column widths and lets the sheet overflow or split instead.",
    },
    {
      title: "Convert and check the row count",
      body: "Press convert and the result panel reports sheets, pages and rows drawn. Compare that row count against your sheet — a much lower number means empty trailing rows were trimmed.",
    },
  ],
  "/pdf-to-png": [
    {
      title: "Upload the PDF",
      body: "Drop the file on and the page count is read straight away. If the PDF will not open at all, or is password protected, the page tells you so rather than failing silently.",
    },
    {
      title: "Specify which pages to render",
      body: "The range field defaults to every page, and accepts something like 1-4 or 1,3,7 for a scattered selection. Only the pages you ask for are drawn, which saves a lot of time on a long document.",
    },
    {
      title: "Choose a resolution",
      body: "High resolution doubles the scale and is worth it for cropping or printing; Balanced is sharp on screen at a sensible file size; Lightweight is for quick sharing. Larger always means a much bigger PNG.",
    },
    {
      title: "Run the conversion",
      body: "Press convert and each selected page comes back as a separate PNG. A single page downloads as one file; several pages arrive together in a zip.",
    },
    {
      title: "Know what you get",
      body: "The background is drawn white, exactly as the page looks when you open it, so the PNG is not transparent. Lossless PNG also means a page is usually several times larger than the same page exported as a JPG.",
    },
  ],
  "/image-to-text": [
    {
      title: "Add up to 30 images",
      body: "Drop in photos, screenshots or scans together in one go. All of them are read in a single run and end up in one text file, in the order they were added.",
    },
    {
      title: "Choose the output format",
      body: "Plain text gives you just the words with nothing else. Markdown wraps each image in its own heading, which is the one to pick if you photographed several pages and need to tell them apart later.",
    },
    {
      title: "Run the recognition",
      body: "Press convert and the text is read on your device. The result panel reports images read, word and character counts, and the recogniser's own confidence score for the run.",
    },
    {
      title: "Treat low confidence as a warning",
      body: "A clean, straight, evenly lit shot of typed text scores high and is usually accurate. Anything lower deserves a check before you trust it — one wrong digit in an invoice total matters more than the effort to verify it.",
    },
    {
      title: "Help the recogniser with tricky pages",
      body: "An angled photo turns every letter into a slightly different shape, and a two-column page may be read across rather than down. Shoot straight-on, or split a column into its own image and run it separately.",
    },
  ],
  "/fill-pdf-form": [
    {
      title: "Upload the form",
      body: "Drop in the PDF and the real form fields are read from the file. Text boxes, check boxes and radio buttons that were built in as actual form objects show up; drawn-on boxes do not.",
    },
    {
      title: "Work through the detected fields",
      body: "Each field appears with the name the PDF gave it, which is often something like given_name or address_2 rather than a human label. Type into the boxes and tick the check boxes and radios that apply.",
    },
    {
      title: "Fill what the form asks for",
      body: "Signature fields work only when they are genuine signature form objects. A signature line drawn on the page cannot be signed here, so print and sign that one by hand if it matters.",
    },
    {
      title: "Submit the filled document",
      body: "The values are written into the fields themselves, not typed over an image, so the result is a real filled PDF that other software can read back. Download it and keep it, as the page resets after each run.",
    },
  ],
  "/highlight-pdf": [
    {
      title: "Pick a highlight colour",
      body: "Four swatches are offered: yellow, green, blue and pink. Yellow is the familiar one; blue or green help when a document already uses another mark, or when the highlight has to survive being printed in black and white.",
    },
    {
      title: "Upload the document",
      body: "Drop the PDF on and the page preview loads. You can zoom in before drawing so the highlight sits over the words rather than half over the line above.",
    },
    {
      title: "Drag across the text to mark",
      body: "Draw over a sentence or a clause and a mark is placed. This is a translucent overlay, so the text underneath stays readable and can still be searched and copied — the opposite of redacting.",
    },
    {
      title: "Move through every page",
      body: "The previous and next page buttons at the bottom of the canvas take you onward, and marks you have already placed stay exactly where you left them. Keep going until the document is marked.",
    },
    {
      title: "Apply the highlights and download",
      body: "Press the action button and you get standard PDF highlight content, which Acrobat, most readers and printers all display. Some tools that redraw pages from scratch, such as Slideshare exports, drop the overlay.",
    },
  ],
  "/repair-pdf": [
    {
      title: "Upload the file that will not open",
      body: "Drop in a PDF that throws an error, opens blank, or refuses to load at all. If the file is fine, this returns your copy unchanged rather than making it worse.",
    },
    {
      title: "Run the repair",
      body: "Press the repair button and the broken cross-reference table and page structure are rebuilt, then every page that still parses is written back out into a clean new document.",
    },
    {
      title: "Compare the page counts",
      body: "The result panel shows how many pages survived against the size of the original. A page count that has dropped is the warning sign that part of the file was unreadable and had to be skipped.",
    },
    {
      title: "Open the repaired copy everywhere",
      body: "Download it and test it in a second reader or on your phone, not just the one that repaired it. A file that works in one reader and fails in another is usually still damaged further down.",
    },
    {
      title: "Keep the original for a real fix",
      body: "Repair recovers what it can; it cannot invent content. If pages are genuinely missing or an encrypted file will not open, you will need the source document, not a rebuilt copy of a broken one.",
    },
  ],
  "/pdf-to-markdown": [
    {
      title: "Upload a PDF with real text",
      body: "Drop the file on and the pages are listed. This reads the text layer, it does not recognise characters in pictures, so scanned pages will come out empty.",
    },
    {
      title: "Tick the pages you need",
      body: "Everything starts selected. Large documents are slow in the browser, so untick the sections you do not need and convert a few pages at a time if a long file stalls.",
    },
    {
      title: "Convert and check for gaps",
      body: "Press the convert button and you get a standard .md file. Pages with no text layer are listed in a comment at the end, which tells you exactly what is missing rather than leaving you to guess.",
    },
    {
      title: "Expect headings to be inferred",
      body: "A PDF records position, not meaning, so headings are guessed from short lines that do not end in punctuation. Clean reports convert well; magazine layouts with pull quotes and sidebars convert approximately.",
    },
    {
      title: "Take the file somewhere useful",
      body: "The output is plain .md that opens in any text editor and pastes cleanly into Obsidian, Notion, a blog editor or a static site generator, giving you clean text instead of a page of frozen layout.",
    },
  ],
};
