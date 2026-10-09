import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Faq } from "#/components/Faq";
import {
  ArrowRightIcon,
  BoltIcon,
  BrainIcon,
  CheckIcon,
  CompressIcon,
  DownloadIcon,
  FolderIcon,
  KeyIcon,
  LeafIcon,
  LightbulbIcon,
  LockIcon,
  MergeIcon,
  NotesIcon,
  PdfFileIcon,
  RotateIcon,
  SearchIcon,
  SignIcon,
  SparkIcon,
  SplitIcon,
  TargetIcon,
  ToPdfIcon,
} from "#/components/Icons";
import { AdSlot } from "#/components/AdSlot";
import { navEvents } from "#/lib/analytics";
import { ToolCard } from "#/components/ToolCard";
import { ExtensionBanner } from "#/components/ExtensionBanner";
import { HeroDropzone } from "#/components/HeroDropzone";
import { ProblemPicker } from "#/components/ProblemPicker";
import { StepIllustration, type StepArt } from "#/components/StepIllustration";
import { PrivacyProof } from "#/components/PrivacyProof";
import { MyToolsBar } from "#/components/MyToolsBar";
import { AiNotice } from "#/components/AiNotice";
import { button, cx, heading, muted, sectionWrap } from "#/components/ui";
import { DailyChallengeCard } from "#/components/DailyChallengeCard";
import { TrustStrip } from "#/components/TrustStrip";
import { ToolSearch } from "#/components/ToolSearch";
import {
  callGemini,
  extractPdfText,
  processAiDocument,
  type AiAttachment,
} from "#/lib/ai";
import { faqJsonLd, pageHead, softwareJsonLd, type FaqItem } from "#/lib/seo";
import { MAX_FILE_LABEL, SITE_NAME } from "#/lib/site";
import { TOOLS } from "#/lib/tools";

const TITLE = `${SITE_NAME} — Free Online PDF Tools`;
const DESCRIPTION =
  "Free online PDF tools to compress, merge, split, convert, rotate and manage PDF files quickly and easily.";

export const Route = createFileRoute("/")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, path: "/" }),
  component: Home,
});

const FAQ: FaqItem[] = [
  {
    question: `Is ${SITE_NAME} free?`,
    answer:
      "Yes. Every tool on the site is free to use, with no trial period and no paid tier hiding the useful settings.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. There is no signup, no email address and no phone verification. Open a tool, choose a file and use it.",
  },
  {
    question: "Can I use it on mobile?",
    answer:
      "Yes. Every tool is built for a phone screen as well as a desktop, including the upload area and the page thumbnails.",
  },
  {
    question: "Is there a file size limit?",
    answer: `Yes, ${MAX_FILE_LABEL} per file. Because the work happens on your own device, very large documents also depend on how much memory your phone or computer has free.`,
  },
  {
    question: "Can I merge multiple PDFs?",
    answer:
      "Yes. Add as many PDFs as you need, arrange them in the order you want, and download one combined document.",
  },
  {
    question: "Can I compress a PDF?",
    answer:
      "Yes. Choose strong, recommended or basic compression, and the result screen shows the real before and after file sizes.",
  },
  {
    question: "What happens to my files?",
    answer:
      "Most regular PDF tools process your file directly in your browser on your device. AI features may send extracted text to our AI processing provider to generate the result, while the original PDF remains on your device.",
  },
];

const popular = TOOLS.filter((tool) => tool.popular);

const aiTools = TOOLS.filter((tool) => tool.category === "AI Tools");

/**
 * The two AI tools promoted above the grid.
 *
 * Chosen for capability rather than recency: one spans several documents, the
 * other produces four kinds of study material from one. Everything else in the
 * AI category does what a single-purpose page does well, and a grid of eight
 * equal cards is the honest way to present those.
 */
const FEATURED_AI = [
  {
    href: "/multi-pdf-chat" as const,
    Icon: SparkIcon,
    title: "Chat with several PDFs at once",
    body: "Upload up to five documents and ask one question across all of them. Answers name the document and page they came from, so you can open that page rather than take the answer on trust.",
    points: [
      "Up to 5 documents in one conversation",
      "Every answer cites its source document and page",
      "Compare documents, extract dates, find key facts",
    ],
    cta: "Open Multi-PDF Chat",
  },
  {
    href: "/study-mode" as const,
    Icon: BrainIcon,
    title: "Turn one PDF into a full revision set",
    body: "Upload a lecture once and get a summary, revision notes, practice questions and flashcards. Every question carries an explanation naming the part of the document it came from.",
    points: [
      "4 study materials from a single upload",
      "5, 10 or 20 questions at three difficulty levels",
      "Quiz with scoring, retry, and answers you can check",
    ],
    cta: "Open Study Mode",
  },
];

/**
 * The tools defined by a constraint rather than a task.
 *
 * `honesty` is not decoration. Both of these can fail in a way that is only
 * visible after the visitor has already spent the time — a compression that
 * missed its target, a translation in a script a PDF font cannot shape — and
 * the person who needs to know that is the same person deciding whether to
 * click. Putting the caveat on the card is the difference between a limit and
 * a bug discovered at the wrong moment.
 */
