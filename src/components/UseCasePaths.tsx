import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BrainIcon, FolderIcon, SparkIcon } from "./Icons";
import { heading, muted, sectionWrap } from "./ui";

const AUDIENCES = [
  {
    title: "Students & learning",
    description: "Turn reading into notes, practice questions, and clear summaries.",
    Icon: BrainIcon,
    links: [
      { label: "Summarize a PDF", href: "/ai-summarizer" },
      { label: "Make study notes", href: "/ai-notes" },
      { label: "Generate a quiz", href: "/ai-quiz" },
    ],
  },
  {
    title: "Work & office",
    description: "Prepare documents for email, editing, and sharing.",
    Icon: FolderIcon,
    links: [
      { label: "Compress a PDF", href: "/compress-pdf" },
      { label: "Convert to Word", href: "/pdf-to-word" },
      { label: "Sign a PDF", href: "/sign-pdf" },
    ],
  },
  {
    title: "Everyday documents",
    description: "Combine, organize, or protect the PDFs you use every day.",
    Icon: SparkIcon,
    links: [
      { label: "Merge PDFs", href: "/merge-pdf" },
      { label: "JPG to PDF", href: "/jpg-to-pdf" },
      { label: "Protect a PDF", href: "/protect-pdf" },
    ],
  },
] as const;

export function UseCasePaths() {
  return (
    <section aria-labelledby="audiences-heading" className={`${sectionWrap} mt-20 animate-fade-in-up`}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="audiences-heading" className={heading.h2}>
          Start with the kind of work you need to do
        </h2>
        <p className={`mt-2.5 ${muted}`}>
          A few quick paths through the tools—choose a task and get started.
        </p>
      </div>

      <ul className="mt-8 grid gap-5 lg:grid-cols-3">
        {AUDIENCES.map((audience) => (
          <li key={audience.title}>
            <article className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-ink-200/80 dark:bg-ink-900 dark:ring-ink-800">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
                <audience.Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">
                {audience.title}
              </h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${muted}`}>
                {audience.description}
              </p>
              <ul className="mt-5 space-y-2.5">
                {audience.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {link.label}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
