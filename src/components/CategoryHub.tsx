import { Link } from "@tanstack/react-router";
import { AdSlot } from "#/components/AdSlot";
import { ArrowRightIcon } from "#/components/Icons";
import { ToolIconTile } from "#/components/ToolIconTile";
import { heading, muted } from "#/components/ui";
import { breadcrumbJsonLd, faqJsonLd, type FaqItem } from "#/lib/seo";
import { SITE_URL } from "#/lib/site";
import { TOOLS, type ToolCategory } from "#/lib/tools";

/**
 * The six category landing pages.
 *
 * `/tools` lists every tool behind a client-side filter, so the six broad terms
 * people actually search for — "organize pdf", "convert pdf", "pdf security" —
 * had no URL of their own to rank. Each hub is one of those terms: real
 * indexable HTML listing that category's tools, with its own copy, FAQ and
 * structured data.
 *
 * All six render from this one component so their layout and markup cannot
 * drift. The copy lives in CATEGORY_HUBS below; adding a seventh category means
 * adding an entry there plus a thin route file, not another 200 lines of JSX.
 */

export interface CategoryHub {
  category: ToolCategory;
  /** The <h1>, phrased as the search term rather than as a label. */
  name: string;
  /** Intro paragraphs above the tool grid. */
  intro: string[];
  /** Shown under the grid, on what this category as a whole can and cannot do. */
  note: string;
  faq: FaqItem[];
}

