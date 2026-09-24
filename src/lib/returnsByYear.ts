/**
 * Reading the strategies' calendar-year returns side by side.
 *
 * The arithmetic behind the returns-by-year table, kept apart from the
 * table so it can be tested as arithmetic: which years there are, which
 * strategy led each one, and a year's figure as the table writes it.
 */

import { STRATEGIES_DATA_THROUGH, type Strategy } from "@/lib/scans";

/** The calendar year the lab's data runs into, and so the one still in progress. */
export const RUNNING_YEAR = Number(STRATEGIES_DATA_THROUGH.slice(0, 4));

/**
 * The years a reader is pointed to first: the running one and the last
 * whole one, which is where "what is working now" is answered.
 */
export const RECENT_YEARS: readonly number[] = [RUNNING_YEAR, RUNNING_YEAR - 1];

/**
 * Every year any of the records has a figure for, newest first.
 *
 * @param records - Returns by calendar year.
 * @returns The years, newest first, each once.
 */
export function yearsCovered(records: readonly Readonly<Record<number, number>>[]): number[] {
  const years = new Set(records.flatMap((record) => Object.keys(record).map(Number)));
  return [...years].sort((later, earlier) => earlier - later);
}

/**
 * A year's return as a figure the shared formatting reads.
 *
 * @param years - Returns by calendar year.
 * @param year - The year.
 * @returns The return as text, or null for a year with no figure.
 */
export function returnIn(years: Readonly<Record<number, number>>, year: number): string | null {
  const value = years[year];
  return value === undefined ? null : String(value);
}

/**
 * Which strategies led a year: the highest return among those with a
 * figure for it.
 *
 * A figure for part of a year competes only when every figure that year is
 * for part of it. Two months of a strategy's first year against twelve of
 * another's is not a contest; the running year, which every strategy has
 * for the same months, is.
 *
 * @param strategies - The strategies to compare.
 * @param year - The year.
 * @returns The leaders' ids, more than one on a tie, none when no strategy
 *   has a figure for the year.
 */
export function yearLeaders(strategies: readonly Strategy[], year: number): string[] {
  const entries = strategies.flatMap((strategy) => {
    const value = strategy.years[year];
    return value === undefined
      ? []
      : [{ id: strategy.id, value, partial: strategy.partialYears.includes(year) }];
  });
  const whole = entries.filter((entry) => !entry.partial);
  const competing = whole.length > 0 ? whole : entries;
  const best = Math.max(...competing.map((entry) => entry.value));
  return competing.filter((entry) => entry.value === best).map((entry) => entry.id);
}

/**
 * Whether a strategy's figure for a year covers only part of a year that
 * others have whole: its first year, when it started part-way through.
 * The running year is partial for everyone, and says so in its heading.
 *
 * @param strategy - The strategy.
 * @param year - The year.
 * @returns True for a late start.
 */
export function isLateStart(strategy: Strategy, year: number): boolean {
  return year !== RUNNING_YEAR && strategy.partialYears.includes(year);
}
