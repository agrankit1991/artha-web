/** Tests for turning the platform's figures into something readable. */

import { describe, expect, it } from "vitest";

import {
  ABSENT,
  direction,
  formatCount,
  formatDay,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatSignedPrice,
  formatSince,
  formatStreak,
  formatVolume,
  formatWhole,
  todayInIndia,
  toNumber,
} from "./format";

describe("absence", () => {
  it("renders every kind of missing figure as one dash", () => {
    // Absence is not nought: a company listed last month has no yearly
    // return, and showing 0.00% would sort it among the flat ones.
    expect(formatPrice(null)).toBe(ABSENT);
    expect(formatPercent(undefined)).toBe(ABSENT);
    expect(formatMultiple(null)).toBe(ABSENT);
    expect(formatVolume(null)).toBe(ABSENT);
    expect(formatCount(null)).toBe(ABSENT);
    expect(formatDay(null)).toBe(ABSENT);
  });

  it("treats a figure that is not a number as missing", () => {
    // A field the platform could not fill should not become NaN on screen.
    expect(toNumber("not a number")).toBeNull();
    expect(formatPrice("")).toBe(ABSENT);
    expect(formatDay("not a date")).toBe(ABSENT);
  });
});

describe("figures", () => {
  it("keeps a price to two decimal places", () => {
    expect(formatPrice("1294.900000")).toBe("1,294.90");
  });

  it("signs a percentage in both directions", () => {
    // A column where only the falls carry a mark reads as though the rises
    // were absolute rather than relative.
    expect(formatPercent("8.25")).toBe("+8.25%");
    expect(formatPercent("-3.1")).toBe("-3.10%");
    expect(formatPercent("0")).toBe("0.00%");
  });

  it("renders a ratio as a multiple", () => {
    expect(formatMultiple("4.23")).toBe("4.2×");
  });

  it("abbreviates volume in lakh and crore", () => {
    // An Indian market read by an Indian reader: a column of nine-digit
    // numbers is unreadable, and thousands-and-millions is the wrong scale.
    expect(formatVolume(12_300_000)).toBe("1.23 Cr");
    expect(formatVolume(450_000)).toBe("4.50 L");
    expect(formatVolume(9_800)).toBe("9,800");
  });

  it("renders a session date the way a person writes one", () => {
    expect(formatDay("2026-09-18")).toContain("2026");
  });

  it("counts, and abbreviates a negative volume the same way", () => {
    // A negative volume should never arrive, but a figure that appears as
    // "-12300000" in one column and "1.23 Cr" in another is worse.
    expect(formatCount(7)).toBe("7");
    expect(formatVolume(-12_300_000)).toBe("-1.23 Cr");
    expect(formatVolume(-450_000)).toBe("-4.50 L");
  });

  it("says a run of sessions in one glyph", () => {
    expect(formatStreak(6)).toBe("6d");
  });
});

describe("direction", () => {
  it("separates a rise, a fall and neither", () => {
    expect(direction("1.2")).toBe("up");
    expect(direction("-1.2")).toBe("down");
    expect(direction("0")).toBe("flat");
  });

  it("treats an absent figure as flat rather than as a fall", () => {
    // Colouring absence red would make every young company look like it
    // had dropped.
    expect(direction(null)).toBe("flat");
    expect(direction(undefined)).toBe("flat");
  });
});

describe("formatSince", () => {
  const now = new Date("2026-09-20T18:00:00+05:30");

  it.each([
    ["2026-09-20T17:59:40+05:30", "just now"],
    ["2026-09-20T17:25:00+05:30", "35m ago"],
    ["2026-09-20T15:00:00+05:30", "3h ago"],
    ["2026-09-18T18:00:00+05:30", "2d ago"],
  ])("renders %s as %s", (moment, expected) => {
    expect(formatSince(moment, now)).toBe(expected);
  });

  it("falls back to a date once the relative form stops helping", () => {
    // "23d ago" is not something anybody converts into a date in their head.
    expect(formatSince("2026-08-20T18:00:00+05:30", now)).toMatch(/20 Aug/);
  });

  it("shows a dash rather than inventing a time", () => {
    expect(formatSince(null, now)).toBe(ABSENT);
    expect(formatSince("not a time", now)).toBe(ABSENT);
  });
});

describe("formatWhole", () => {
  it("groups the Indian way and drops the decimals", () => {
    expect(formatWhole(1678254.4)).toBe("16,78,254");
    expect(formatWhole(-8250)).toBe("-8,250");
    expect(formatWhole(0.4)).toBe("0");
  });

  it("signs a move in points, and leaves absence a dash", () => {
    expect(formatSignedPrice("312.45")).toBe("+312.45");
    expect(formatSignedPrice("-1234.5")).toBe("-1,234.50");
    expect(formatSignedPrice(null)).toBe("—");
  });

  it("reads today on India's calendar, not UTC's", () => {
    // 20:00 UTC on the 22nd is 01:30 on the 23rd in India.
    expect(todayInIndia(new Date("2026-09-22T20:00:00Z"))).toBe("2026-09-23");
    expect(todayInIndia(new Date("2026-09-22T10:00:00Z"))).toBe("2026-09-22");
  });
});