const PRECISION_TOOLS = [
  {
    href: "/compress-pdf-to-specific-size" as const,
    Icon: TargetIcon,
    title: "Compress a PDF to an exact size",
    body: "Pick 100 KB, 200 KB, 500 KB, 1 MB, or set your own target. The tool searches over image quality and render scale until the file is under it, then reports the original size, the result, and how much was saved.",
    honesty:
      "An exact size is not always reachable. If a page cannot be reduced further without becoming unreadable, the tool says so and gives you the smallest file it could actually make, rather than reporting a target it did not hit.",
    cta: "Open Exact-Size Compressor",
  },
  {
    href: "/ai-pdf-translator" as const,
    Icon: ToPdfIcon,
    title: "Translate a PDF into 17 languages",
    body: "Translate into Urdu, Arabic, Persian, Hebrew, Hindi, Chinese, Japanese, Korean and more, with the text laid out right-to-left where the language needs it. Copy the result, or download it as a PDF where the script allows it.",
    honesty:
      "Urdu, Arabic, Persian and Hebrew cannot be exported as PDF here — a PDF font stores individual glyphs without joining them, so the output would be correctly shaped words in the wrong order. The tool offers Copy instead and says why, rather than handing you a broken download.",
    cta: "Open PDF Translator",
  },
];

/**
 * The numbers under the hero.
 *
 * Every value here is checked against the code rather than chosen for effect —
 * `TOOLS.length` is rendered directly, so the count cannot drift out of sync
 * with the catalogue again. This band previously read "13+" while the same page
 * rendered "See all 55 tools" two sections below it, which is the kind of
 * inaccuracy a visitor who is deciding whether to trust a tool with their file
 * notices immediately.
 *
 * There is deliberately no star rating or review count here. The site has no
 * reviews, and inventing some would breach both Google's structured-data
 * guidelines and AdSense's, while contradicting the site's own claim that it
 * does not fabricate. The real numbers are the strongest ones available.
 */
const STATS = [
  {
    value: String(TOOLS.length),
    label: "PDF tools",
    sub: "Plus a suite of AI document tools",
  },
  { value: "50 MB", label: "Per file", sub: "No account, no trial, no paywall" },
  { value: "0", label: "Uploads for most tools", sub: "Your file never leaves the browser" },
  { value: "$0", label: "Forever", sub: "No paid tier hiding the useful settings" },
];

