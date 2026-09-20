/**
 * Putting two price series on one axis.
 *
 * Gold trades near ten thousand rupees a unit and the Nifty near twenty-five
 * thousand points; drawn against a shared price axis, one line is a wall and
 * the other is the floor. Rebasing turns both into percentages from a common
 * starting point, which is the only honest way to answer "which has done
 * better over six months".
 *
 * Common is the operative word. Rebasing each series to its own first
 * session would compare different periods and call it a comparison, so the
 * baseline is the first session every series has.
 */

import type { PriceSeries } from "@/api/client";
import { toNumber } from "@/lib/format";

/** One point on a rebased line: a session, and the return since the base. */
export interface RebasedPoint {
  day: string;
  /** Percentage change from the baseline session. */
  percent: number;
}

/** One instrument's line, rebased. */
export interface RebasedSeries {
  instrumentKey: string;
  points: RebasedPoint[];
  /** The total return over the window, as a percentage. */
  total: number | null;
}

/**
 * Rebase every series to the first session they all share.
 *
 * @param series - The series as the platform sent them.
 * @returns One rebased line per series, in the order given. Empty when the
 *   series share no session, or when any baseline price is unusable --
 *   dividing by nought or by an absent price would produce a line that
 *   looks real and means nothing.
 */
export function rebase(series: PriceSeries[]): RebasedSeries[] {
  const held = series.map((one) => ({
    instrumentKey: one.instrument_key,
    closes: closesByDay(one),
  }));
  const days = sharedDays(held.map((one) => one.closes));
  const baseDay = days[0];
  const lastDay = days[days.length - 1];
  if (baseDay === undefined || lastDay === undefined) {
    return [];
  }

  // Every read below finds a close: `days` holds only sessions every
  // series traded. The fallbacks exist because an absent key and a present
  // one have the same type, not because a session can be missing.
  const bases = held.map((one) => one.closes.get(baseDay) ?? 0);
  if (bases.includes(0)) {
    // A baseline of nought makes every point infinite, and a line that
    // looks real and means nothing is worse than no line at all.
    return [];
  }

  return held.map((one, index) => {
    const base = bases[index] ?? 1;
    const since = (close: number): number => ((close - base) / base) * 100;
    return {
      instrumentKey: one.instrumentKey,
      points: days.map((day) => ({ day, percent: since(one.closes.get(day) ?? base) })),
      total: since(one.closes.get(lastDay) ?? base),
    };
  });
}

/** One instrument's closes, by session, skipping any the platform lacked. */
function closesByDay(series: PriceSeries): Map<string, number> {
  const closes = new Map<string, number>();
  for (const point of series.points) {
    const close = toNumber(point.close);
    if (close !== null) {
      closes.set(point.day, close);
    }
  }
  return closes;
}

/**
 * Find the sessions every series has a usable close for.
 *
 * @param closes - Each series' closes, by session.
 * @returns The shared sessions, oldest first. Empty when the series never
 *   overlap, which is not an error: an instrument listed this year and one
 *   delisted last year simply cannot be compared.
 */
function sharedDays(closes: Map<string, number>[]): string[] {
  const seen = new Map<string, number>();
  for (const held of closes) {
    for (const day of held.keys()) {
      seen.set(day, (seen.get(day) ?? 0) + 1);
    }
  }
  return [...seen]
    .filter(([, count]) => count === closes.length)
    .map(([day]) => day)
    .sort((one, other) => one.localeCompare(other));
}
