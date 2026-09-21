/** Tests for reading a fund's run of values. */

import { describe, expect, it } from "vitest";

import { drawdown, extremes, growthOfStake, readings, summariseRolling } from "./funds";

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

describe("drawdown", () => {
  it("has no peak to fall from until a value is above nought", () => {
    const late = readings([
      { nav_date: "2026-01-01", nav: "0" },
      { nav_date: "2026-01-02", nav: "10" },
    ]);

    expect(drawdown(late)).toEqual([{ day: "2026-01-02", value: 0 }]);
  });

  it("is nought at a new high and the fall from the peak between highs", () => {
    const falls = drawdown(HELD).map((one) => one.value);

    expect(falls.slice(0, 3)).toEqual([0, 0, -25]);
    expect(falls[3]).toBeCloseTo(-25 / 3, 10);
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
