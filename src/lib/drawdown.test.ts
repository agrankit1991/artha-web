/** Tests for how far a series sits below its peak. */

import { describe, expect, it } from "vitest";

import { drawdown } from "./drawdown";

/** Rises to 120, falls a quarter to 90, recovers part of the way to 110. */
const HELD = [
  { day: "2026-01-01", value: 100 },
  { day: "2026-01-02", value: 120 },
  { day: "2026-01-03", value: 90 },
  { day: "2026-01-04", value: 110 },
];

describe("drawdown", () => {
  it("has no peak to fall from until a value is above nought", () => {
    const late = [
      { day: "2026-01-01", value: 0 },
      { day: "2026-01-02", value: 10 },
    ];

    expect(drawdown(late)).toEqual([{ day: "2026-01-02", value: 0 }]);
  });

  it("is nought at a new high and the fall from the peak between highs", () => {
    const falls = drawdown(HELD).map((one) => one.value);

    expect(falls.slice(0, 3)).toEqual([0, 0, -25]);
    expect(falls[3]).toBeCloseTo(-25 / 3, 10);
  });
});
