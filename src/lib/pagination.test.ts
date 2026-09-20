/** Tests for working out which page numbers to offer. */

import { describe, expect, it } from "vitest";

import { pageSlots, pageSummary } from "./pagination";

describe("pageSlots", () => {
  it("offers nothing when everything fits on one page", () => {
    // A control that says "1" and nothing else is noise.
    expect(pageSlots(1, 1)).toEqual([]);
    expect(pageSlots(1, 0)).toEqual([]);
  });

  it("offers every page when they all fit", () => {
    expect(pageSlots(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("always offers the first and the last", () => {
    // "Go to the end" is a move a reader makes; counting clicks to it is not.
    const slots = pageSlots(20, 40);

    expect(slots[0]).toBe(1);
    expect(slots[slots.length - 1]).toBe(40);
  });

  it("offers the pages either side of the one being shown", () => {
    expect(pageSlots(20, 40)).toEqual([1, "gap", 19, 20, 21, "gap", 40]);
  });

  it("spends the spare room on pages rather than a gap near the start", () => {
    expect(pageSlots(2, 40)).toEqual([1, 2, 3, 4, "gap", 40]);
  });

  it("does the same near the end", () => {
    expect(pageSlots(39, 40)).toEqual([1, "gap", 37, 38, 39, 40]);
  });

  it("never marks a gap that hides nothing", () => {
    // A gap standing for a single page is longer than the page number.
    for (let current = 1; current <= 40; current += 1) {
      const slots = pageSlots(current, 40);
      const numbers = slots.filter((slot): slot is number => slot !== "gap");
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });
});

describe("pageSummary", () => {
  it("counts from one, as a reader does", () => {
    expect(pageSummary(12, 12, 92)).toBe("13–24 of 92");
  });

  it("says a short last page is short", () => {
    expect(pageSummary(84, 8, 92)).toBe("85–92 of 92");
  });

  it("says nothing was found rather than showing nought of nought", () => {
    expect(pageSummary(0, 0, 0)).toBe("Nothing found");
  });
});
