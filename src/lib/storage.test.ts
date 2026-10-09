import { describe, expect, it, vi } from "vitest";
import {
  isFavourite,
  noteToolVisit,
  readFavourites,
  readRecent,
  toggleFavourite,
  KEYS,
} from "./storage";

/**
 * The privacy rule in this module is that only a tool's route path and a
 * timestamp are ever written. These tests pin that down, because the failure
 * is silent: a future edit that starts storing filenames would not break any
 * existing test, it would just quietly falsify the site's central claim.
 */

// Minimal localStorage stand-in. Node's test environment has none, and the
// real Storage would reject the same writes a full quota would.
function withStore(run: () => void) {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  });
  try {
    run();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe("favourites", () => {
  it("adds, lists and removes a tool", () => {
    withStore(() => {
      expect(toggleFavourite("/merge-pdf")).toEqual(["/merge-pdf"]);
      expect(isFavourite("/merge-pdf")).toBe(true);
      expect(toggleFavourite("/split-pdf")).toEqual(["/split-pdf", "/merge-pdf"]);
      expect(toggleFavourite("/merge-pdf")).toEqual(["/split-pdf"]);
      expect(isFavourite("/merge-pdf")).toBe(false);
    });
  });

  it("caps the list so it stays a shortcut bar", () => {
    withStore(() => {
      const hrefs = Array.from({ length: 12 }, (_, i) => `/tool-${i}`);
      for (const href of hrefs) toggleFavourite(href);
      expect(readFavourites()).toHaveLength(8);
    });
  });

  it("stores only route paths — never a filename or a size", () => {
    withStore(() => {
      toggleFavourite("/compress-pdf");
      const raw = window.localStorage.getItem(`pqt:${KEYS.favourites}`);
      expect(raw).toBe('["/compress-pdf"]');
      expect(raw).not.toMatch(/\.pdf/i);
      expect(raw).not.toMatch(/\d+\s*(mb|kb|bytes)/i);
    });
  });
});

describe("recent tools", () => {
  it("moves a revisited tool to the front instead of duplicating it", () => {
    withStore(() => {
      noteToolVisit("/compress-pdf");
      noteToolVisit("/merge-pdf");
      const third = noteToolVisit("/compress-pdf");
      expect(third[0]).toBe("/compress-pdf");
      expect(third.filter((h) => h === "/compress-pdf")).toHaveLength(1);
    });
  });

  it("returns the newest six", () => {
    withStore(() => {
      for (let i = 0; i < 9; i += 1) noteToolVisit(`/tool-${i}`);
      const recent = readRecent();
      expect(recent).toHaveLength(6);
      expect(recent[0]).toBe("/tool-8");
    });
  });
});

describe("storage failures", () => {
  it("degrades quietly when localStorage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    try {
      // A private-mode browser must not break a visitor's page.
      expect(() => toggleFavourite("/merge-pdf")).not.toThrow();
      expect(readFavourites()).toEqual([]);
      expect(readRecent()).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
