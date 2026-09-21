/**
 * Reading a fund's run of values.
 *
 * Presentation arithmetic over the series the platform sent: rebasing it to
 * ten thousand rupees, measuring how far it sits below its own peak,
 * finding its highest and lowest point. None of this is an indicator -- an
 * indicator is defined in the platform, once -- and all of it is the same
 * kind of thing as rebasing two prices to a shared first session, which
 * the comparison chart already does here.
 */

import type { RollingReturn, SchemeValue } from "@/api/client";
import { toNumber } from "@/lib/format";

/** A value on a day, parsed. */
export interface Reading {
  day: string;
  value: number;
}

/** The starting sum a growth series is drawn from. */
export const STAKE = 10_000;

/**
 * Parse the published values, dropping any that will not.
 *
 * @param values - The values as published, oldest first.
 * @returns The readings.
 */
export function readings(values: SchemeValue[]): Reading[] {
  return values.flatMap((one) => {
    const value = toNumber(one.nav);
    return value === null ? [] : [{ day: one.nav_date, value }];
  });
}

/**
 * What ten thousand rupees put in on the first day would be worth since.
 *
 * The oldest way of showing a fund and still the clearest: a rupee sum a
 * reader can feel, rather than a percentage or a unit value that means
 * nothing on its own.
 *
 * @param held - The readings, oldest first.
 * @returns The sum on each day, or nothing when the first value is nought
 *   -- which no unit is worth, and which would make every point infinite.
 */
export function growthOfStake(held: Reading[]): Reading[] {
  const first = held[0];
  if (first === undefined || first.value <= 0) {
    return [];
  }
  return held.map((one) => ({ day: one.day, value: (one.value / first.value) * STAKE }));
}

/**
 * How far below its highest value to date each day sits, in per cent.
 *
 * Nought on a day the fund made a new high; negative between highs. The
 * deepest point is the worst a holder who bought at the wrong moment has
 * had to sit through, which is the fact a volatility figure hides.
 *
 * @param held - The readings, oldest first.
 * @returns The drawdown on each day, never above nought.
 */
export function drawdown(held: Reading[]): Reading[] {
  let peak = 0;
  return held.flatMap((one) => {
    peak = Math.max(peak, one.value);
    return peak <= 0 ? [] : [{ day: one.day, value: ((one.value - peak) / peak) * 100 }];
  });
}

/** The highest and lowest readings, and the deepest fall. */
export interface Extremes {
  high: Reading;
  low: Reading;
  /**
   * The deepest drawdown, as a reading on the day it bottomed. Nought on
   * the first day for a series that never fell below a peak.
   */
  deepest: Reading;
}

/**
 * Where the series peaked, troughed, and fell furthest.
 *
 * @param held - The readings, oldest first.
 * @returns The extremes, or null for an empty series.
 */
export function extremes(held: Reading[]): Extremes | null {
  const first = held[0];
  if (first === undefined) {
    return null;
  }
  let high = first;
  let low = first;
  for (const one of held) {
    if (one.value > high.value) {
      high = one;
    }
    if (one.value < low.value) {
      low = one;
    }
  }
  let deepest: Reading = { day: first.day, value: 0 };
  for (const one of drawdown(held)) {
    if (one.value < deepest.value) {
      deepest = one;
    }
  }
  return { high, low, deepest };
}

/** How a rolling series was distributed. */
export interface RollingSummary {
  best: Reading;
  worst: Reading;
  median: number;
  /** The share of days on which the year's return was positive, in per cent. */
  positive: number;
}

/**
 * Summarise the rolling one-year returns.
 *
 * A trailing return is one draw; this says what the draws looked like. A
 * fund whose year has ranged from minus thirty to plus sixty is a different
 * holding from one whose year has ranged from four to twelve, however alike
 * their latest figures.
 *
 * @param rolling - The rolling returns, oldest first.
 * @returns The summary, or null when there is nothing to summarise.
 */
export function summariseRolling(rolling: RollingReturn[]): RollingSummary | null {
  const held = rolling.flatMap((one) => {
    const value = toNumber(one.percent);
    return value === null ? [] : [{ day: one.nav_date, value }];
  });
  const first = held[0];
  if (first === undefined) {
    return null;
  }
  let best = first;
  let worst = first;
  let positive = 0;
  for (const one of held) {
    if (one.value > best.value) {
      best = one;
    }
    if (one.value < worst.value) {
      worst = one;
    }
    if (one.value > 0) {
      positive += 1;
    }
  }
  const sorted = held.map((one) => one.value).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return { best, worst, median, positive: (positive / held.length) * 100 };
}
