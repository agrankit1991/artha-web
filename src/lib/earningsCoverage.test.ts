/** Tests for which earnings periods speak for their population. */

import { describe, expect, it } from "vitest";

import { earningsPeriod, growthFigure } from "@/test/support";

import { broadGrowth, broadPeriods } from "./earningsCoverage";

describe("broadPeriods", () => {
  it("keeps the periods at least half as well covered as the best, in order", () => {
    const periods = [
      earningsPeriod({ period_end: "2026-03-31", reported: 3036 }),
      earningsPeriod({ period_end: "2026-01-31", reported: 1 }),
      earningsPeriod({ period_end: "2025-12-31", reported: 17 }),
      earningsPeriod({ period_end: "2025-03-31", reported: 4866 }),
      earningsPeriod({ period_end: "2022-03-31", reported: 2433 }),
      earningsPeriod({ period_end: "2021-03-31", reported: 198 }),
    ];

    expect(broadPeriods(periods).map((one) => one.period_end)).toEqual([
      "2026-03-31",
      "2025-03-31",
      // Exactly half the best is broad enough.
      "2022-03-31",
    ]);
  });

  it("holds for a small population as for the market", () => {
    const periods = [
      earningsPeriod({ period_end: "2026-03-31", reported: 5 }),
      earningsPeriod({ period_end: "2025-12-31", reported: 2 }),
      earningsPeriod({ period_end: "2025-03-31", reported: 3 }),
    ];

    expect(broadPeriods(periods).map((one) => one.period_end)).toEqual([
      "2026-03-31",
      "2025-03-31",
    ]);
  });

  it("has nothing to keep when nothing is held", () => {
    expect(broadPeriods([])).toEqual([]);
  });
});

describe("broadGrowth", () => {
  it("reads growth only where most of the population was in both periods", () => {
    // The market's quarters: a broad September quarter whose comparison, the
    // June quarter before it, only 95 companies had filed.
    const periods = [
      earningsPeriod({ period_end: "2026-06-30", revenue_qoq: growthFigure({ sample: 3911 }) }),
      earningsPeriod({ period_end: "2026-03-31", revenue_qoq: growthFigure({ sample: 1956 }) }),
      earningsPeriod({
        period_end: "2025-09-30",
        revenue_qoq: growthFigure({ sample: 95, percent: "-994.85" }),
      }),
      earningsPeriod({ period_end: "2025-06-30", revenue_qoq: null }),
    ];

    const read = broadGrowth(periods, (one) => one.revenue_qoq);

    expect(periods.map((one) => read(one)?.sample ?? null)).toEqual([3911, 1956, null, null]);
  });

  it("reads nothing when nothing was compared", () => {
    const period = earningsPeriod({ revenue_qoq: null });

    expect(broadGrowth([period], (one) => one.revenue_qoq)(period)).toBeNull();
  });
});
