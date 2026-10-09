import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toolEvents } from "#/lib/analytics";
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, softwareJsonLd, type FaqItem } from "#/lib/seo";
import { howToFor } from "#/lib/how-to";
import { isFavourite, toggleFavourite } from "#/lib/storage";
import { toolSectionsFor } from "#/lib/tool-sections";
import { relatedTools, type Tool, type ToolHref } from "#/lib/tools";
import { AdSlot } from "./AdSlot";
import { Banner160x600Ad } from "./Banner160x600Ad";
import { Faq } from "./Faq";
import { HowTo } from "./HowTo";
import { ArrowRightIcon, LockIcon } from "./Icons";
import { InstallPrompt } from "./InstallPrompt";
import { KeyboardHelp, KeyboardTip, NextSteps } from "./KeyboardHelp";
import { useNoteVisit } from "./MyToolsBar";
import { PageDropzone } from "./PageDropzone";
import { ToolErrorBoundary } from "./ToolErrorBoundary";
import { ToolIconTile } from "./ToolIconTile";
import { heading, muted } from "./ui";

interface ToolShellProps {
  tool: Tool;
  /** The working area: uploader, options, progress, result. */
  children: React.ReactNode;
  /** Short explanatory paragraphs shown under the tool. */
  about: React.ReactNode;
  faq: FaqItem[];
}