export const CATEGORY_HUBS: Record<string, CategoryHub> = {
  "Organize PDF": {
    category: "Organize PDF",
    name: "Organize PDF",
    intro: [
      "Organizing a PDF means changing the order of its pages, removing the ones you don't want, or pulling a section out as a new document — without re-exporting anything from the software that made it.",
      "Every tool on this page runs in your browser. Your file is opened, rearranged and saved on your own device, so a confidential contract or an unreleased report never touches a server.",
    ],
    note: "These tools rearrange pages but do not change what is on them. If you need to edit the text itself, change the page size, or shrink the file, those live under Edit PDF and Optimize.",
    faq: [
      {
        question: "How do I reorder pages in a PDF without changing the content?",
        answer:
          "Upload the file, then drag the thumbnails into the order you want and save. The pages are copied in the new order at their original size and orientation, and nothing on the page itself is altered.",
      },
      {
        question: "Can I delete pages from a PDF online for free?",
        answer:
          "Yes. Upload the document, select the pages to remove, and save the result. It runs in your browser, so there is no upload step and no size ceiling beyond what your device can hold open.",
      },
      {
        question: "Will organizing a PDF reduce its file size?",
        answer:
          "Deleting a long run of image-heavy pages often makes a file much smaller, but rearranging pages on their own does not. Use Compress PDF if size is what you are trying to solve.",
      },
      {
        question: "Is there a limit on how many pages I can reorder?",
        answer:
          "The limit is what your device can comfortably hold open. Very large scanned documents take longer and use more memory than text documents of the same page count.",
      },
    ],
  },
  "Edit PDF": {
    category: "Edit PDF",
    name: "Edit PDF",
    intro: [
      "Editing a PDF usually means one of a few specific things: signing it, stamping it with text, marking up a passage, filling in a form, or trimming the white space off a scanned page. Each of those is a separate tool below.",
      "They all run locally in your browser tab. That matters most for the tools here — signing a contract or filling a form with your details is exactly the kind of document you would not want uploaded to someone else's server.",
    ],
    note: "For changes to existing text — rewriting a sentence, translating a passage, summarising a document — those need an AI pass and send extracted text to the AI provider. They are listed under AI Tools instead.",
    faq: [
      {
        question: "Can I edit a PDF without installing anything?",
        answer:
          "Yes. Every tool here works in a modern browser. You drop in the file, make your change, and download the result — there is no account, no install and no watermark added to your document.",
      },
      {
        question: "Can I add my signature to a PDF?",
        answer:
          "Draw your signature on screen with a mouse, trackpad or finger, then place it on the page you want. The signature is drawn into the file rather than pasted as a floating image, so it sits with the page content.",
      },
      {
        question: "Why can't I edit the text directly in a PDF?",
        answer:
          "A PDF stores characters at fixed positions on a page rather than as an editable paragraph, so there is no cursor to place and no reflow. Editing text means either an overlay — stamping new text over the area — or an AI rewrite, which are separate tools.",
      },
      {
        question: "Are my uploaded files stored anywhere?",
        answer:
          "No. The file is read, modified and handed back to you from your own browser. Nothing is uploaded, and nothing is kept after you close the tab.",
      },
    ],
  },
  Convert: {
    category: "Convert",
    name: "Convert PDF",
    intro: [
      "Conversion is how you get a PDF into a tool that understands it as something other than a page of positioned marks — a Word document you can revise, a spreadsheet you can total, an image you can post, or plain text you can search.",
      "Conversion is also the step most likely to change something. A scanned page has no text in it at all, so a PDF-to-Word tool can only give you a picture of each page unless the scan already had a recognised text layer underneath.",
    ],
    note: "If your PDF is a scan with no text layer, run OCR PDF first to add one — then the text-based converters below will produce far better results.",
    faq: [
      {
        question: "Why did my converted PDF to Word document lose its formatting?",
        answer:
          "A PDF records where each character sits, not which heading style it belongs to, so converters rebuild the document by position. Text, columns and images usually survive; exact fonts, paragraph spacing and list styling often do not. Open the result once before relying on it.",
      },
      {
        question: "Can I convert a PDF to Excel?",
        answer:
          "Yes, if the PDF holds a genuine table — one with visible rows and columns. The converter finds the columns where they actually sit and writes them out row by row. A table drawn as floating text boxes will not convert cleanly.",
      },
      {
        question: "Which PDF to image format should I use?",
        answer:
          "Use JPG for photographs and scans where file size matters. Use PNG when the page contains text, line art or screenshots, since PNG keeps edges sharp where JPG would smear them into compression artefacts.",
      },
      {
        question: "Do these converters upload my file?",
        answer:
          "No. Conversion runs in your browser, so the document stays on your device. Only the AI tools send extracted text to an AI provider, and only when you start an AI action.",
      },
    ],
  },
  Optimize: {
    category: "Optimize",
    name: "Optimize PDF",
    intro: [
      "Optimizing a PDF means making it smaller, or cleaner, without making it worse. Most of the time the goal is simple: the file is too big to email, upload to a portal, or attach to a form that caps attachments at 10 MB.",
      "The reason PDFs are oversized is nearly always images. A single scanned page at 300 DPI can be a megabyte on its own, so a ten-page scan is ten megabytes of mostly page — which is where the savings are.",
    ],
    note: "Compression trades size against quality. Text stays sharp at almost any setting; scanned photographs and gradients are where you will notice the difference, so check a photo-heavy page after compressing.",
    faq: [
      {
        question: "How much can I compress a PDF?",
        answer:
          "A text-only document often drops by 60–80 percent. A scan of ordinary text drops similarly. A photo-heavy document has less room, because the photographs are already compressed and there is little redundant data left to remove.",
      },
      {
        question: "Which compression level should I use?",
        answer:
          "Recommended suits most documents and keeps text comfortably sharp. Basic keeps quality closest to the original for a file that only needs trimming. Strong gives the smallest file and is worth trying on an archive copy or anything that only has to be readable.",
      },
      {
        question: "Why is my PDF still too large after compressing it?",
        answer:
          "Usually because it is mostly images, or because it already carries high-resolution scans that cannot shrink much further. Converting a scan to greyscale, or extracting the text instead of keeping the page image, often saves more than compression alone.",
      },
      {
        question: "Does compressing a PDF reduce its quality?",
        answer:
          "Some, and it depends on the setting and the content. Text remains legible at every level. Photographs and smooth gradients show compression artefacts first, so open the result and compare a busy page before sending it on.",
      },
    ],
  },
  "PDF security": {
    category: "PDF security",
    name: "PDF Security",
    intro: [
      "PDF security covers three separate jobs that people often lump together: locking a file so only you can open it, removing a lock that is in your way, and permanently removing text you no longer want visible.",
      "Redaction is the one to be careful with. Covering text with a black box hides it on screen but leaves the characters underneath, recoverable by anyone who copies the page. Real redaction removes them from the file.",
    ],
    note: "Password protection here controls who can open the file and what they may do with it. It is not encryption for data in transit, and it is not a replacement for a properly managed document-sharing system.",
    faq: [
      {
        question: "Can I remove a password from a PDF I have the right to open?",
        answer:
          "Yes, if you know the current password. Unlock PDF removes a known password and any owner restrictions. It cannot recover the contents of a file whose password you do not have — that is the entire point of the password.",
      },
      {
        question: "Is redacting a PDF here permanent?",
        answer:
          "Yes, the text is removed from the file rather than covered. Always check the result by selecting the redacted area and trying to copy it, and keep an unredacted copy somewhere safe until you have confirmed the redacted version is correct.",
      },
      {
        question: "How secure is password protection on a PDF?",
        answer:
          "It is enough to stop casual sharing and to make the file open-only. It is not a substitute for encrypting a highly sensitive document with dedicated software, and a password cannot protect a file from someone who already has it open.",
      },
      {
        question: "Are password-protected PDFs handled by the tool?",
        answer:
          "All of these run in your browser, so a protected document is never uploaded anywhere. That matters more for this category than for any other, which is why the tools are built to work locally.",
      },
    ],
  },
  "AI Tools": {
    category: "AI Tools",
    name: "AI PDF Tools",
    intro: [
      "The AI tools read the text inside your PDF and do something a fixed converter cannot: summarise it, translate it, rewrite it, turn it into questions, or answer questions about it in plain language.",
      "These are the only tools on this site that contact an external service. Your original PDF stays on your device, but the extracted text — and, for scanned pages, an image of each page — is sent to the AI provider when you start an AI action, so treat them accordingly.",
    ],
    note: "Accuracy depends entirely on what is in the text layer. A scanned document with no recognised text gives the AI nothing to read, so run OCR PDF first and convert the result back if you need a usable scan.",
    faq: [
      {
        question: "What exactly gets sent to the AI provider?",
        answer:
          "Your original PDF file is not uploaded. What is sent is the text extracted from it, and for scanned pages an image of each page, so the model can read them. That happens only when you start an AI action, and every AI tool states it on its own page.",
      },
      {
        question: "Is there a limit on how long a PDF can be?",
        answer:
          "Long documents are split into chunks and processed in sequence, which means a very large file takes proportionally longer. Extremely long documents can exceed what fits in a single request and may need splitting by hand.",
      },
      {
        question: "How accurate are the summaries and translations?",
        answer:
          "Treat them as a strong first pass, not as a final document. Definitions, figures and proper nouns are where these go wrong, so check anything you plan to rely on against the source.",
      },
      {
        question: "Do the AI tools work on scanned PDFs?",
        answer:
          "Yes — pages are rendered as images and read visually, which is why OCR is not a hard requirement. Accuracy is lower than on a PDF that already has a text layer, and it takes longer.",
      },
    ],
  },
};

