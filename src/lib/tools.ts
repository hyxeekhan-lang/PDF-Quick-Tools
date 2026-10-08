export type ToolIconName =
  | "compress"
  | "merge"
  | "split"
  | "toJpg"
  | "toPdf"
  | "rotate"
  | "reorder"
  | "delete"
  | "extract"
  | "pageNumbers"
  | "watermark"
  | "sign"
  | "summarize"
  | "chat"
  | "quiz"
  | "notes"
  | "brain"
  | "wand"
  | "translate"
  | "rewrite"
  | "ask"
  | "presentation"
  | "flashcard"
  | "citation"
  | "grammar"
  | "analyze"
  | "resume"
  | "questions"
  | "crop"
  | "resize"
  | "flatten"
  | "grayscale"
  | "metadata"
  | "text"
  | "blank"
  | "header"
  | "form"
  | "redact"
  | "highlight"
  | "embed"
  | "bookmark"
  | "markdown"
  | "compare"
  | "editText"
  | "repair"
  | "lock"
  | "unlock"
  | "scan"
  | "grid";

export type ToolCategory =
  | "Organize PDF"
  | "Edit PDF"
  | "Convert"
  | "Optimize"
  | "PDF security"
  | "AI Tools";

export type ToolHref =
  | "/compress-pdf"
  | "/merge-pdf"
  | "/split-pdf"
  | "/pdf-to-jpg"
  | "/jpg-to-pdf"
  | "/rotate-pdf"
  | "/rearrange-pdf-pages"
  | "/delete-pdf-pages"
  | "/extract-pdf-pages"
  | "/add-page-numbers"
  | "/watermark-pdf"
  | "/sign-pdf"
  | "/ai-summarizer"
  | "/ai-chat"
  | "/ai-quiz"
  | "/ai-notes"
  | "/ai-pdf-translator"
  | "/ai-pdf-rewriter"
  | "/ai-ask-pdf"
  | "/ai-pdf-to-presentation"
  | "/ai-flashcard-generator"
  | "/ai-citation-generator"
  | "/ai-grammar-checker"
  | "/ai-document-analyzer"
  | "/ai-resume-analyzer"
  | "/ai-pdf-question-generator"
  | "/crop-pdf"
  | "/change-page-size"
  | "/flatten-pdf"
  | "/grayscale-pdf"
  | "/remove-pdf-metadata"
  | "/extract-pdf-text"
  | "/insert-blank-page"
  | "/add-header-footer"
  | "/fill-pdf-form"
  | "/redact-pdf"
  | "/highlight-pdf"
  | "/embed-file-in-pdf"
  | "/add-pdf-bookmarks"
  | "/pdf-to-markdown"
  | "/compare-pdf"
  | "/edit-pdf"
  | "/repair-pdf"
  | "/protect-pdf"
  | "/unlock-pdf"
  | "/ocr-pdf"
  | "/word-to-pdf"
  | "/pdf-to-word"
  | "/pdf-to-excel"
  | "/excel-to-pdf"
  | "/pdf-to-png"
  | "/image-to-text";

export interface Tool {
  href: ToolHref;
  name: string;
  /** Card / grid copy. One short sentence. */
  blurb: string;
  /** <h1> support line on the tool page. */
  subtitle: string;
  icon: ToolIconName;
  category: ToolCategory;
  title: string;
  description: string;
  popular: boolean;
}