export function ToolShell({ tool, children, about, faq }: ToolShellProps) {
  // Looked up by path rather than passed in, so adding a tool gets its walkthrough
  // without touching that route. A tool with no entry yet simply shows nothing.
  const howTo = howToFor(tool.href);
  const sections = toolSectionsFor(tool.href);
  useEffect(() => {
    toolEvents.opened(tool.name);
  }, [tool.name]);
  // Fills "Your tools" on the homepage from actual use rather than from clicks
  // on a homepage link. Route path only — see `#/lib/storage`.
  useNoteVisit(tool.href);

  const related = relatedTools(tool.href);
  const isAiTool = tool.category === "AI Tools";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Anywhere on this page, not just the box in the middle. */}
      <PageDropzone />
      <aside
        aria-label="Advertisement"
        className="fixed top-1/2 z-20 hidden -translate-y-1/2 xl:block"
        style={{ right: "max(16px, calc((100vw - 896px) / 2 - 176px))" }}
      >
        <Banner160x600Ad />
      </aside>
      <div className="min-w-0">
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
            <li className="font-medium text-ink-700 dark:text-ink-300" aria-current="page">
              {tool.name}
            </li>
          </ol>
        </nav>

        <header className="flex flex-col items-start gap-4 animate-slide-in-left sm:flex-row sm:items-center">
          <ToolIconTile name={tool.icon} size="lg" className="animate-rotate-in" />
          <div className="min-w-0 flex-1">
            <h1 className={heading.h1}>{tool.name}</h1>
            <p className={`mt-1.5 text-lg ${muted}`}>{tool.subtitle}</p>
          </div>
          <SelfStar tool={tool} />
        </header>

        <div className="mt-8 min-w-0">
          <div className="animate-blur-in" style={{ animationDelay: "0.1s" }}>
            <ToolErrorBoundary toolName={tool.name}>{children}</ToolErrorBoundary>
          </div>

          <KeyboardTip />

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-ink-500 dark:text-ink-500">
            <LockIcon className="h-4 w-4 shrink-0" />
            {isAiTool
              ? "Your original PDF stays in this browser. Extracted text may be sent to the AI provider when you run an AI action."
              : "Most regular PDF tools run in this browser tab on your device. They are not uploaded to a server as part of the standard workflow."}
          </p>

          {/* Below the tool and above the prose, so the ad never sits between the
              user and the result they just produced. */}
          <AdSlot format="inArticle" className="mt-10" />

          <section aria-labelledby="about-heading" className="prose-none">
            <h2 id="about-heading" className={heading.h2}>
              About {tool.name}
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
              {about}
            </div>
          </section>

          <HowTo toolName={tool.name} steps={howTo} />

          {/* The second slot sits inside the prose, not at its foot: tool pages
              now carry enough written content that one ad leaves the page
              looking thin halfway down, and AdSense wants in-article ads to
              break up the text rather than only sit at the end of it. */}
          <AdSlot format="inArticle" className="mt-10" />

          {sections.length > 0 && (
            <section aria-labelledby="details-heading" className="mt-12">
              <h2 id="details-heading" className={heading.h2}>
                {tool.name} details and limits
              </h2>
              <div className="mt-5 space-y-7">
                {sections.map((section) => (
                  <div key={section.heading} className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink-900 dark:text-white">
                      {section.heading}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Faq items={faq} title={`${tool.name} questions`} />

          <NextSteps from={tool.href as ToolHref} />

          <InstallPrompt />

          <KeyboardHelp />

          <section aria-labelledby="related-heading" className="mt-16">
            <h2 id="related-heading" className={heading.h2}>
              Other PDF tools
            </h2>
            {/* min-w-0 on each item lets a grid item shrink below its content
                width, which is what keeps the row from pushing the page sideways
                on a narrow screen. */}
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 stagger-slide">
              {related.map((item) => (
                <li key={item.href} className="min-w-0">
                  <Link
                    to={item.href}
                    className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-ink-200 transition-colors hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-600/60"
                  >
                    <ToolIconTile name={item.icon} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900 dark:text-white">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-ink-500 dark:text-ink-500">
                        {item.blurb}
                      </span>
                    </span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5">
              <Link
                to="/tools"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"
              >
                See all PDF tools
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </p>
          </section>

          <script
            type="application/ld+json"
            // Static, built from our own data. No user input reaches it.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                softwareJsonLd({
                  name: tool.name,
                  description: tool.blurb,
                  path: tool.href,
                }),
                faqJsonLd(faq),
                breadcrumbJsonLd([
                  { name: "Home", path: "/" },
                  { name: "All Tools", path: "/tools" },
                  { name: tool.name, path: tool.href },
                ]),
                howTo.length > 0
                  ? howToJsonLd({
                      name: `How to ${tool.name}`,
                      description: tool.blurb,
                      path: tool.href,
                      steps: howTo,
                    })
                  : null,
              ].filter(Boolean)),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Star the tool you are currently on.
 *
 * The same action as the star on a card in the grid, in the one place where it
 * answers the question a visitor actually has: "do I want this again?" — which
 * is asked while looking at the tool, not while browsing for it.
 *
 * Read after mount rather than during render, because tool pages are
 * prerendered and there is no localStorage at that point.
 */
function SelfStar({ tool }: { tool: Tool }) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isFavourite(tool.href));
  }, [tool.href]);

  return (
    <button
      type="button"
      aria-pressed={starred}
      onClick={() => setStarred(toggleFavourite(tool.href).includes(tool.href))}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-600 ring-1 ring-ink-200 transition-colors hover:bg-ink-50 hover:text-ink-900 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-800 dark:hover:bg-ink-800 dark:hover:text-white"
    >
      <svg
        aria-hidden="true"
        className={`h-4 w-4 ${starred ? "text-amber-500 dark:text-amber-400" : ""}`}
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.5 3.5a1 1 0 0 1 1.9 0l2.3 5.2 5.6.6a1 1 0 0 1 .6 1.8l-4.2 3.7 1.2 5.5a1 1 0 0 1-1.5 1.1L12 18.6l-4.9 2.8a1 1 0 0 1-1.5-1.1l1.2-5.5L2.6 11a1 1 0 0 1 .6-1.8l5.6-.6 2.3-5.2z"
        />
      </svg>
      {starred ? "Saved" : "Save for later"}
    </button>
  );
}

/** The white panel every tool's working area sits in. */
export function ToolPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/80 shadow-sm sm:p-7 dark:bg-ink-900/70 dark:ring-ink-800">
      {/* Capped rather than full-bleed: the surrounding copy runs the page
          width, but a control panel stretched to 1150px puts the option and
          the button that applies it at opposite ends of the screen. */}
      <div className="mx-auto flex max-w-3xl flex-col gap-5">{children}</div>
    </div>
  );
}

export function OptionGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-900 dark:text-white">
        {legend}
      </legend>
      {hint && <p className="mt-1 text-sm text-ink-500 dark:text-ink-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}