export function CategoryHubPage({
  category,
  path,
}: {
  category: ToolCategory;
  /** This page's own path, for the breadcrumb and canonical URL. */
  path: string;
}) {
  const hub = CATEGORY_HUBS[category];
  const tools = TOOLS.filter((tool) => tool.category === category);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500 dark:text-ink-500">
          <li>
            <Link to="/" className="hover:text-brand-700 dark:hover:text-brand-300">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/tools" className="hover:text-brand-700 dark:hover:text-brand-300">
              All Tools
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            className="font-medium text-ink-700 dark:text-ink-300"
            aria-current="page"
          >
            {hub.name}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <h1 className={heading.h1}>{hub.name} Tools</h1>
        <p className={`mt-3 text-lg ${muted}`}>{tools.length} free tools</p>
        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
          {hub.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </header>

      <AdSlot format="fluid" className="mt-8" />

      <section aria-labelledby="hub-tools" className="mt-10">
        <h2 id="hub-tools" className={heading.h2}>
          All {hub.name.toLowerCase()} tools
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.href} className="min-w-0">
              <Link
                to={tool.href}
                className="group flex h-full items-start gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-ink-200 transition-colors hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-600/60"
              >
                <ToolIconTile name={tool.icon} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                    {tool.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500 dark:text-ink-500">
                    {tool.blurb}
                  </span>
                </span>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
        {hub.note}
      </p>

      <AdSlot format="inArticle" className="mt-8" />

      <section aria-labelledby="hub-faq" className="mt-12">
        <h2 id="hub-faq" className={heading.h2}>
          {hub.name} questions
        </h2>
        <dl className="mt-5 space-y-5">
          {hub.faq.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold text-ink-900 dark:text-white">
                {item.question}
              </dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10">
        <Link
          to="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"
        >
          See all PDF tools
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </p>

      <script
        type="application/ld+json"
        // Static, built from our own data. No user input reaches it.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqJsonLd(hub.faq),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "All Tools", path: "/tools" },
              { name: hub.name, path },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${hub.name} tools`,
              numberOfItems: tools.length,
              itemListElement: tools.map((tool, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: tool.name,
                url: `${SITE_URL}${tool.href}`,
              })),
            },
          ]),
        }}
      />
    </div>
  );
}