import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moves keyboard focus onto the panel that just replaced the tool's action
 * button.
 *
 * Every tool swaps its button for a result or an error, so without this the
 * focused element is removed from the DOM and focus silently falls back to the
 * top of the document. A keyboard user then has to tab all the way down again
 * to reach the Download button, and a screen reader user is given no reason to
 * believe anything happened.
 *
 * The panel is given `tabIndex={-1}` rather than being made a tab stop, so it
 * takes focus programmatically without adding a stop to the tab order, and it
 * is focused without scrolling — the visitor has usually just watched the
 * panel appear, and jumping the viewport would hide the result.
 */
export function PanelFocus({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={ref} tabIndex={-1} className="outline-none">
      {children}
    </div>
  );
}