export const TOOLS: Tool[] = [
  {
    href: "/compress-pdf",
    name: "Compress PDF",
    blurb: "Reduce PDF file size while keeping good quality.",
    subtitle: "Reduce your PDF file size in seconds.",
    icon: "compress",
    category: "Optimize",
    title: "Compress PDF — Reduce PDF File Size Online Free",
    description:
      "Compress a PDF online to make it smaller and easier to email or upload. Choose strong, recommended or basic compression. Free and no account needed.",
    popular: true,
  },
  {
    href: "/merge-pdf",
    name: "Merge PDF",
    blurb: "Combine multiple PDF files into one.",
    subtitle: "Combine several PDFs into a single file.",
    icon: "merge",
    category: "Organize PDF",
    title: "Merge PDF — Combine PDF Files Online Free",
    description:
      "Merge two or more PDF files into one document. Reorder the files before you combine them, then download the result. Free and no account needed.",
    popular: true,
  },
  {
    href: "/split-pdf",
    name: "Split PDF",
    blurb: "Extract selected pages from your PDF.",
    subtitle: "Take a page range out of your PDF.",
    icon: "split",
    category: "Organize PDF",
    title: "Split PDF — Separate PDF Pages Online Free",
    description:
      "Split a PDF by page range or pull out single pages as a new document. Pick the pages you need and download them. Free and no account needed.",
    popular: true,
  },
  {
    href: "/pdf-to-jpg",
    name: "PDF to JPG",
    blurb: "Turn PDF pages into JPG images.",
    subtitle: "Convert PDF pages into JPG images.",
    icon: "toJpg",
    category: "Convert",
    title: "PDF to JPG — Convert PDF Pages to Images Online Free",
    description:
      "Convert PDF pages into high quality JPG images. Choose the pages and the image quality, then download them one by one. Free and no account needed.",
    popular: true,
  },
  {
    href: "/jpg-to-pdf",
    name: "JPG to PDF",
    blurb: "Turn JPG and PNG images into one PDF.",
    subtitle: "Turn your images into a single PDF.",
    icon: "toPdf",
    category: "Convert",
    title: "JPG to PDF — Convert Images to PDF Online Free",
    description:
      "Convert JPG, PNG or WebP images into one PDF document. Reorder the images, pick a page size, then download the PDF. Free and no account needed.",
    popular: true,
  },
  {
    href: "/rotate-pdf",
    name: "Rotate PDF",
    blurb: "Turn pages 90, 180 or 270 degrees.",
    subtitle: "Fix sideways or upside down pages.",
    icon: "rotate",
    category: "Organize PDF",
    title: "Rotate PDF — Turn PDF Pages Online Free",
    description:
      "Rotate PDF pages by 90, 180 or 270 degrees and save the change permanently. Rotate every page or only the ones you pick. Free and no account needed.",
    popular: false,
  },
  {
    href: "/rearrange-pdf-pages",
    name: "Rearrange PDF",
    blurb: "Drag pages into the order you need.",
    subtitle: "Put your PDF pages in the right order.",
    icon: "reorder",
    category: "Organize PDF",
    title: "Rearrange PDF Pages — Reorder Pages Online Free",
    description:
      "Rearrange PDF pages online by dragging them into a new order. Your document stays in the browser and the reordered copy downloads instantly.",
    popular: true,
  },
  {
    href: "/delete-pdf-pages",
    name: "Delete Pages",
    blurb: "Remove pages you no longer need.",
    subtitle: "Remove the pages you do not need.",
    icon: "delete",
    category: "Organize PDF",
    title: "Delete PDF Pages — Remove Pages Online Free",
    description:
      "Delete pages from a PDF. See a thumbnail of every page, tick the ones to remove, and download the shorter document. Free and no account needed.",
    popular: false,
  },
  {
    href: "/extract-pdf-pages",
    name: "Extract Pages",
    blurb: "Keep only the pages you select.",
    subtitle: "Keep only the pages you choose.",
    icon: "extract",
    category: "Organize PDF",
    title: "Extract PDF Pages — Save Selected Pages Online Free",
    description:
      "Extract pages from a PDF into a new document. Pick the pages visually or by range and keep their original order. Free and no account needed.",
    popular: false,
  },
  {
    href: "/add-page-numbers",
    name: "Add Page Numbers",
    blurb: "Place clear page numbers exactly where you want them.",
    subtitle: "Add page numbers to your PDF in seconds.",
    icon: "pageNumbers",
    category: "Organize PDF",
    title: "Add Page Numbers to PDF Online Free",
    description:
      "Add page numbers to a PDF online. Choose the pages, placement and starting number. Free and no account needed.",
    popular: false,
  },
  {
    href: "/watermark-pdf",
    name: "Watermark PDF",
    blurb: "Stamp a custom text watermark onto selected pages.",
    subtitle: "Add a clear watermark to your PDF in seconds.",
    icon: "watermark",
    category: "Edit PDF",
    title: "Watermark PDF — Add Text Watermarks Online Free",
    description:
      "Add a custom text watermark to selected PDF pages. Choose the wording, size, color and angle, then download the watermarked document. Free and no account needed.",
    popular: true,
  },
  {
    href: "/sign-pdf",
    name: "Sign PDF",
    blurb: "Draw your signature and place it on selected pages.",
    subtitle: "Sign your PDF directly in the browser.",
    icon: "sign",
    category: "Edit PDF",
    title: "Sign PDF — Add Your Signature Online Free",
    description:
      "Draw a signature, choose the pages and place it onto your PDF. Your document stays in your browser and the signed copy downloads instantly.",
    popular: true,
  },
  {
    href: "/ai-summarizer",
    name: "AI Summarizer",
    blurb: "Get an AI summary of any PDF.",
    subtitle: "Summarize your PDF with AI.",
    icon: "summarize",
    category: "AI Tools",
    title: "AI Summarizer — Summarize PDF with AI Online Free",
    description:
      "Upload a PDF and get an AI-generated summary with key points, main topics, and estimated reading time. Free and no account needed.",
    popular: true,
  },
  {
    href: "/ai-chat",
    name: "AI Chat",
    blurb: "Ask questions about your PDF content.",
    subtitle: "Chat with your PDF using AI.",
    icon: "chat",
    category: "AI Tools",
    title: "AI Chat — Ask Questions About Your PDF Free",
    description:
      "Upload a PDF and ask any question about its content. Get AI-generated answers based on the document. Free and no account needed.",
    popular: true,
  },
  {
    href: "/ai-quiz",
    name: "AI Quiz Generator",
    blurb: "Generate quizzes from your PDF content.",
    subtitle: "Create quizzes from your PDF with AI.",
    icon: "quiz",
    category: "AI Tools",
    title: "AI Quiz Generator — Create Quizzes from PDF Free",
    description:
      "Upload a PDF and automatically generate multiple choice, true/false, and short answer questions. Perfect for studying. Free and no account needed.",
    popular: false,
  },
  {
    href: "/ai-notes",
    name: "AI Notes Generator",
    blurb: "Turn your PDF into structured notes.",
    subtitle: "Generate notes from your PDF with AI.",
    icon: "notes",
    category: "AI Tools",
    title: "AI Notes Generator — Create Notes from PDF Free",
    description:
      "Upload a PDF and get well-organized notes with headings, key points, and summaries. Perfect for studying and review. Free and no account needed.",
    popular: false,
  },
  {
    href: "/ai-pdf-translator",
    name: "AI PDF Translator",
    blurb: "Translate PDF text while keeping its structure clear.",
    subtitle: "Translate your PDF with AI.",
    icon: "translate",
    category: "AI Tools",
    title: "AI PDF Translator — Translate PDF Text Online",
    description: "Translate text from a PDF into English, Urdu, Arabic, Spanish, French, German, Hindi, Chinese, Portuguese or Turkish with AI.",
    popular: false,
  },
  {
    href: "/ai-pdf-rewriter",
    name: "AI PDF Rewriter",
    blurb: "Rewrite PDF text for clarity, tone or length.",
    subtitle: "Rewrite PDF content with AI.",
    icon: "rewrite",
    category: "AI Tools",
    title: "AI PDF Rewriter — Rewrite PDF Text with AI",
    description: "Rewrite PDF text professionally, simply, concisely or with improved clarity while keeping the original visible.",
    popular: false,
  },
  {
    href: "/ai-ask-pdf",
    name: "AI Ask PDF",
    blurb: "Ask follow-up questions about one PDF in a focused chat.",
    subtitle: "Ask questions about your PDF.",
    icon: "ask",
    category: "AI Tools",
    title: "AI Ask PDF — Ask Questions About a PDF",
    description: "Upload a PDF, ask document-specific questions and get answers grounded in its extracted text.",
    popular: false,
  },
  {
    href: "/ai-pdf-to-presentation",
    name: "AI PDF to Presentation",
    blurb: "Turn a PDF into a structured presentation outline.",
    subtitle: "Create presentation slides from a PDF.",
    icon: "presentation",
    category: "AI Tools",
    title: "AI PDF to Presentation — Create Slides from PDF",
    description: "Generate a presentation title, slide outline, key points and optional speaker notes from a PDF.",
    popular: false,
  },
  {
    href: "/ai-flashcard-generator",
    name: "AI Flashcard Generator",
    blurb: "Create study flashcards from your PDF content.",
    subtitle: "Generate flashcards from a PDF.",
    icon: "flashcard",
    category: "AI Tools",
    title: "AI Flashcard Generator — Create Study Cards from PDF",
    description: "Generate 5, 10, 20 or 50 document-grounded flashcards, flip through them and export the set.",
    popular: false,
  },
  {
    href: "/ai-citation-generator",
    name: "AI Citation Generator",
    blurb: "Create APA, MLA, Chicago or Harvard citations from a PDF.",
    subtitle: "Generate accurate citations from a PDF.",
    icon: "citation",
    category: "AI Tools",
    title: "AI Citation Generator — Create Citations from PDF",
    description: "Detect bibliographic details from a PDF and format citations in APA, MLA, Chicago or Harvard style without inventing missing data.",
    popular: false,
  },
  {
    href: "/ai-grammar-checker",
    name: "AI Grammar & Writing Checker",
    blurb: "Find grammar, spelling, clarity and repetition issues.",
    subtitle: "Improve your PDF writing with AI.",
    icon: "grammar",
    category: "AI Tools",
    title: "AI Grammar Checker — Improve PDF Writing with AI",
    description: "Review PDF text for grammar, spelling, punctuation, clarity, awkward wording and repetition with explanations.",
    popular: false,
  },
  {
    href: "/ai-document-analyzer",
    name: "AI Document Analyzer",
    blurb: "Extract topics, dates, entities, sections and useful facts.",
    subtitle: "Understand the structure of your PDF.",
    icon: "analyze",
    category: "AI Tools",
    title: "AI Document Analyzer — Analyze PDF Content with AI",
    description: "Extract a document summary, topics, dates, entities, statistics, sections, keywords and document type from a PDF.",
    popular: false,
  },
  {
    href: "/ai-resume-analyzer",
    name: "AI Resume Analyzer",
    blurb: "Review resume content, structure and job-description alignment.",
    subtitle: "Analyze your resume with AI.",
    icon: "resume",
    category: "AI Tools",
    title: "AI Resume Analyzer — Review Your Resume with AI",
    description: "Analyze resume structure, skills, experience, education, clarity, formatting and keyword coverage with optional job matching.",
    popular: false,
  },
  {
    href: "/ai-pdf-question-generator",
    name: "AI PDF Question Generator",
    blurb: "Generate document-grounded questions at three difficulty levels.",
    subtitle: "Create questions from your PDF with AI.",
    icon: "questions",
    category: "AI Tools",
    title: "AI PDF Question Generator — Create Questions from PDF",
    description: "Generate 5, 10, 20 or 50 multiple choice, true/false or short-answer questions based only on your PDF.",
    popular: false,
  },
  {
    href: "/crop-pdf",
    name: "Crop PDF",
    blurb: "Trim the edges off PDF pages.",
    subtitle: "Cut PDF pages down to a fixed size.",
    icon: "crop",
    category: "Edit PDF",
    title: "Crop PDF — Trim PDF Pages Online Free",
    description:
      "Crop PDF pages to A4, US Letter, square or a business card size. Trim the margins off scans and downloads instantly, free and with no account.",
    popular: true,
  },
  {
    href: "/change-page-size",
    name: "Change Page Size",
    blurb: "Switch PDF pages between A4, Letter and Legal.",
    subtitle: "Resize PDF pages to fit the printer.",
    icon: "resize",
    category: "Edit PDF",
    title: "Change PDF Page Size — Resize PDF to A4 or Letter",
    description:
      "Change the page size of a PDF to A4, US Letter or Legal, in portrait or landscape. The existing content is scaled to fit rather than cropped. Free, no signup.",
    popular: true,
  },
  {
    href: "/flatten-pdf",
    name: "Flatten PDF",
    blurb: "Lock form fields and annotations into the page.",
    subtitle: "Make PDF forms read-only and final.",
    icon: "flatten",
    category: "Edit PDF",
    title: "Flatten PDF — Flatten Forms and Annotations Online Free",
    description:
      "Flatten a PDF so form fields, comments and annotations become part of the page. The result looks the same everywhere and can no longer be edited. Free and no account needed.",
    popular: true,
  },
  {
    href: "/grayscale-pdf",
    name: "Grayscale PDF",
    blurb: "Convert PDF pages to black and white.",
    subtitle: "Print your PDF in black and white.",
    icon: "grayscale",
    category: "Optimize",
    title: "Grayscale PDF — Convert PDF to Black and White",
    description:
      "Convert PDF pages to grayscale for cheaper printing and smaller files. Pick the pages and the quality, then download the monochrome PDF. Free, no account.",
    popular: true,
  },
  {
    href: "/remove-pdf-metadata",
    name: "Remove PDF Metadata",
    blurb: "Strip author, software and date details from a PDF.",
    subtitle: "Clear the hidden details a PDF remembers.",
    icon: "metadata",
    category: "Optimize",
    title: "Remove PDF Metadata — Clear Author and Personal Details",
    description:
      "Remove PDF metadata including the author, title, subject, keywords, creator, producer and creation dates. Clean a file before you send it to someone else. Free and private.",
    popular: true,
  },
  {
    href: "/extract-pdf-text",
    name: "Extract Text from PDF",
    blurb: "Pull the text out of your PDF into a .txt file.",
    subtitle: "Copy the words out of a PDF.",
    icon: "text",
    category: "Convert",
    title: "Extract Text from PDF — Convert PDF to Text Online Free",
    description:
      "Extract the text from the pages of a PDF and download it as a plain text file. Useful for notes, search and pasting into another document. Free and no account needed.",
    popular: true,
  },
  {
    href: "/insert-blank-page",
    name: "Insert Blank Page",
    blurb: "Add empty pages at the end or after each page.",
    subtitle: "Add blank sheets anywhere in a PDF.",
    icon: "blank",
    category: "Organize PDF",
    title: "Insert Blank Page — Add Empty Pages to a PDF",
    description:
      "Insert blank pages into a PDF at the end, at the start, or after every page you select. Useful for double-sided printing. Free, instant, no account.",
    popular: true,
  },
  {
    href: "/add-header-footer",
    name: "Header and Footer",
    blurb: "Add a line of text to the top or bottom of pages.",
    subtitle: "Put a caption on every page of a PDF.",
    icon: "header",
    category: "Edit PDF",
    title: "Add Header and Footer to PDF Pages Online Free",
    description:
      "Add a header or footer line of text to the pages of a PDF. Useful for file names, dates, page references and confidential markings. Free and no signup.",
    popular: true,
  },
  {
    href: "/fill-pdf-form",
    name: "Fill PDF Form",
    blurb: "Fill in text fields and check boxes.",
    subtitle: "Complete the fillable form.",
    icon: "form",
    category: "Edit PDF",
    title: "Fill PDF Form — Fill in PDF Fields Online Free",
    description:
      "Fill in text fields, check boxes and radio buttons in a PDF form without installing anything. Changes happen in your browser — no upload. Free and no signup.",
    popular: false,
  },
  {
    href: "/redact-pdf",
    name: "Redact PDF",
    blurb: "Cover sensitive text with black boxes.",
    subtitle: "Hide names, accounts and other private details.",
    icon: "redact",
    category: "Edit PDF",
    title: "Redact PDF — Hide Sensitive Text and Images",
    description:
      "Cover names, account numbers and any other sensitive content with black boxes, or delete text and images entirely. Works in your browser. Free and no signup.",
    popular: false,
  },
  {
    href: "/highlight-pdf",
    name: "Highlight PDF",
    blurb: "Mark text in yellow, green, blue or pink.",
    subtitle: "Highlight text for notes and review.",
    icon: "highlight",
    category: "Edit PDF",
    title: "Highlight PDF — Mark Text in Colours Online Free",
    description:
      "Highlight text in your PDF in yellow, green, blue or pink. Keep a document readable while still marking the parts that matter. Free and no signup.",
    popular: false,
  },
  {
    href: "/embed-file-in-pdf",
    name: "Embed File in PDF",
    blurb: "Pack extra files inside your PDF.",
    subtitle: "Attach supporting files to the PDF.",
    icon: "embed",
    category: "Organize PDF",
    title: "Embed File in PDF — Attach Documents to Your PDF",
    description:
      "Pack a resume, spreadsheet or images inside your PDF so everything travels in one file. Recipients open attachments with one click. Free and no signup.",
    popular: false,
  },
  {
    href: "/add-pdf-bookmarks",
    name: "Add Bookmarks to PDF",
    blurb: "Add a table of contents to the PDF.",
    subtitle: "Create a navigable table of contents.",
    icon: "bookmark",
    category: "Organize PDF",
    title: "Add Bookmarks to PDF — Create a Table of Contents",
    description:
      "Add bookmarks to the PDF table of contents so readers can jump to sections instead of scrolling. No server, no account. Free and instant.",
    popular: false,
  },
  {
    href: "/pdf-to-markdown",
    name: "PDF to Markdown",
    blurb: "Turn a PDF's text into clean Markdown.",
    subtitle: "Convert PDF text to Markdown for editing.",
    icon: "markdown",
    category: "Convert",
    title: "PDF to Markdown — Convert Your PDF to Markdown Online",
    description:
      "Convert the text of your PDF into Markdown you can paste into any editor. Headings, lists and paragraphs are kept. Works in your browser, free and no signup.",
    popular: false,
  },
  {
    href: "/compare-pdf",
    name: "Compare PDF",
    blurb: "See exactly what changed between two PDFs.",
    subtitle: "Find the differences between two documents.",
    icon: "compare",
    category: "Edit PDF",
    title: "Compare PDF — Find What Changed Between Two PDFs",
    description:
      "Compare two PDFs side by side and see every line that was added, removed or left unchanged. Useful for contracts and drafts. Free and no signup.",
    popular: false,
  },
  {
    href: "/edit-pdf",
    name: "Edit PDF",
    blurb: "Add your own text onto a PDF page.",
    subtitle: "Write and stamp text onto a PDF.",
    icon: "editText",
    category: "Edit PDF",
    title: "Edit PDF — Add Text to a PDF Online Free",
    description:
      "Add a note, a label or a correction to any page of your PDF by typing text at an exact position. Everything happens in your browser. Free and no signup.",
    popular: false,
  },
  {
    href: "/repair-pdf",
    name: "Repair PDF",
    blurb: "Rebuild a damaged or broken PDF.",
    subtitle: "Recover PDFs that will not open.",
    icon: "repair",
    category: "Optimize",
    title: "Repair PDF — Fix a Broken or Damaged PDF File",
    description:
      "Rebuild the structure of a PDF that will not open or shows errors, and download a working copy. Recovers damaged files, in your browser. Free and no signup.",
    popular: false,
  },
  {
    href: "/protect-pdf",
    name: "Protect PDF",
    blurb: "Add a password and lock a PDF.",
    subtitle: "Encrypt and set printing rights.",
    icon: "lock",
    category: "PDF security",
    title: "Protect PDF — Add a Password to a PDF Online Free",
    description:
      "Add AES-256 password protection to your PDF and decide whether it can be printed or copied. Runs in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/unlock-pdf",
    name: "Unlock PDF",
    blurb: "Remove a password you know.",
    subtitle: "Strip a password from a PDF.",
    icon: "unlock",
    category: "PDF security",
    title: "Unlock PDF — Remove a PDF Password Free, No Upload",
    description:
      "Remove the password from a PDF you have the password for and download a normal copy that opens anywhere. Works entirely in your browser. Free and no signup.",
    popular: false,
  },
  {
    href: "/ocr-pdf",
    name: "OCR PDF",
    blurb: "Make scanned PDFs searchable.",
    subtitle: "Read the text in a scanned document.",
    icon: "scan",
    category: "Optimize",
    title: "OCR PDF — Make a Scanned PDF Searchable Online Free",
    description:
      "Read the text in a scanned PDF so you can search, select and copy it. Runs entirely in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/word-to-pdf",
    name: "Word to PDF",
    blurb: "Turn a Word document into a PDF.",
    subtitle: "Turn your Word document into a PDF.",
    icon: "toPdf",
    category: "Convert",
    title: "Word to PDF — Convert DOCX to PDF Online Free",
    description:
      "Convert a Word .docx document to PDF in your browser. Headings, lists, tables and images are kept. Nothing is uploaded. Free and no signup.",
    popular: false,
  },
  {
    href: "/pdf-to-word",
    name: "PDF to Word",
    blurb: "Make a PDF editable in Word.",
    subtitle: "Turn a PDF back into an editable Word document.",
    icon: "text",
    category: "Convert",
    title: "PDF to Word — Convert PDF to DOCX Online Free",
    description:
      "Turn a PDF into an editable .docx. Headings and paragraphs are rebuilt from the page layout. Runs in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/pdf-to-excel",
    name: "PDF to Excel",
    blurb: "Pull tables out of a PDF into a spreadsheet.",
    subtitle: "Turn tables in a PDF into an editable spreadsheet.",
    icon: "grid",
    category: "Convert",
    title: "PDF to Excel — Convert PDF Tables to XLSX Online Free",
    description:
      "Extract tables from a PDF into an editable .xlsx. Columns are found from the page layout and numbers stay numbers. Runs in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/excel-to-pdf",
    name: "Excel to PDF",
    blurb: "Turn a spreadsheet into a PDF.",
    subtitle: "Turn an .xlsx into a PDF document.",
    icon: "toPdf",
    category: "Convert",
    title: "Excel to PDF — Convert XLSX to PDF Online Free",
    description:
      "Convert an .xlsx spreadsheet into a PDF. Each sheet is laid out as a table that fits the page. Runs in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/pdf-to-png",
    name: "PDF to PNG",
    blurb: "Save PDF pages as lossless PNG images.",
    subtitle: "Save PDF pages as PNG images.",
    icon: "toJpg",
    category: "Convert",
    title: "PDF to PNG — Convert PDF Pages to PNG Online Free",
    description:
      "Convert PDF pages to PNG images with no quality loss. Choose the pages and the resolution, then download them. Runs in your browser, nothing is uploaded.",
    popular: false,
  },
  {
    href: "/image-to-text",
    name: "Image to Text",
    blurb: "Read the text out of a photo or scan.",
    subtitle: "Pull the text out of an image with OCR.",
    icon: "scan",
    category: "Convert",
    title: "Image to Text — OCR Image to Text Online Free",
    description:
      "Extract text from a JPG, PNG or WebP image using OCR in your browser. Copy the result or download it as a text file. Nothing is uploaded. Free and no signup.",
    popular: false,
  },
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  "AI Tools",
  "Edit PDF",
  "Organize PDF",
  "Convert",
  "Optimize",
  "PDF security",
];

export function toolByHref(href: ToolHref): Tool {
  const tool = TOOLS.find((candidate) => candidate.href === href);
  if (!tool) throw new Error(`Unknown tool: ${href}`);
  return tool;
}

/** Up to `count` other tools, for the internal links block on a tool page. */
export function relatedTools(href: ToolHref, count = 4): Tool[] {
  const self = toolByHref(href);
  const sameCategory = TOOLS.filter(
    (tool) => tool.href !== href && tool.category === self.category,
  );
  const rest = TOOLS.filter(
    (tool) => tool.href !== href && tool.category !== self.category,
  );
  return [...sameCategory, ...rest].slice(0, count);
}
