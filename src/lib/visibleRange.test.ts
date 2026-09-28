/** Tests for finding the columns in view. */

import { describe, expect, it } from "vitest";

import { visibleRange } from "./visibleRange";

describe("visibleRange", () => {
  it("draws the columns in view and a few either side", () => {
    // 1,400px scrolled at 14px a column is column 100; 700px shows 50 more.
    expect(visibleRange(1400, 700, 5000, 14, 10)).toEqual({ first: 90, last: 160 });
  });

  it("keeps to the columns there are at either end", () => {
    expect(visibleRange(0, 700, 5000, 14, 10)).toEqual({ first: 0, last: 60 });
    expect(visibleRange(69_300, 700, 5000, 14, 10)).toEqual({ first: 4940, last: 4999 });
  });

  it("draws everything when every column fits", () => {
    expect(visibleRange(0, 1000, 50, 14, 10)).toEqual({ first: 0, last: 49 });
  });

  it("draws nothing when there are no columns", () => {
    const range = visibleRange(0, 1000, 0, 14, 10);

    expect(range.last).toBeLessThan(range.first);
  });
});