function StatsBanner() {
  return (
    <section className={`${sectionWrap} mt-12 mb-4`}>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl bg-white/70 p-6 text-center ring-1 ring-ink-200/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10 hover:ring-brand-300 dark:bg-ink-900/70 dark:ring-ink-800 dark:hover:ring-brand-500/40"
          >
            <div className="text-3xl font-black tracking-tight text-brand-600 sm:text-4xl dark:text-brand-400 group-hover:scale-105 transition-transform duration-300">
              {stat.value}
            </div>
            <div className="mt-2 text-sm font-bold text-ink-900 dark:text-white">
              {stat.label}
            </div>
            <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              {stat.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Home() {
  // Fires once per mount, not once per render — the funnel has to have a
  // denominator, and "how many people landed here" was the number that was
  // missing.
  useEffect(() => {
    navEvents.landing();
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            softwareJsonLd({ name: SITE_NAME, description: DESCRIPTION, path: "/" }),
            faqJsonLd(FAQ),
          ]),
        }}
      />

      {/* The 160x600 sidebar unit, desktop only. It sits in the margin beside
          the container rather than inside it, so it never competes with the
          tool grid for space or shifts it when a creative loads. */}
      <aside
        aria-label="Advertisement"
        className="fixed top-1/2 z-20 hidden -translate-y-1/2 2xl:block"
        style={{ right: "max(16px, calc((100vw - 1152px) / 2 - 176px))" }}
      >
        <AdSlot format="skyscraper" className="my-0" />
      </aside>

      <ExtensionBanner />

      <Hero />

      <StatsBanner />

      <TrustStrip />

      <ProblemPicker />

      <MyToolsBar />

      <section aria-labelledby="tools-heading" className={`${sectionWrap} mt-12 animate-fade-in-up`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="tools-heading" className={heading.h2}>
              Popular PDF tools
            </h2>
            <p className={`mt-2 ${muted}`}>
              The five people reach for most. Each one opens, does its job and
              hands the file back.
            </p>
          </div>
          <Link
            to="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"
          >
            See all {TOOLS.length} tools
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-bounce">
          {popular.map((tool) => (
            <li key={tool.href}>
              <ToolCard tool={tool} />
            </li>
          ))}
          <li>
            <Link
              to="/tools"
              className="flex h-full flex-col justify-center rounded-2xl border-2 border-dashed border-ink-300 p-5 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-ink-700 dark:hover:border-brand-600 dark:hover:bg-brand-600/5"
            >
              <span className="text-base font-semibold text-ink-900 dark:text-white">
                All PDF tools
              </span>
              <span className="mt-1 text-sm text-ink-600 dark:text-ink-400">
                Sign, watermark, rotate, delete pages and more.
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="current-tools-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="current-tools-heading" className={heading.h2}>
              Current tools
            </h2>
            <p className={`mt-2 ${muted}`}>
              A quick list of the tools currently available on the site.
            </p>
          </div>
          <Link
            to="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"
          >
            Open full tool list <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-ink-700 dark:text-ink-300">
              <thead className="bg-ink-50 text-xs uppercase tracking-[0.08em] text-ink-500 dark:bg-ink-950 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tool</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => (
                  <tr key={tool.href} className="border-t border-ink-200 dark:border-ink-800">
                    <td className="px-4 py-3">
                      <Link to={tool.href} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">
                        {tool.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-400">{tool.category}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-400">{tool.blurb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AI Tools */}
      <section id="ai-tools-section" className={`${sectionWrap} mt-24 animate-blur-in`}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand-500/25 animate-glow-pulse">
              <SparkIcon className="h-6 w-6 animate-float" />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 mb-1">
                Next-Gen AI
              </div>
              <h2 className={heading.h2}>AI-Powered PDF Workspace</h2>
              <p className={`mt-1 text-sm sm:text-base ${muted}`}>
                Deep document understanding, summaries, quizzes & study notes
              </p>
            </div>
          </div>
          <Link
            to="/ai-summarizer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-300"
          >
            Explore AI Suite <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 stagger-flip">
          {aiTools.map((tool) => (
            <li key={tool.href}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      {/* ── Two files jobs that a generic tool cannot do ──

          Same reason as the AI section above: these are the tools where the
          visitor's requirement is a number or a language, not a verb. Both
          carry the honesty note in the card itself rather than in the FAQ,
          because the person who needs to know the PDF may not be exact cannot
          be guaranteed is the same person who is about to click the button. */}
      <section aria-labelledby="precision-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
        <h2 id="precision-heading" className={heading.h2}>
          When a PDF has to be a specific thing
        </h2>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Most tools do a job to a file. These two do a job to a limit.
        </p>

        <ul className="mt-8 grid gap-6 lg:grid-cols-2">
          {PRECISION_TOOLS.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className="group flex h-full flex-col rounded-2xl bg-white p-7 ring-1 ring-ink-200/80 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-600/10 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:shadow-black/30 dark:hover:ring-brand-600/60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
                  <item.Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-ink-900 dark:text-white">
                  {item.title}
                </h3>
                <p className={`mt-2.5 text-sm leading-relaxed ${muted}`}>{item.body}</p>
                <p className="mt-5 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-600 dark:bg-ink-950/60 dark:text-ink-400">
                  {item.honesty}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
                  {item.cta}
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The two things worth arriving for ──

          The AI grid above is a catalogue: eight equal cards. This is not a
          catalogue. These two are the tools that do something no single-purpose
          page could — one works across several documents at once, the other
          turns a single document into four kinds of study material. They get
          space and a sentence each because "here are eight AI links" does not
          tell a visitor which one solves their problem. */}
      <section aria-labelledby="featured-ai-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
        <h2 id="featured-ai-heading" className={heading.h2}>
          Two things you can only do here
        </h2>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Every other AI tool here works on one file at a time. These two go
          further, in opposite directions.
        </p>

        <ul className="mt-8 grid gap-6 lg:grid-cols-2">
          {FEATURED_AI.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className="group flex h-full flex-col rounded-2xl bg-white p-7 ring-1 ring-ink-200/80 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-600/10 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:shadow-black/30 dark:hover:ring-brand-600/60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
                  <item.Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-ink-900 dark:text-white">
                  {item.title}
                </h3>
                <p className={`mt-2.5 text-sm leading-relaxed ${muted}`}>
                  {item.body}
                </p>
                <ul className="mt-5 space-y-2">
                  {item.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 text-sm text-ink-700 dark:text-ink-300"
                    >
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
                  {item.cta}
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Live AI Demo ── */}
      <AiDemo />

      <HowItWorks />

      <WhyUs />

      <Privacy />

      <PrivacyProof />

      <section className={`${sectionWrap} mt-20 animate-fade-in-up`}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Every day
            </p>
            <h2 className={cx(heading.h2, "mt-2")}>One useful thing, once a day</h2>
            <p className={cx(muted, "mt-3")}>
              A tip worth knowing, a task you can finish in a minute, or a single
              question worth thinking about. No account, and nothing to lose if you
              skip a day.
            </p>
            <a
              href="/daily-challenge"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"
            >
              See all of them
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
          <DailyChallengeCard compact />
        </div>
      </section>

      <section className={`${sectionWrap} mt-20 animate-fade-in-up`}>
        <Faq items={FAQ} title="Frequently asked questions" id="home-faq" />
      </section>

      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-200/70 bg-gradient-to-br from-white via-ink-50 to-brand-50/40 dark:border-[#172554] dark:bg-gradient-to-br dark:from-[#000000] dark:via-[#020617] dark:to-[#13264a]">
      <div className={`${sectionWrap} relative py-20 sm:py-24 lg:py-28 xl:py-32`}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16">
          {/* ── Left — Text content ── */}
          <div className="max-w-2xl animate-slide-in-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50/90 px-4 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-200/60 backdrop-blur-sm dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Private by default — files stay on your device
            </div>

            <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-[4rem]">
              <span className="text-ink-900 dark:text-white">Your PDFs. </span>
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-purple-600 bg-clip-text text-transparent dark:from-brand-400 dark:via-brand-300 dark:to-purple-400">
                Smarter, Faster, Easier.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg/relaxed text-ink-600 sm:text-xl/relaxed dark:text-ink-400">
              Free PDF tools and AI-powered document productivity in one place.
              Most tools run in your browser on your device; AI features send
              extracted text to an AI provider when you use them.
            </p>

            {/* The search sits above the dropzone, not inside it. Someone who
                arrives knowing the name of the job they want done ("merge two
                files") never intended to drop anything, and a dropzone alone
                asks them to do the one thing they came here to avoid. */}
            <div className="mt-8 max-w-xl">
              <ToolSearch
                placeholder="What do you want to do with your PDF?"
                label="Search PDF tools"
                className="w-full"
              />
            </div>

            <HeroDropzone />

            {/* CTA buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/tools"
                onClick={() => navEvents.cta("hero", "Explore PDF Tools")}
                className="btn-press group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:from-brand-500 hover:to-brand-600 dark:from-brand-500 dark:to-brand-600 dark:shadow-brand-600/20"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                Explore PDF Tools
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/compress-pdf"
                onClick={() => navEvents.cta("hero", "Compress a PDF")}
                className="btn-press inline-flex items-center gap-2 rounded-xl bg-white/80 px-7 py-3.5 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 backdrop-blur-sm transition-all hover:bg-white hover:ring-ink-300 hover:shadow-md dark:bg-ink-800/60 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800 dark:hover:ring-ink-600"
              >
                <BoltIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Compress a PDF
              </Link>
            </div>

            {/* The trust claims used to be three pills here. They now live in
                TrustStrip, one section lower, where each one is a link to the
                page that backs it. Repeating them here in badge form was making
                the same promise twice in two different voices, and a badge is
                the weaker of the two forms. */}
            <p className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-600 dark:text-ink-400">
              <span className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <LockIcon className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">No account needed</span>
              </span>
              <span className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">Works on your phone</span>
              </span>
            </p>
          </div>

          {/* ── Right — Laptop mockup with floating icons ── */}
          <div className="relative mx-auto hidden w-full max-w-lg lg:block animate-slide-in-right" style={{ perspective: "1200px" }}>
            {/* Ambient glow behind laptop */}
            <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-cyan-500/10 blur-2xl" />

            {/* Main desk surface */}
            <div className="relative rounded-3xl bg-gradient-to-br from-[#12121e] via-[#161625] to-[#1a1a2e] p-6 sm:p-8 ring-1 ring-white/[0.06] shadow-2xl shadow-black/40">
              {/* Screen reflection on desk */}
              <div className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-brand-500/[0.04] blur-2xl" />

              {/* ── Laptop body ── */}
              <div className="relative" style={{ transform: "rotateX(2deg)" }}>
                {/* Lid / screen housing */}
                <div className="rounded-t-2xl bg-gradient-to-b from-[#2a2a3a] to-[#1e1e2e] p-[3px] ring-1 ring-white/[0.08] shadow-inner">
                  {/* Webcam dot */}
                  <div className="relative flex justify-center pt-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-ink-700 ring-1 ring-ink-600/50">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/50 animate-glow-pulse" />
                    </div>
                  </div>
                  {/* Screen bezel */}
                  <div className="mx-1 mb-1 mt-1.5 overflow-hidden rounded-lg bg-white dark:bg-[#0c0c18]" style={{ aspectRatio: "16/10" }}>
                    {/* ── App UI mockup ── */}
                    <div className="flex h-full">
                      {/* Sidebar */}
                      <div className="hidden w-[22%] flex-shrink-0 border-r border-ink-200/80 bg-gradient-to-b from-ink-50 to-white p-2 dark:border-ink-700/60 dark:from-[#111120] dark:to-[#0e0e1c] sm:block">
                        {/* Logo */}
                        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-2 dark:bg-brand-600/15">
                          <div className="h-3 w-3 rounded bg-gradient-to-br from-brand-500 to-brand-600" />
                          <div className="h-1.5 w-10 rounded-full bg-brand-300/80 dark:bg-brand-500/60" />
                        </div>
                        {/* Nav items */}
                        {[
                          { name: "Dashboard", active: true },
                          { name: "Compress", active: false },
                          { name: "Merge", active: false },
                          { name: "Split", active: false },
                          { name: "Convert", active: false },
                          { name: "AI Tools", active: false },
                        ].map((item) => (
                          <div
                            key={item.name}
                            className={`mb-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[7px] sm:text-[8px] transition-colors ${
                              item.active
                                ? "bg-brand-100 font-semibold text-brand-700 dark:bg-brand-600/20 dark:text-brand-300"
                                : "text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800/50"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-sm ${item.active ? "bg-brand-500" : "bg-ink-300 dark:bg-ink-600"}`} />
                            {item.name}
                          </div>
                        ))}
                      </div>
                      {/* Main area */}
                      <div className="flex-1 p-3 sm:p-4">
                        {/* Top bar */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="h-2 w-24 rounded-full bg-ink-200/80 dark:bg-ink-700/60" />
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-ink-200 dark:bg-ink-700" />
                            <div className="h-2 w-2 rounded-full bg-ink-200 dark:bg-ink-700" />
                          </div>
                        </div>
                        {/* Upload zone */}
                        <div className="rounded-xl border-[1.5px] border-dashed border-brand-300/70 bg-gradient-to-b from-brand-50/60 to-white p-4 text-center dark:border-brand-700/50 dark:from-brand-900/15 dark:to-transparent sm:p-6">
                          <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 shadow-sm dark:from-brand-800/40 dark:to-brand-900/20">
                            <PdfFileIcon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                          </div>
                          <p className="text-[8px] font-bold text-brand-700 sm:text-[10px] dark:text-brand-300">
                            Drop your PDF here
                          </p>
                          <p className="mt-1 text-[6px] text-ink-400 sm:text-[7px] dark:text-ink-500">
                            or click to browse
                          </p>
                        </div>
                        {/* Quick tools row */}
                        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:grid-cols-6 sm:gap-2">
                          {[
                            { label: "Compress", gradient: "from-teal-400 to-teal-500", shadow: "shadow-teal-500/20" },
                            { label: "Merge", gradient: "from-purple-400 to-purple-500", shadow: "shadow-purple-500/20" },
                            { label: "Split", gradient: "from-blue-400 to-blue-500", shadow: "shadow-blue-500/20" },
                            { label: "Convert", gradient: "from-orange-400 to-orange-500", shadow: "shadow-orange-500/20" },
                            { label: "Rotate", gradient: "from-pink-400 to-rose-500", shadow: "shadow-rose-500/20" },
                            { label: "Delete", gradient: "from-slate-400 to-slate-500", shadow: "shadow-slate-500/20" },
                          ].map((tool) => (
                            <div
                              key={tool.label}
                              className={`flex-1 cursor-pointer rounded-lg bg-gradient-to-br ${tool.gradient} p-1.5 text-center shadow-sm ${tool.shadow} transition-transform hover:scale-105 sm:rounded-xl sm:p-2.5`}
                            >
                              <div className="mx-auto mb-1 h-3.5 w-3.5 rounded-md bg-white/30 sm:h-4 sm:w-4" />
                              <p className="text-[5px] font-bold text-white/90 sm:text-[7px]">{tool.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Hinge */}
                <div className="h-1.5 w-full bg-gradient-to-b from-[#2a2a3a] to-[#222232]" />
                {/* Base / keyboard area */}
                <div className="relative rounded-b-xl bg-gradient-to-b from-[#252535] to-[#1e1e2e] p-2 ring-1 ring-white/[0.05]">
                  <div className="mx-auto h-1 w-12 rounded-full bg-ink-600/40" />
                  {/* Keyboard hint */}
                  <div className="mt-2 grid grid-cols-6 gap-0.5 px-4">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="h-1 rounded-sm bg-ink-600/30" />
                    ))}
                  </div>
                  {/* Trackpad */}
                  <div className="mx-auto mt-2 h-4 w-[40%] rounded-md bg-ink-600/20 ring-1 ring-ink-600/10" />
                </div>
              </div>

              {/* ── Floating 3D icon badges ── */}
              {/* PDF badge — top left */}
              <div className="absolute -top-5 -left-5 animate-float" style={{ animationDelay: "0s" }}>
                <div className="group flex h-14 w-14 cursor-default items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/25 ring-1 ring-red-400/20 transition-transform hover:scale-110">
                  <span className="text-sm font-extrabold tracking-tight">PDF</span>
                </div>
              </div>

              {/* Merge badge — top right */}
              <div className="absolute -top-3 -right-6 animate-float" style={{ animationDelay: "0.6s" }}>
                <div className="group flex h-12 w-12 cursor-default items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-purple-500/25 ring-1 ring-purple-400/20 transition-transform hover:scale-110">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>

              {/* Compress badge — bottom left */}
              <div className="absolute -bottom-4 left-6 animate-float" style={{ animationDelay: "1.2s" }}>
                <div className="group flex h-11 w-11 cursor-default items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-xl shadow-teal-500/25 ring-1 ring-teal-400/20 transition-transform hover:scale-110">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Split badge — right middle */}
              <div className="absolute top-1/2 -right-7 -translate-y-1/2 animate-float" style={{ animationDelay: "1.8s" }}>
                <div className="group flex h-11 w-11 cursor-default items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/25 ring-1 ring-blue-400/20 transition-transform hover:scale-110">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>

              {/* AI sparkle badge — top center */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-float" style={{ animationDelay: "0.3s" }}>
                <div className="group flex h-10 w-10 cursor-default items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/25 ring-1 ring-amber-400/20 transition-transform hover:scale-110">
                  <SparkIcon className="h-5 w-5" />
                </div>
              </div>

              {/* Desk props */}
              {/* Coffee mug */}
              <div className="absolute -bottom-3 right-8 hidden animate-float sm:block" style={{ animationDelay: "2.2s" }}>
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg rounded-br-none bg-gradient-to-b from-ink-700 to-ink-800 ring-1 ring-ink-600/50">
                    <span className="text-[6px] font-bold tracking-wide text-brand-300/80 uppercase">PDF</span>
                  </div>
                  {/* Handle */}
                  <div className="absolute -right-1.5 top-1.5 h-4 w-2 rounded-r-full border-2 border-ink-600 border-l-0" />
                  {/* Steam */}
                  <div className="absolute -top-3 left-2.5 flex gap-0.5 opacity-40">
                    <div className="h-2 w-px rounded-full bg-ink-400 animate-float" style={{ animationDelay: "0.2s" }} />
                    <div className="h-3 w-px rounded-full bg-ink-400 animate-float" style={{ animationDelay: "0.5s" }} />
                    <div className="h-2 w-px rounded-full bg-ink-400 animate-float" style={{ animationDelay: "0.8s" }} />
                  </div>
                </div>
              </div>

              {/* Tiny plant */}
              <div className="absolute -bottom-4 left-0 hidden sm:block animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                  <LeafIcon className="h-4 w-4" />
                  <div className="mt-0.5 h-3 w-4 rounded-b-lg bg-gradient-to-b from-amber-700 to-amber-800" />
                </div>
              </div>

              {/* Connection lines (SVG) */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 400 300" fill="none">
                <defs>
                  <linearGradient id="hero-trail" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path d="M70 35 C 150 50, 280 25, 350 45" stroke="url(#hero-trail)" strokeWidth="1" strokeDasharray="3 5" />
                <path d="M330 130 C 280 170, 180 180, 80 250" stroke="url(#hero-trail)" strokeWidth="1" strokeDasharray="3 5" />
                <path d="M200 15 C 200 60, 160 100, 140 140" stroke="url(#hero-trail)" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.5" />
              </svg>
            </div>
          </div>

          {/* ── Mobile only — a phone, because that is the device in hand ── */}
          <div className="animate-slide-in-right lg:hidden">
            <MobileHeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The hero's phone version.
 *
 * The laptop mockup is deliberately desktop-only: at a phone's width its
 * sidebar and its six tool tiles shrink past the point of being readable, and
 * it would be claiming a screen nobody is holding. So below `lg` a different
 * mockup takes its place — the same app, drawn as a phone, which is the one
 * honest thing to show someone reading this on a phone.
 */
function MobileHeroPreview() {
  // Six tiles in two columns of three, which is the shape that fits a phone:
  // wide enough for an icon and a word, narrow enough to be a target a thumb
  // can hit without the row wrapping.
  const tiles = [
    { label: "Compress", Icon: CompressIcon, tint: "from-teal-400 to-teal-500", shadow: "shadow-teal-500/25" },
    { label: "Merge", Icon: MergeIcon, tint: "from-purple-400 to-purple-500", shadow: "shadow-purple-500/25" },
    { label: "Split", Icon: SplitIcon, tint: "from-blue-400 to-blue-500", shadow: "shadow-blue-500/25" },
    { label: "Convert", Icon: ToPdfIcon, tint: "from-orange-400 to-orange-500", shadow: "shadow-orange-500/25" },
    { label: "Sign", Icon: SignIcon, tint: "from-pink-400 to-rose-500", shadow: "shadow-pink-500/25" },
    { label: "Rotate", Icon: RotateIcon, tint: "from-cyan-400 to-sky-500", shadow: "shadow-cyan-500/25" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[19rem] animate-slide-in-right">
      {/* Ambient glow, matching the laptop's */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-cyan-500/10 blur-2xl" />

      <div className="relative rounded-[2rem] bg-gradient-to-br from-[#12121e] via-[#161625] to-[#1a1a2e] p-3 ring-1 ring-white/[0.06] shadow-2xl shadow-black/40">
        {/* Phone body */}
        <div className="relative overflow-hidden rounded-[1.6rem] bg-[#0c0c18] ring-1 ring-white/[0.06]">
          {/* Notch */}
          <div className="relative z-10 flex justify-center pt-2">
            <div className="h-1.5 w-16 rounded-full bg-ink-700/70" />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 text-[7px] font-semibold text-ink-400">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Private
            </span>
          </div>

          {/* App header — brand mark, then the screen's own heading */}
          <div className="flex items-center gap-2 px-4 pt-1 pb-3">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-brand-500 to-brand-600" />
            <div className="h-1.5 w-14 rounded-full bg-brand-300/70" />
          </div>

          {/* Heading. It is the mockup's own heading, not a duplicate of the
              hero's — this is a picture of the app, and the app opens on this.
              The colours are fixed rather than theme-aware: the phone's screen is
              dark in both themes, so a heading that followed the site theme would
              be white-on-white in one of them. */}
          <p className="px-4 text-[15px] leading-tight font-extrabold tracking-tight text-white">
            Powerful PDF Tools
          </p>

          {/* Two primary actions, stacked: on a phone the full width is the
              only comfortable target. */}
          <div className="mt-2.5 space-y-1.5 px-4">
            <div className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2 text-[10px] font-bold text-white shadow-lg shadow-brand-500/30">
              Explore PDF Tools
              <ArrowRightIcon className="h-3 w-3" />
            </div>
            <div className="flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2 text-[10px] font-bold text-ink-100 ring-1 ring-white/10">
              <CompressIcon className="h-3 w-3 text-brand-300" />
              Compress a PDF
            </div>
          </div>

          {/* 2×3 grid of the six tools a phone opens on. Each card carries the
              tool's real icon rather than a placeholder square. */}
          <div className="mt-3 grid grid-cols-2 gap-2 px-4">
            {tiles.map((tool) => (
              <div
                key={tool.label}
                className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-br ${tool.tint} p-2.5 shadow-md ${tool.shadow} ring-1 ring-white/20`}
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-white/25 shadow-inner">
                  <tool.Icon className="h-3 w-3 text-white" />
                </span>
                <span className="text-[9px] font-bold text-white">{tool.label}</span>
              </div>
            ))}
          </div>

          {/* Search — below the tools, because on a phone you reach for a
              specific tool first and only fall back to searching. */}
          <div className="mt-3 mx-4 flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-2 ring-1 ring-white/10">
            <SearchIcon className="h-3 w-3 flex-shrink-0 text-brand-300" />
            {/* Reads "Search tools", not "AI-Powered Search". There is no AI
                search on this site — the header typeahead is a plain substring
                match — and a mockup advertising a feature that does not exist
                is the sort of thing a visitor who is about to hand over a file
                notices. */}
            <span className="text-[9px] text-ink-400">Search tools</span>
          </div>

          {/* Dropzone last, at the thumb's rest position at the bottom of the
              screen, and compact: enough to tap, not enough to push the page. */}
          <div className="mx-4 mt-2.5 mb-4 flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-brand-300/60 bg-brand-500/[0.07] py-3">
            <PdfFileIcon className="h-3.5 w-3.5 text-brand-300" />
            <span className="text-[9px] font-bold text-brand-200">Drop PDF here</span>
          </div>
        </div>

        {/* Floating badges, kept but scaled down and pulled in so they do not
            hang off the edge of a narrow screen. */}
        <div className="absolute -top-3 -left-4 animate-float">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/25 ring-1 ring-red-400/20">
            <span className="text-xs font-extrabold tracking-tight">PDF</span>
          </div>
        </div>
        <div className="absolute top-1/3 -right-4 animate-float" style={{ animationDelay: "0.6s" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-purple-500/25 ring-1 ring-purple-400/20">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 004.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
        <div className="absolute -bottom-3 left-2 animate-float" style={{ animationDelay: "1.2s" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-xl shadow-teal-500/25 ring-1 ring-teal-400/20">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_PROMPTS = [
  { icon: NotesIcon, label: "Summarize", prompt: "Summarize what PDF Quick Tools offers in 3 bullet points." },
  { icon: LightbulbIcon, label: "Explain", prompt: "Explain how PDF compression works in simple terms." },
  { icon: TargetIcon, label: "Quiz me", prompt: "Create 3 true/false questions about PDF file formats." },
  { icon: KeyIcon, label: "Key points", prompt: "List the top 5 most useful free PDF tools everyone should know about." },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("The image could not be read.")));
    reader.readAsDataURL(file);
  });
}

function AiDemo() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend(prompt?: string) {
    const q = prompt || input.trim();
    if ((!q && !attachment) || loading) return;
    setInput("");
    const file = attachment;
    const question = q || "Analyze this uploaded file and summarize the most important information.";
    setAttachment(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: file ? `${question} (${file.name})` : question },
    ]);
    setLoading(true);
    try {
      let image: AiAttachment | undefined;
      let reply: string;
      if (file?.type === "application/pdf") {
        const text = await extractPdfText(file);
        if (!text.trim()) throw new Error("Could not extract text from this PDF.");
        reply = await processAiDocument(
          text,
          (chunk) =>
            `You are a friendly AI assistant for PDF Quick Tools (a free browser-based PDF utility). Keep answers short (2-4 sentences max), helpful, and casual. User asked: ${question}\n\nPDF section:\n${chunk}`,
          (parts) =>
            `Combine the answers from consecutive parts of the uploaded PDF. Answer only from their evidence, avoid repetition, and say if the document does not provide the answer. Keep the response short (2-4 sentences), helpful, and casual.\n\nUser asked: ${question}\n\nPartial answers:\n${JSON.stringify(parts)}`,
        );
      } else if (file?.type.startsWith("image/")) {
        image = { mimeType: file.type, data: (await readFileAsDataUrl(file)).split(",")[1] ?? "" };
        reply = await callGemini(
          `You are a friendly AI assistant for PDF Quick Tools (a free browser-based PDF utility). Keep answers short (2-4 sentences max), helpful, and casual. User asked: ${question}`,
          image,
        );
      } else {
        reply = await callGemini(
          `You are a friendly AI assistant for PDF Quick Tools (a free browser-based PDF utility). Keep answers short (2-4 sentences max), helpful, and casual. User asked: ${question}`,
        );
      }
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            error instanceof Error && error.message
              ? error.message
              : "AI is unavailable right now. Try again in a moment!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function chooseAttachment(file: File | undefined) {
    if (!file) return;
    if (!(file.type === "application/pdf" || file.type.startsWith("image/"))) return;
    if (file.size > 7 * 1024 * 1024) {
      setMessages((prev) => [...prev, { role: "ai", text: "Please choose a PDF or image smaller than 7 MB." }]);
      return;
    }
    setAttachment(file);
  }

  return (
    <section id="ai-live-demo" className={`${sectionWrap} mt-20`}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0c1a] via-[#10102a] to-[#0a0f1e] p-6 sm:p-8 lg:p-10 ring-1 ring-white/[0.06] shadow-2xl shadow-brand-900/20">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white animate-glow-pulse">
              <SparkIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                Try AI Live
              </h2>
              <p className="text-xs text-ink-400 sm:text-sm">
                Ask anything about PDFs, file formats, or our tools. Attaching a PDF or
                image sends that content to our AI provider.
              </p>
            </div>
          </div>

          {/* Quick prompt chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {DEMO_PROMPTS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={loading}
                onClick={() => handleSend(chip.prompt)}
                className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-ink-300 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.1] hover:text-white hover:ring-brand-500/40 disabled:opacity-50 sm:text-sm"
              >
                <chip.icon className="h-3.5 w-3.5 shrink-0" />
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className="mt-5 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-black/20 p-4 ring-1 ring-white/[0.04]">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-brand-300 ring-1 ring-white/[0.06]">
                  <BrainIcon className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-ink-300">
                  Pick a prompt above or type your own question
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Answers are generated by an AI provider and may contain mistakes.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-md"
                      : "bg-white/[0.07] text-ink-200 ring-1 ring-white/[0.06] rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white/[0.07] px-4 py-3 ring-1 ring-white/[0.06]">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "0s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "0.15s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mt-4 flex flex-wrap gap-2"
          >
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-ink-300 ring-1 ring-white/[0.08] transition hover:bg-white/[0.1] hover:text-white">
              Attach file
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                disabled={loading}
                onChange={(event) => {
                  void chooseAttachment(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about PDFs..."
              disabled={loading}
              className="min-w-[12rem] flex-1 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-ink-500 ring-1 ring-white/[0.08] outline-none transition-all focus:ring-brand-500/50 focus:ring-2 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-press rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
          {attachment && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-brand-500/10 px-3 py-2 text-xs text-brand-200 ring-1 ring-brand-400/20">
              <span className="truncate">Attached: {attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="shrink-0 font-semibold text-brand-300 hover:text-white">Remove</button>
            </div>
          )}
          <AiNotice className="mt-4" />
        </div>
      </div>
    </section>
  );
}

// Annotated rather than inferred: without it TypeScript widens `art` to a bare
// `string`, and a typo like "uplaod" would sail through the typecheck and only
// fail at runtime as an unstyled card.
const STEPS: Array<{
  number: string;
  title: string;
  body: string;
  icon: (props: { className?: string }) => React.ReactElement;
  badge: string;
  art: StepArt;
}> = [
  {
    number: "01",
    title: "Select & Upload",
    body: "Drop a PDF file or choose one from your device. Most regular tools run in the browser.",
    icon: FolderIcon,
    badge: "Browser-based",
    art: "upload",
  },
  {
    number: "02",
    title: "One-Click Magic",
    body: "Choose compress, merge, convert, or use an AI feature. Most tasks run with fast browser-side processing.",
    icon: BoltIcon,
    badge: "Fast processing",
    art: "edit",
  },
  {
    number: "03",
    title: "Download Instantly",
    body: "Save the finished result directly to your device after processing.",
    icon: DownloadIcon,
    badge: "Download-ready",
    art: "download",
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className={`${sectionWrap} mt-24 animate-slide-in-right`}>
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700/40 mb-3">
          Streamlined Process
        </span>
        <h2 id="how-heading" className={heading.h2}>
          How It Works in 3 Quick Steps
        </h2>
        <p className={`mt-2.5 text-base ${muted}`}>
          No account required, and most regular PDF tools run directly in your browser.
        </p>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3 stagger-slide relative">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="group relative rounded-3xl bg-white p-8 ring-1 ring-ink-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-500/10 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-500/50"
          >
            {/* The illustration sits above the text so the row reads as three
                screens of one flow — upload, edit, save — rather than three
                headings with decorative corners. It is the first thing the eye
                lands on and the reason the section looks like a demonstration
                instead of a bullet list. */}
            <StepIllustration art={step.art} />

            <div className="mt-5 flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-transform duration-300 group-hover:scale-110 dark:bg-brand-900/30 dark:text-brand-300">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-3xl font-black text-ink-500 transition-colors group-hover:text-brand-600 dark:text-ink-400 dark:group-hover:text-brand-300">
                {step.number}
              </span>
            </div>

            <div className="mt-4">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {step.badge}
              </span>
              <h3 className="mt-1 text-lg font-bold text-ink-900 dark:text-white">
                {step.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const REASONS = [
  {
    icon: BoltIcon,
    title: "Fast Browser-Based Processing",
    body: "Most regular PDF tools run directly in the browser on your device, which keeps everyday workflows efficient.",
    highlight: "Fast PDF processing",
  },
  {
    icon: LockIcon,
    title: "Privacy-First Processing",
    body: "Regular PDF tools work in the browser on your device. AI features may send extracted text to our AI provider for analysis.",
    highlight: "Browser-first privacy",
  },
  {
    icon: SparkIcon,
    title: "Free PDF Tools",
    body: "Simple document tools without an account, with browser and file-size limits depending on device memory and task type.",
    highlight: "Free to use",
  },
];

function WhyUs() {
  return (
    <section aria-labelledby="why-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
      <div className="text-center max-w-xl mx-auto">
        <h2 id="why-heading" className={heading.h2}>
          Engineered for Frictionless Workflows
        </h2>
        <p className={`mt-2.5 ${muted}`}>
          Why PDF Quick Tools is useful.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-3 stagger-bounce">
        {REASONS.map((reason) => (
          <li
            key={reason.title}
            className="group relative rounded-3xl bg-white p-8 ring-1 ring-ink-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-500/10 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-500/50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white dark:from-brand-900/40 dark:to-brand-800/30 dark:text-brand-300 dark:group-hover:bg-brand-600 dark:group-hover:text-white">
              <reason.icon className="h-6 w-6" />
            </span>
            <span className="mt-6 inline-block text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {reason.highlight}
            </span>
            <h3 className="mt-1 text-lg font-bold text-ink-900 dark:text-white">
              {reason.title}
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{reason.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PRIVACY_POINTS = [
  "Most regular PDF tools run in your browser on your own device.",
  "AI features may send extracted text to the AI provider when you choose an AI action.",
  "The original PDF remains on your device unless you explicitly upload it as part of an AI workflow.",
  "The finished file stays in browser memory until you close the tab or refresh the page.",
  "No account is required for the main PDF tools, and analytics are kept limited to basic usage events.",
];

function Privacy() {
  return (
    <section
      aria-labelledby="privacy-heading"
      className={`${sectionWrap} mt-20 animate-blur-in`}
    >
      <div className="overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10 dark:bg-ink-900 dark:ring-1 dark:ring-ink-800">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-300 animate-glow-pulse">
              <LockIcon className="h-5.5 w-5.5 animate-float" />
            </span>
            <h2 id="privacy-heading" className="mt-5 text-2xl font-bold sm:text-3xl">
              Your files stay private
            </h2>
            <p className="mt-4 text-ink-300">
              Most regular PDF tools run directly in your browser on your device.
              AI features may send extracted text to our AI provider when you
              choose an AI action, while the original PDF stays on your device.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/privacy" className={button("primary", "md")}>
                Read the Privacy Policy
              </Link>
              <Link
                to="/tools"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10"
              >
                Try a tool
              </Link>
            </div>
          </div>

          <ul className="space-y-3.5">
            {PRIVACY_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-ink-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-sm text-ink-400">
          We don't need your account to use our basic PDF tools.
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={`${sectionWrap} mt-20 animate-fade-in-up`}>
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-purple-600 px-6 py-12 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Pick a tool and get it done
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">
          Upload, process, download. No account, no software, no waiting for an
          upload to finish.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/tools"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50 btn-ripple hover-scale"
          >
            Explore PDF Tools
          </Link>
          <Link
            to="/merge-pdf"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold text-white ring-1 ring-inset ring-white/40 transition-colors hover:bg-white/10 btn-ripple hover-scale"
          >
            Merge PDFs
          </Link>
        </div>
      </div>
    </section>
  );
}
