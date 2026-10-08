import { describe, expect, it } from "vitest";
import { formatPageList, parsePageRange } from "./pages";
import { FriendlyError } from "./files";

/**
 * `parsePageRange` decides which pages a destructive operation touches — a
 * wrong index here silently deletes or keeps the wrong page, so the bounds and
 * ordering rules are worth pinning down.
 */
describe("parsePageRange", () => {
  it("reads a single page as a zero-based index", () => {
    expect(parsePageRange("1", 10)).toEqual([0]);
    expect(parsePageRange("10", 10)).toEqual([9]);
  });

  it("reads an inclusive range", () => {
    expect(parsePageRange("2-5", 10)).toEqual([1, 2, 3, 4]);
    expect(parsePageRange("3-3", 10)).toEqual([2]);
  });

  it("reads a mixed list in the order written", () => {
    expect(parsePageRange("7, 1-3", 10)).toEqual([6, 0, 1, 2]);
  });

  it("keeps written order rather than sorting", () => {
    expect(parsePageRange("5, 1", 10)).toEqual([4, 0]);
  });

  it("de-duplicates overlapping ranges", () => {
    expect(parsePageRange("1-3, 2-5", 10)).toEqual([0, 1, 2, 3, 4]);
    expect(parsePageRange("2, 2, 2", 10)).toEqual([1]);
  });

  it("tolerates loose spacing and trailing commas", () => {
    expect(parsePageRange(" 1 - 3 , 5 ,", 10)).toEqual([0, 1, 2, 4]);
  });

  it("rejects a backwards range and says which way round it should be", () => {
    expect(() => parsePageRange("5-2", 10)).toThrow(/2-5/);
    expect(() => parsePageRange("5-2", 10)).toThrow(FriendlyError);
  });

  it("rejects a page past the end of the document", () => {
    expect(() => parsePageRange("11", 10)).toThrow(/does not exist/);
    expect(() => parsePageRange("1-11", 10)).toThrow(/does not exist/);
  });

  it("rejects page zero rather than treating it as index -1", () => {
    expect(() => parsePageRange("0", 10)).toThrow(/does not exist/);
  });

  it("rejects an empty selection", () => {
    expect(() => parsePageRange("", 10)).toThrow(FriendlyError);
    expect(() => parsePageRange("   ", 10)).toThrow(FriendlyError);
    expect(() => parsePageRange(",,", 10)).toThrow(FriendlyError);
  });

  it("rejects text and negative numbers", () => {
    expect(() => parsePageRange("abc", 10)).toThrow(FriendlyError);
    expect(() => parsePageRange("-2", 10)).toThrow(FriendlyError);
    expect(() => parsePageRange("1..3", 10)).toThrow(FriendlyError);
  });

  it("reports the real page count in the message", () => {
    expect(() => parsePageRange("5", 1)).toThrow(/This PDF has 1 page\./);
    expect(() => parsePageRange("5", 4)).toThrow(/This PDF has 4 pages\./);
  });
});

describe("formatPageList", () => {
  it("says none for an empty selection", () => {
    expect(formatPageList([])).toBe("none");
  });

  it("round-trips a single page", () => {
    expect(formatPageList([0])).toBe("1");
  });

  it("collapses runs into ranges", () => {
    expect(formatPageList([0, 1, 2])).toBe("1-3");
    expect(formatPageList([0, 1, 4, 5, 6])).toBe("1-2, 5-7");
  });

  it("sorts first, so display order never depends on operation order", () => {
    expect(formatPageList([4, 0, 2])).toBe("1, 3, 5");
  });

  it("does not treat a gap as a range", () => {
    expect(formatPageList([0, 2])).toBe("1, 3");
  });

  it("round-trips through parsePageRange", () => {
    const indexes = [0, 1, 2, 7, 9];
    expect(parsePageRange(formatPageList(indexes), 10)).toEqual(indexes);
  });
});