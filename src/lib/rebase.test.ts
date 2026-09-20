/** Tests for putting two price series on one axis. */

import { describe, expect, it } from "vitest";

import { rebase } from "./rebase";
import { priceSeries } from "@/test/support";

const NIFTY = "NSE_INDEX|Nifty 50";
const GOLD = "NSE_EQ|INF204KB17I5";

describe("rebase", () => {
  it("starts every line at nought", () => {
    const [index] = rebase([priceSeries(NIFTY, [100, 110, 121])]);

    expect(index?.points[0]?.percent).toBe(0);
  });

  it("measures each session against the baseline, not the one before", () => {
    // Compounding session on session would drift; the question is how far
    // it has come from the start.
    const [index] = rebase([priceSeries(NIFTY, [100, 110, 121])]);

    expect(index?.points.map((point) => point.percent)).toEqual([0, 10, 21]);
  });

  it("carries the total return over the window", () => {
    const [index] = rebase([priceSeries(NIFTY, [200, 180])]);

    expect(index?.total).toBe(-10);
  });

  it("rebases both series from the session they share, not their own firsts", () => {
    // Rebasing each to its own first session compares different periods
    // and calls the result a comparison.
    const index = priceSeries(NIFTY, [50, 100, 110], "2026-03-01");
    const gold = priceSeries(GOLD, [200, 220], "2026-03-02");

    const [rebasedIndex, rebasedGold] = rebase([index, gold]);

    expect(rebasedIndex?.points.map((point) => point.day)).toEqual(["2026-03-02", "2026-03-03"]);
    expect(rebasedIndex?.total).toBe(10);
    expect(rebasedGold?.total).toBe(10);
  });

  it("has nothing to draw when the series never overlap", () => {
    const index = priceSeries(NIFTY, [100, 110], "2026-03-01");
    const gold = priceSeries(GOLD, [200, 220], "2026-06-01");

    expect(rebase([index, gold])).toEqual([]);
  });

  it("has nothing to draw when there is nothing to draw", () => {
    expect(rebase([])).toEqual([]);
    expect(rebase([priceSeries(NIFTY, [])])).toEqual([]);
  });

  it("refuses to divide by a baseline of nought", () => {
    // An infinite return looks like a real line and means nothing.
    expect(rebase([priceSeries(NIFTY, [0, 110])])).toEqual([]);
  });

  it("skips a session whose close the platform could not give", () => {
    const series = priceSeries(NIFTY, [100, 110, 120]);
    const withGap = {
      ...series,
      points: series.points.map((point, index) => (index === 1 ? { ...point, close: "" } : point)),
    };

    const [rebased] = rebase([withGap]);

    expect(rebased?.points.map((point) => point.percent)).toEqual([0, 20]);
  });
});
