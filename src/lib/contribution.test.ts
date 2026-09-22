/** Tests for how much of an index's move each member made. */

import { describe, expect, it } from "vitest";

import { contributions } from "./contribution";

describe("contributions", () => {
  it("weighs each member by capitalisation and multiplies by its move", () => {
    const found = contributions(
      [
        { instrument_key: "A", market_cap: "300", change_percent: "2.0" },
        { instrument_key: "B", market_cap: "100", change_percent: "-4.0" },
      ],
      20000,
    );

    // A is 75% of the index and rose 2%: 1.5 points of per cent, 300 index points.
    expect(found.get("A")?.weight).toBeCloseTo(75);
    expect(found.get("A")?.percent).toBeCloseTo(1.5);
    expect(found.get("A")?.points).toBeCloseTo(300);
    expect(found.get("B")?.percent).toBeCloseTo(-1);
    expect(found.get("B")?.points).toBeCloseTo(-200);
  });

  it("leaves out a member it cannot weigh, and the rest still sum to a hundred", () => {
    const found = contributions(
      [
        { instrument_key: "A", market_cap: "100", change_percent: "1.0" },
        { instrument_key: "B", market_cap: null, change_percent: "5.0" },
        { instrument_key: "C", market_cap: "100", change_percent: null },
      ],
      null,
    );

    expect([...found.keys()]).toEqual(["A"]);
    expect(found.get("A")?.weight).toBeCloseTo(100);
    // No level, no points: a sector moves in per cent only.
    expect(found.get("A")?.points).toBeNull();
  });

  it("finds nothing when nothing can be weighed", () => {
    expect(contributions([], 100).size).toBe(0);
  });
});
