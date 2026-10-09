import { Link } from "@tanstack/react-router";
import { CheckIcon, LockIcon, BoltIcon, LeafIcon } from "./Icons";
import { sectionWrap } from "./ui";

/**
 * The four promises, stated as things a visitor can check.
 *
 * The hero already carries a privacy badge and three trust pills, and between
 * them they were making four claims in two places with two different voices.
 * This is the one place they live. Each entry links to the page that backs it,
 * so a claim is never just a claim — "no account" and "free" are the two most
 * repeated things said about a PDF site and the two easiest to verify, and a
 * page that shows you how to check is doing something a badge cannot.
 *
 * Why these four and not others: they are the four that decide whether someone
 * hands over a document they are not supposed to have. File size, speed and tool
 * count matter, but they are the differentiators; these are the objections.
 */
const PROMISES = [
  {
    Icon: LeafIcon,
    title: "Your file stays on your device",
    body: "Most tools never upload anything. The work happens in this browser tab, so there is no copy on a server to leak or subpoena.",
    href: "/privacy",
    cta: "How privacy works here",
  },
  {
    Icon: LockIcon,
    title: "No account, ever",
    body: "No email, no password, no sign-up wall in front of a tool you only needed once. There is nothing here to register for.",
    href: "/tools",
    cta: "Browse every tool",
  },
  {
    Icon: BoltIcon,
    title: "Nothing is behind a paywall",
    body: "Compression level, page limits, file size — the useful settings are all free. There is no paid tier holding the good options back.",
    href: "/tools",
    cta: "See what is included",
  },
  {
    Icon: CheckIcon,
    title: "Files are cleaned up",
    body: "Anything that has to reach a server is deleted on a fixed schedule, and AI tools say on the page that your text leaves your device.",
    href: "/privacy",
    cta: "Read the retention policy",
  },
] as const;

export function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-heading"
      className={`${sectionWrap} mt-20 animate-fade-in-up`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="trust-heading" className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl dark:text-white">
          Four things worth checking before you trust a PDF site
        </h2>
        <p className="mt-2.5 text-ink-600 dark:text-ink-400">
          Every one of these is a link to the page that backs it, not a badge
          asking to be believed.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((promise) => (
          <li key={promise.title}>
            <div className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 transition-shadow hover:shadow-md dark:bg-ink-900 dark:ring-ink-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-400">
                <promise.Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">
                {promise.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                {promise.body}
              </p>
              {/* The link sits outside the prose so the whole card is not a link:
                  a card-sized hit area that navigates away is surprising when
                  the visitor was trying to read it. */}
              <Link
                to={promise.href}
                className="mt-4 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                {promise.cta} →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
