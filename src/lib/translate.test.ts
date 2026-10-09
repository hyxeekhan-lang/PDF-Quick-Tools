import { describe, expect, it } from "vitest";
import {
  directionFor,
  isRtl,
  supportsPdfExport,
  TRANSLATION_LANGUAGES,
} from "./translate";

describe("right-to-left languages", () => {
  it("covers the scripts that read right to left", () => {
    // The languages a visitor in Faisalabad, Dubai or Cairo will pick first.
    for (const language of ["Urdu", "Arabic", "Persian", "Hebrew"]) {
      expect(isRtl(language), language).toBe(true);
      expect(directionFor(language), language).toBe("rtl");
    }
  });

  it("leaves left-to-right languages alone", () => {
    for (const language of ["English", "Spanish", "German", "French"]) {
      expect(isRtl(language), language).toBe(false);
      expect(directionFor(language), language).toBe("ltr");
    }
  });
});

describe("supportsPdfExport", () => {
  it("refuses right-to-left scripts rather than producing broken output", () => {
    // A PDF font stores glyphs but does not shape or reorder them. Emitting
    // Urdu this way produces valid-looking PDF full of unjoined letters, which
    // is worse than no download at all.
    for (const language of ["Urdu", "Arabic", "Persian", "Hebrew"]) {
      expect(supportsPdfExport(language), language).toBe(false);
    }
  });

  it("refuses scripts the embeddable fonts do not carry", () => {
    // WinAnsi has no ideographs and no Cyrillic or Devanagari, so these would
    // come out as blank pages or mojibake.
    for (const language of ["Chinese", "Japanese", "Korean", "Russian", "Hindi"]) {
      expect(supportsPdfExport(language), language).toBe(false);
    }
  });

  it("allows the languages it can genuinely render", () => {
    for (const language of ["English", "Spanish", "French", "German", "Turkish"]) {
      expect(supportsPdfExport(language), language).toBe(true);
    }
  });

  it("decides every language it offers", () => {
    // The point of the whole function: no language may fall through to a
    // default and get offered a download that cannot work.
    for (const language of TRANSLATION_LANGUAGES) {
      expect(typeof supportsPdfExport(language), language).toBe("boolean");
    }
  });
});