import { Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { navEvents } from "#/lib/analytics";
import { searchTools } from "#/lib/tools";
import { CloseIcon, SearchIcon } from "./Icons";
import { ToolIconTile } from "./ToolIconTile";
import { cx } from "./ui";

/**
 * The header's typeahead over the tool catalogue.
 *
 * Search existed only on `/tools`, which meant that on the other seventy-odd
 * routes — every tool page, every category hub, the FAQ — there was no way to
 * reach a tool by name. A visitor who came for "watermark" had to already know
 * the URL to find it. This is the whole catalogue from anywhere on the site.
 *
 * Keyboard handling follows the combobox pattern rather than the listbox one:
 * the arrows move an active option, Enter goes there, Escape closes, and Tab
 * leaves for the next control instead of being consumed. That last part is
 * what keeps the header from trapping a keyboard user in the search field.
 */
export function ToolSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const hits = useMemo(() => searchTools(query), [query]);
  const hasQuery = query.trim().length > 0;

  // The result count is the only thing that can invalidate the highlighted
  // option, so the highlight is clamped rather than carried across a new list.
  useEffect(() => {
    setActive(0);
  }, [hits.length]);

  // A click anywhere else closes the panel. `pointerdown` rather than `click`
  // so the panel is already gone when the click lands — otherwise a click on
  // any link behind it would be eaten by the overlay.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // "/" focuses the search from anywhere, the convention set by most docs and
  // code hosts. Guarded so it does not steal the key from a field the visitor
  // is already typing in, and skipped while a modifier is held so it does not
  // collide with the browser's own shortcuts.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(tool: string, label: string) {
    navEvents.cta("header_search", label);
    setOpen(false);
    setQuery("");
    return tool;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === "Escape") {
      // Cleared rather than merely hidden: the visitor who dismissed the panel
      // almost always wants to retype, and a preserved query would re-open the
      // same results the instant they focused the field again.
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className={cx("relative", className)}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && hasQuery}
        aria-controls={listId}
        aria-activedescendant={
          open && hasQuery && hits[active] ? `${listId}-${active}` : undefined
        }
        aria-label="Search PDF tools"
        placeholder="Search tools"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl bg-ink-50 py-2 pl-9 pr-3 text-sm text-ink-900 ring-1 ring-ink-200 outline-none transition placeholder:text-ink-400 focus:bg-white focus:ring-2 focus:ring-brand-500 dark:bg-ink-900 dark:text-white dark:ring-ink-700 dark:focus:bg-ink-950"
      />

      {open && hasQuery && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700">
          {hits.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500 dark:text-ink-400">
              No tool matches “{query.trim()}”.{" "}
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Browse all tools
              </Link>
            </p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label="Tool search results">
                {hits.map((hit, index) => (
                  <li
                    key={hit.tool.href}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                  >
                    <Link
                      to={hit.tool.href}
                      onClick={() => go(hit.tool.href, hit.tool.name)}
                      onMouseEnter={() => setActive(index)}
                      className={cx(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        index === active
                          ? "bg-brand-50 dark:bg-brand-600/15"
                          : "bg-transparent",
                      )}
                    >
                      <ToolIconTile name={hit.tool.icon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">
                          {hit.tool.name}
                        </span>
                        <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                          {hit.tool.category}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className="flex w-full items-center gap-2 border-t border-ink-100 px-3 py-2 text-xs text-ink-500 hover:text-ink-900 dark:border-ink-800 dark:text-ink-400 dark:hover:text-white"
              >
                <CloseIcon className="h-3.5 w-3.5" />
                Clear search
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}