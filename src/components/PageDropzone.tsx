import { useEffect, useRef, useState } from "react";

/**
 * Drop a PDF anywhere on the page.
 *
 * The uploader is a fixed box in the middle of the screen. Every other PDF tool
 * on the internet is either that, or accepts a drop anywhere. Visitors who have
 * three PDFs open in a file manager and are dragging one of them are not going
 * to aim; they are going to drop it on whatever is under their cursor.
 *
 * This listens on the document rather than on the uploader, so a drop anywhere
 * routes to the same input the uploader uses — the visitor gets the file they
 * dropped, and the uploader still lights up so it is obvious what happened.
 *
 * Two details that are easy to get wrong:
 *
 *  - `dragover` fires continuously and must be preventDefault or the browser
 *    opens the file in a new tab instead of giving it to us.
 *  - `window`'s drop handler must also preventDefault, for a drop that lands
 *    outside any element. Without it the same thing happens.
 */
export function PageDropzone() {
  const [active, setActive] = useState(false);
  // dragenter/dragleave fire for every element the pointer crosses, so the
  // naive listener flickers off the moment the cursor moves onto a child. A
  // depth counter is what keeps the overlay steady.
  const depth = useRef(0);

  useEffect(() => {
    function hasFiles(event: DragEvent): boolean {
      return event.dataTransfer?.types.includes("Files") ?? false;
    }

    function onDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setActive(true);
    }

    function onDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function onDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setActive(false);
      }
    }

    function onDrop(event: DragEvent) {
      // Unconditional. This is the handler that decides whether the browser
      // navigates to the file or hands it to the page.
      event.preventDefault();
      depth.current = 0;
      setActive(false);
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input || !event.dataTransfer?.files.length) return;
      // A DataTransfer's FileList is read-only, so the only way to put a
      // dropped file into an <input type="file"> is through the modern setter.
      input.files = event.dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    // Fires when a drag that started in an iframe or the OS ends elsewhere —
    // without this the overlay can get stuck on screen with nothing to drop.
    window.addEventListener("dragend", () => {
      depth.current = 0;
      setActive(false);
    });

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-brand-600/10 backdrop-blur-[2px]"
    >
      <div className="rounded-3xl border-2 border-dashed border-brand-500 bg-white/95 px-10 py-8 text-center shadow-2xl dark:bg-ink-900/95">
        <svg
          className="mx-auto h-10 w-10 text-brand-600 dark:text-brand-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15"
          />
        </svg>
        <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-white">
          Drop it anywhere
        </p>
      </div>
    </div>
  );
}