/** Tests for reading a fund's run of values. */

import { describe, expect, it } from "vitest";

import {
  calendarYears,
  extremes,
  growthOfStake,
  readings,
  shortCategory,
  shortOption,
  summariseRolling,
} from "./funds";

const HELD = readings([
  { nav_date: "2026-01-01", nav: "100" },
  { nav_date: "2026-01-02", nav: "120" },
  { nav_date: "2026-01-03", nav: "90" },
  { nav_date: "2026-01-04", nav: "110" },
]);

describe("readings", () => {
  it("drops a value that will not parse rather than drawing nought", () => {
    expect(readings([{ nav_date: "2026-01-01", nav: "not a number" }])).toEqual([]);
  });
});

describe("growthOfStake", () => {
  it("rebases the first value to ten thousand rupees", () => {
    expect(growthOfStake(HELD).map((one) => one.value)).toEqual([10_000, 12_000, 9_000, 11_000]);
  });

  it("draws nothing from a first value of nought", () => {
    // No unit is worth nothing, and dividing by it makes every point infinite.
    expect(growthOfStake(readings([{ nav_date: "2026-01-01", nav: "0" }]))).toEqual([]);
  });
});

describe("extremes", () => {
  it("finds the high, the low and the deepest fall with their days", () => {
    const found = extremes(HELD);

    expect(found?.high).toEqual({ day: "2026-01-02", value: 120 });
    expect(found?.low).toEqual({ day: "2026-01-03", value: 90 });
    expect(found?.deepest).toEqual({ day: "2026-01-03", value: -25 });
  });

  it("has nothing to say of an empty series", () => {
    expect(extremes([])).toBeNull();
  });

  it("calls a series that never fell a fall of nought on its first day", () => {
    const rising = readings([
      { nav_date: "2026-01-01", nav: "10" },
      { nav_date: "2026-01-02", nav: "11" },
    ]);

    expect(extremes(rising)?.deepest).toEqual({ day: "2026-01-01", value: 0 });
  });
});

describe("summariseRolling", () => {
  it("summarises the distribution of the rolling year", () => {
    const found = summariseRolling([
      { nav_date: "2026-01-01", percent: "-10" },
      { nav_date: "2026-01-02", percent: "5" },
      { nav_date: "2026-01-03", percent: "20" },
      { nav_date: "2026-01-04", percent: "not a number" },
    ]);

    expect(found?.best).toEqual({ day: "2026-01-03", value: 20 });
    expect(found?.worst).toEqual({ day: "2026-01-01", value: -10 });
    expect(found?.median).toBe(5);
    expect(found?.positive).toBeCloseTo(66.67, 1);
  });

  it("takes the middle two of an even count", () => {
    const found = summariseRolling([
      { nav_date: "2026-01-01", percent: "1" },
      { nav_date: "2026-01-02", percent: "3" },
    ]);

    expect(found?.median).toBe(2);
  });

  it("has nothing to say of a scheme younger than a year", () => {
    expect(summariseRolling([])).toBeNull();
  });
});

describe("labels", () => {
  it("shortens a category to the part that distinguishes it", () => {
    expect(shortCategory("Open Ended Schemes(Equity Scheme - Large Cap Fund)")).toBe(
      "Large Cap Fund",
    );
    expect(shortCategory("Close Ended Schemes ( Income )")).toBe("Income");
    expect(shortCategory("Debt")).toBe("Debt");
    expect(shortCategory("Open Ended Schemes(Exchange Traded Funds (ETFs) - Equity ETF)")).toBe(
      "Equity ETF",
    );
    expect(
      shortCategory(
        "Open Ended Schemes(Fund of Funds Scheme (Domestic) - Fund of Funds Scheme (Domestic))",
      ),
    ).toBe("Fund of Funds Scheme (Domestic)");
    expect(shortCategory("Open Ended Schemes(Other Scheme - Other  ETFs)")).toBe("Other ETFs");
    expect(shortCategory(null)).toBe("-");
  });

  it("says an option without the word", () => {
    expect(shortOption("Growth Option")).toBe("Growth");
    expect(shortOption("IDCW")).toBe("IDCW");
  });
});

describe("calendarYears", () => {
  const at = (day: string, value: number) => ({ day, value });

  it("measures each year from the last value of the one before", () => {
    const years = calendarYears([
      at("2023-06-01", 90),
      at("2023-12-29", 100),
      at("2024-12-31", 120),
      at("2025-12-31", 108),
      at("2026-09-25", 113.4),
    ]);

    // 2023 has no year-end before it in the values, so it is left out.
    expect(years.map((one) => one.year)).toEqual([2024, 2025, 2026]);
    expect(years[0]?.value).toBeCloseTo(20, 9);
    expect(years[1]?.value).toBeCloseTo(-10, 9);
    expect(years[2]).toMatchObject({ year: 2026, toDate: true });
    expect(years[2]?.value).toBeCloseTo(5, 9);
    expect(years[0]?.toDate).toBe(false);
  });

  it("calls a last year whole once its values reach late December", () => {
    const years = calendarYears([at("2024-12-31", 100), at("2025-12-26", 110)]);
    expect(years).toEqual([{ year: 2025, value: expect.closeTo(10, 9) as number, toDate: false }]);
  });

  it("skips a year a gap in the values leaves without a start", () => {
    expect(calendarYears([at("2022-12-30", 100), at("2024-12-31", 130)])).toEqual([]);
    expect(calendarYears([])).toEqual([]);
  });
});
