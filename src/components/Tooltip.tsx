import type { ReactNode } from "react";
import { cx } from "./ui";

/**
 * A label for an icon-only control.
 *
 * ## Why this exists when `title` already works
 *
 * The header's icon buttons (theme, install) carry `title`, which is the whole
 * solution on a desktop with a mouse. It fails two ways that matter here:
 *
 *  - **On touch it does not exist at all.** A title attribute only surfaces on
 *    hover, and a phone has no hover. "Switch to dark mode" and "Install app"
 *    are two sun-and-arrow glyphs with no text on a phone, where the majority of
 *    this site's visitors are. The name exists for a screen reader via
 *    `aria-label`, but a sighted person on a phone just has to guess.
 *  - **Even on desktop it is unstyled and slow.** The native bubble ignores the
 *    design, appears after a deliberate delay, and cannot say anything longer
 *    than a phrase.
 *
 * ## How it behaves
 *
 * Shown on hover *and* on keyboard focus, via `focus-within` — so tabbing to
 * the button reveals the same label a mouse would, which is the difference
 * between a tooltip that decorates and one that informs.
 *
 * It is not a `role="tooltip"` wired with `aria-describedby`. That pattern
 * requires the consumer to already have an accessible name and to manage an id,
 * and every icon button here already has an `aria-label` doing exactly that
 * job. Duplicating the same string through `aria-describedby` would make a
 * screen reader announce it twice. This component is therefore
 * presentational-and-pointer only: it adds visible information, and leaves the
 * announced name to the button that owns it.
 *
 * Wrapping in a `<span>` is required rather than avoided — `group` and
 * `focus-within` both need an ancestor, and a button cannot be its own wrapper.
 * The wrapper is `inline-flex` so it does not change the layout of the control
 * it wraps, which matters because several of these sit in a `flex` row where an
 * inline element would introduce a baseline gap.
 */
export function Tooltip({
  label,
  children,
  className,
  align = "center",
  /** Places the bubble below instead of above — for controls near the top edge. */
  side = "top",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  align?: "center" | "end";
  side?: "top" | "bottom";
}) {
  return (
    <span className={cx("group/tip relative inline-flex", className)}>
      {children}
      <span
        // aria-hidden because the label is already on the button's accessible
        // name; announcing it a second time is noise.
        aria-hidden="true"
        role="presentation"
        className={cx(
          "pointer-events-none absolute z-50 w-max max-w-56 rounded-lg px-2.5 py-1.5",
          align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
          "bg-ink-900 text-[11px] font-medium leading-snug text-white shadow-lg",
          "opacity-0 transition-opacity duration-150",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {label}
      </span>
    </span>
  );
}