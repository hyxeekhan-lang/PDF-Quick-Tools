import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LockIcon, SearchIcon, SparkIcon, UploadIcon } from "./Icons";
import { button } from "./ui";
import { KEYS, readFlag, writeFlag } from "#/lib/storage";
import { TOOLS } from "#/lib/tools";

/**
 * A four-step introduction, shown once, on the homepage.
 *
 * ## Why this exists
 *
 * The site has 55 tools and no account, so a returning visitor has no way back
 * to the one they used last week except "Your tools" on the homepage and the
 * recents list in their own browser. Someone arriving once and not bookmarking
 * has, on a site this size, very little reason to come back — which is the
 * problem a tour is meant to solve.
 *
 * But a tour that only explains the site does not create a reason to return. So
 * the steps are not a feature list: they end on the three things that make
 * coming back worthwhile — star a tool, drop a file without choosing first, and
 * press the keyboard shortcut.
 *
 * ## Why it does not take over the screen
 *
 * No overlay, no spotlight, no "next next next". It is a dismissible card at
 * the top of the homepage, because a visitor who wants a PDF compressed is not
 * here to be walked through a product tour, and the ones who do want it will
 * read it in the four seconds it takes to skip.
 *
 * ## Why it is a local flag and not a server-side state
 *
 * The same reasoning as every other stored preference here: this site keeps no
 * record of who visits it, so "has seen the tour" is stored in the visitor's
 * own browser and nowhere else. Clearing site data brings it back once, which is
 * the correct behaviour for a flag the server has no way to hold.
 */
export function WelcomeTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  // After mount, never during render: the homepage is prerendered, and reading
  // localStorage while there is no window would throw.
  useEffect(() => {
    if (readFlag(KEYS.seenTour)) return;
    // A short delay so the card does not arrive competing with the hero's own
    // entrance animation, and so a visitor who came to upload something has
    // usually already started before it appears.
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    writeFlag(KEYS.seenTour);
    setVisible(false);
  }

  if (!visible) return null;

  const steps = [
    {
      icon: SearchIcon,
      title: `${TOOLS.length} PDF tools, all in one place`,
      body: "Compress, merge, split, convert, edit, sign, and a dozen AI tools that work on your document. Search by typing part of the task — “make smaller”, “rotate”, “remove pages”.",
    },
    {
      icon: UploadIcon,
      title: "Drop a file and we will pick the tool",
      body: "You do not have to choose first. Drag a PDF onto the home page and it takes you to the tool that usually fits, which you can then change.",
    },
    {
      icon: LockIcon,
      title: "The file never leaves your device",
      body: "Regular PDF tools run in this browser tab. Only the AI tools send extracted text, and only when you press the AI button. You can watch the byte counter on the home page to confirm it.",
    },
    {
      icon: SparkIcon,
      title: "Two things to do before you go",
      body: "Star any tool you like and it stays in Your tools on this device. And press ? on any page to see the keyboard shortcuts — the fastest way back in is not typing the address.",
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <section
      aria-labelledby="tour-heading"
      className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/80 shadow-sm sm:p-6 dark:bg-ink-900 dark:ring-ink-800"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <current.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="tour-heading" className="text-base font-semibold text-ink-900 dark:text-white">
              {current.title}
            </h2>
            {/* Step count as words, not "2/4". A screen reader announcing a
                fraction is noise; announcing "Step 2 of 4" is information. */}
            <span className="shrink-0 text-xs text-ink-500 dark:text-ink-500">
              Step {step + 1} of {steps.length}
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            {current.body}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {last ? (
              <Link to="/tools" onClick={dismiss} className={button("primary", "sm")}>
                Browse all {TOOLS.length} tools
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                className={button("primary", "sm")}
              >
                Next
              </button>
            )}

            <button type="button" onClick={dismiss} className={button("ghost", "sm")}>
              {last ? "Done" : "Skip"}
            </button>

            {/* Dots are buttons, so the tour can be jumped around in either
                direction rather than only forwards through Next. */}
            <span className="ml-auto flex gap-1.5">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  aria-label={`Step ${index + 1}: ${item.title}`}
                  aria-current={index === step ? "step" : undefined}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === step
                      ? "bg-brand-600"
                      : "bg-ink-300 hover:bg-ink-400 dark:bg-ink-700 dark:hover:bg-ink-600"
                  }`}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}