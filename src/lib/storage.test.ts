import { describe, expect, it, vi } from "vitest";
import {
  clearAllTools,
  clearRecent,
  isFavourite,
  noteToolVisit,
  readFavourites,
  readRecent,
  readCompressionLevel,
  readImageQuality,
  removeFavourite,
  toggleFavourite,
  writeCompressionLevel,
  writeImageQuality,
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

describe("saved tool settings", () => {
  it("remembers compression level and image quality locally", () => {
    withStore(() => {
      expect(readCompressionLevel()).toBe("recommended");
      expect(readImageQuality()).toBe("medium");

      writeCompressionLevel("strong");
      writeImageQuality("small");

      expect(readCompressionLevel()).toBe("strong");
      expect(readImageQuality()).toBe("small");
      expect(window.localStorage.getItem(`pqt:${KEYS.compressionLevel}`)).toBe('"strong"');
      expect(window.localStorage.getItem(`pqt:${KEYS.imageQuality}`)).toBe('"small"');
    });
  });

  it("falls back safely for invalid saved settings", () => {
    withStore(() => {
      window.localStorage.setItem(`pqt:${KEYS.compressionLevel}`, '"invalid"');
      window.localStorage.setItem(`pqt:${KEYS.imageQuality}`, '"invalid"');
      expect(readCompressionLevel()).toBe("recommended");
      expect(readImageQuality()).toBe("medium");
    });
  });
});

describe("removing and clearing", () => {
  it("removes one favourite and leaves the rest in order", () => {
    withStore(() => {
      toggleFavourite("/merge-pdf");
      toggleFavourite("/split-pdf");
      toggleFavourite("/rotate-pdf");
      expect(removeFavourite("/split-pdf")).toEqual(["/rotate-pdf", "/merge-pdf"]);
      expect(readFavourites()).toEqual(["/rotate-pdf", "/merge-pdf"]);
    });
  });

  it("removing a tool that is not starred changes nothing", () => {
    withStore(() => {
      toggleFavourite("/merge-pdf");
      expect(removeFavourite("/watermark-pdf")).toEqual(["/merge-pdf"]);
    });
  });

  it("clears recents without touching favourites", () => {
    // The whole reason these are two functions: someone clearing where they
    // have been does not usually want to lose the tools they deliberately kept.
    withStore(() => {
      toggleFavourite("/merge-pdf");
      noteToolVisit("/split-pdf");
      noteToolVisit("/rotate-pdf");
      clearRecent();
      expect(readRecent()).toEqual([]);
      expect(readFavourites()).toEqual(["/merge-pdf"]);
    });
  });

  it("clears both lists together", () => {
    withStore(() => {
      toggleFavourite("/merge-pdf");
      noteToolVisit("/split-pdf");
      clearAllTools();
      expect(readRecent()).toEqual([]);
      expect(readFavourites()).toEqual([]);
    });
  });

  it("clearing an already-empty list is not an error", () => {
    withStore(() => {
      expect(() => clearRecent()).not.toThrow();
      expect(() => clearAllTools()).not.toThrow();
    });
  });

  it("clearing survives storage being blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });
    try {
      // A visitor in a locked-down browser clicking "clear both lists" should
      // not be met with an error — the data was never there to begin with.
      expect(() => removeFavourite("/merge-pdf")).not.toThrow();
      expect(() => clearRecent()).not.toThrow();
      expect(() => clearAllTools()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
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
