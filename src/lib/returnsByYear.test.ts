/** Tests for reading the strategies' calendar-year returns side by side. */

import { describe, expect, it } from "vitest";

import {
  RECENT_YEARS,
  RUNNING_YEAR,
  isLateStart,
  returnIn,
  yearLeaders,
  yearsCovered,
} from "./returnsByYear";
import { NIFTY_500_YEARS, STRATEGY_SCANS, type Strategy } from "./scans";

const STRATEGIES = STRATEGY_SCANS.map((scan) => scan.strategy);

/** A strategy from the catalogue by its lab id. */
function strategy(id: string): Strategy {
  const found = STRATEGIES.find((one) => one.id === id);
  if (found === undefined) {
    throw new Error(`${id} is missing from the catalogue`);
  }
  return found;
}

describe("returns by year", () => {
  it("runs to the lab's last session, and points to that year and the one before", () => {
    expect(RUNNING_YEAR).toBe(2026);
    expect(RECENT_YEARS).toEqual([2026, 2025]);
  });

  it("covers every year any record has, newest first, each once", () => {
    const years = yearsCovered([...STRATEGIES.map((one) => one.years), NIFTY_500_YEARS]);
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(2005);
    expect(years).toHaveLength(22);
    expect(yearsCovered([{ 2020: 1 }, { 2019: 2, 2020: 3 }])).toEqual([2020, 2019]);
  });

  it("writes a year's return for the shared formatting, or nothing for a year without one", () => {
    expect(returnIn(strategy("S0012").years, 2025)).toBe("42.5");
    expect(returnIn(strategy("S0012").years, 2018)).toBeNull();
  });

  it("names the leader of each year the owner asked about", () => {
    expect(yearLeaders(STRATEGIES, 2025)).toEqual(["S0012"]);
    // Every figure for the running year covers the same months, so all compete.
    expect(yearLeaders(STRATEGIES, 2026)).toEqual(["S0003"]);
  });

  it("does not let two months of a first year beat a whole year", () => {
    // S0012's 4.3% covers November and December 2019 only.
    expect(yearLeaders(STRATEGIES, 2019)).toEqual(["S0009"]);
  });

  it("names every leader on a tie, and none for a year nobody has", () => {
    const tied: Strategy[] = [
      { ...strategy("S0010"), id: "A", years: { 2030: 5 }, partialYears: [] },
      { ...strategy("S0010"), id: "B", years: { 2030: 5 }, partialYears: [] },
    ];
    expect(yearLeaders(tied, 2030)).toEqual(["A", "B"]);
    expect(yearLeaders(STRATEGIES, 1999)).toEqual([]);
  });

  it("calls a first part-year a late start, and the running year not", () => {
    expect(isLateStart(strategy("S0012"), 2019)).toBe(true);
    expect(isLateStart(strategy("S0012"), 2026)).toBe(false);
    expect(isLateStart(strategy("S0010"), 2019)).toBe(false);
  });
});
