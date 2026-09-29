/** Tests for the spans a price chart offers. */

import { describe, expect, it } from "vitest";

import { DEFAULT_RANGE, PRICE_RANGES, rangeFrom } from "./priceRanges";

describe("priceRanges", () => {
  it("draws one point more than each of the platform's return windows", () => {
    // 21, 63, 126 and 252 sessions of change, and five of those years.
    expect(PRICE_RANGES.map((range) => range.sessions)).toEqual([22, 64, 127, 253, 1261, 12500]);
    expect(DEFAULT_RANGE).toBe(253);
  });

  it("keeps a span it offers, carries an older one, and defaults anything else", () => {
    expect(rangeFrom(64)).toBe(64);
    // Stored before the ranges were aligned: the same choice, one point on.
    expect(rangeFrom(250)).toBe(253);
    expect(rangeFrom(65)).toBe(64);
    expect(rangeFrom(1250)).toBe(1261);
    expect(rangeFrom(7)).toBe(DEFAULT_RANGE);
    expect(rangeFrom("250")).toBe(DEFAULT_RANGE);
  });
});
