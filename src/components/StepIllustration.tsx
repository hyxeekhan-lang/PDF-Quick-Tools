/**
 * The illustrations inside the three "how it works" cards.
 *
 * The previous version of this section had a coloured icon in the corner of
 * each card. That reads as a bullet list with three headings, not as a
 * demonstration — a visitor cannot tell from an icon that step two is where
 * they edit and step three is where they get the file back.
 *
 * So each card now carries a mockup of the actual screen at that step, drawn in
 * plain divs and a few inline SVGs. Nothing here is a screenshot: they are
 * built from the same tokens as the rest of the site, which means they stay
 * sharp at any density, cost no image weight, and cannot go stale when a tool's
 * real UI changes.
 *
 * All three are decorative. The step's meaning is carried by the heading and
 * body text beneath, so the whole illustration is hidden from assistive tech —
 * announcing "a document with a download button" would be noise, not content.
 */

export type StepArt = "upload" | "edit" | "download";

/**
 * The pastel wash behind each card. Kept as three explicit gradients rather
 * than one reused gradient so the row reads as three distinct cards, which is
 * what makes the set feel like a set of steps rather than a repeated pattern.
 * The dark values are the same hues dropped to a fraction of the opacity, so
 * the cards keep their identity without glowing against a dark page.
 */
const WASH: Record<StepArt, string> = {
  upload:
    "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-orange-50 dark:from-violet-500/10 dark:via-fuchsia-500/5 dark:to-orange-500/10",
  edit:
    "bg-gradient-to-br from-emerald-100 via-cyan-50 to-sky-100 dark:from-emerald-500/10 dark:via-cyan-500/5 dark:to-sky-500/10",
  download:
    "bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100 dark:from-amber-500/10 dark:via-rose-500/5 dark:to-orange-500/10",
};

/** Shared chrome for the white "screen" that sits on top of the wash. */
const SCREEN =
  "rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-ink-900/[0.06] dark:bg-ink-900 dark:ring-white/[0.08]";

/** Grey placeholder bars standing in for text. */
const LINE = "h-1.5 rounded-full bg-ink-900/[0.07] dark:bg-white/[0.10]";

export function StepIllustration({ art }: { art: StepArt }) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-44 overflow-hidden rounded-2xl p-4 sm:h-52 ${WASH[art]}`}
    >
      <div className="flex h-full items-center justify-center">
        {art === "upload" ? <UploadArt /> : art === "edit" ? <EditArt /> : <DownloadArt />}
      </div>
    </div>
  );
}

/** Step one: the drop target, with a file chip resting on it. */
function UploadArt() {
  return (
    <div className={`${SCREEN} w-full max-w-[15rem]`}>
      {/* Drop target. The dashed border and the tinted fill are both part of the
          real component's own styling, so this matches what a visitor sees. */}
      <div className="rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/60 px-3 py-3.5 dark:border-brand-700 dark:bg-brand-500/10">
        <p className="text-[11px] font-medium text-brand-700 dark:text-brand-300">
          Drop your file here
        </p>
      </div>

      {/* Two grey rules beneath, suggesting the rest of the page below the fold. */}
      <div className="mt-3 space-y-2">
        <div className={`${LINE} w-3/4`} />
        <div className={`${LINE} w-1/2`} />
      </div>

      {/* The file chip overlaps the drop target's corner and floats above it —
          it needs a shadow and a solid ring to read as lifted off the surface
          rather than printed on it. */}
      <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-800 shadow-lg shadow-ink-900/10 ring-1 ring-ink-900/[0.06] dark:bg-ink-800 dark:text-ink-100 dark:ring-white/10">
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-brand-600 dark:text-brand-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 3v5h5M7 3h6l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
          />
        </svg>
        your file.pdf
      </div>
    </div>
  );
}

/** Step two: a file in the queue, page chips, and an editable field. */
function EditArt() {
  return (
    <div className={`${SCREEN} w-full max-w-[15rem]`}>
      {/* The queued file. */}
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 shrink-0 rounded-full bg-ink-900/[0.06] dark:bg-white/[0.10]" />
        <span className="text-[11px] font-medium text-ink-600 dark:text-ink-300">
          your file.pdf
        </span>
      </div>

      {/* Page chips. The first is filled to show the selection that step two is
          about — without that contrast the row reads as decoration. */}
      <div className="mt-3 flex gap-1.5">
        {[true, false, false, false, false, false].map((active, index) => (
          <span
            key={index}
            className={`h-5 w-4 rounded-[5px] ${
              active ? "bg-brand-400" : "bg-ink-900/[0.07] dark:bg-white/[0.10]"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <div className={`${LINE} w-full`} />
      </div>

      {/* The editable field. The caret on the right is what tells you this box
          takes input rather than just displaying text. */}
      <div className="mt-3 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/50 px-2.5 py-2.5 dark:border-brand-700 dark:bg-brand-500/10">
        <p className="text-[11px] text-brand-700 dark:text-brand-300">Edit this text</p>
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-3 w-px translate-y-[2px] bg-brand-500 align-middle"
        />
      </div>

      {/* Toolbar row: a filled action button beside an empty input. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
            />
          </svg>
        </span>
        <span className="h-6 flex-1 rounded-md border border-ink-900/[0.08] dark:border-white/10" />
      </div>
    </div>
  );
}

/** Step three: the finished file with its share and download actions. */
function DownloadArt() {
  return (
    <div className={`${SCREEN} relative w-full max-w-[15rem]`}>
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 shrink-0 rounded-full bg-ink-900/[0.06] dark:bg-white/[0.10]" />
        <span className="text-[11px] font-medium text-ink-600 dark:text-ink-300">
          your file.pdf
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className={`${LINE} w-full`} />
        <div className={`${LINE} w-11/12`} />
        <div className={`${LINE} w-9/12`} />
      </div>

      {/* The action bar sits over the lines rather than below them, overlapping
          the bottom edge of the card — the same floating treatment the file
          chip gets in step one. It is the one element in this section that
          looks pressable, which is the point: this is the step where the
          visitor gets their file back. */}
      <div className="absolute -bottom-3 right-4 flex items-center gap-1 rounded-xl bg-white px-2 py-1.5 shadow-lg shadow-ink-900/10 ring-1 ring-ink-900/[0.06] dark:bg-ink-800 dark:ring-white/10">
        <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-600 dark:text-ink-300">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l9 6 9-6M3 8v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8"
            />
          </svg>
          Email
        </span>

        <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-600 dark:text-ink-300">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"
            />
          </svg>
          Share
        </span>

        {/* The filled pill. Blue rather than brand green so it reads as the
            primary action without competing with the card's own wash. */}
        <span className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            />
          </svg>
          Download
        </span>
      </div>
    </div>
  );
}
