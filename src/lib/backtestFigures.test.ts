/** Tests for how a backtest's figures are written. */

import { describe, expect, it } from "vitest";

import { ABSENT } from "./format";
import { percent, points, ratio, share } from "./backtestFigures";

describe("backtest figures", () => {
  it("writes returns to one decimal, differences in points, ratios to two, shares whole", () => {
    expect(percent(30.44)).toBe("+30.4%");
    expect(percent(-3.24)).toBe("-3.2%");
    expect(points(12.94)).toBe("+12.9 pp");
    expect(ratio(1.3349)).toBe("1.33");
    expect(share(69.7)).toBe("70%");
  });

  it("writes an absent figure as the dash", () => {
    expect([percent(null), points(undefined), ratio(null), share(undefined)]).toEqual([
      ABSENT,
      ABSENT,
      ABSENT,
      ABSENT,
    ]);
  });
});
