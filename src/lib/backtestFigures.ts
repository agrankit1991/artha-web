/**
 * How a backtest's figures are written.
 *
 * The platform sends them as numbers to full precision; a backtest's
 * returns are estimates on one history, so they are written to one decimal
 * -- a second would be a digit nobody measured -- in the units each figure
 * is: percent, points of difference, or a plain ratio.
 */

import { ABSENT, formatPercentTenths, formatPercentagePoints } from "@/lib/format";

/**
 * Write a percentage to one decimal, signed.
 *
 * @param value - The figure, or null.
 * @returns Something like `+26.2%`, or a dash.
 */
export function percent(value: number | null | undefined): string {
  return formatPercentTenths(value === null || value === undefined ? null : String(value));
}

/**
 * Write a difference of two percentages, in points, to one decimal.
 *
 * @param value - The difference, or null.
 * @returns Something like `+13.5 pp`, or a dash.
 */
export function points(value: number | null | undefined): string {
  return formatPercentagePoints(value === null || value === undefined ? null : String(value));
}

/**
 * Write a ratio, such as a Sharpe ratio, to two decimals.
 *
 * @param value - The ratio, or null.
 * @returns Something like `1.33`, or a dash.
 */
export function ratio(value: number | null | undefined): string {
  return value === null || value === undefined ? ABSENT : value.toFixed(2);
}

/**
 * Write a share, such as the share of capital invested, to whole percent, unsigned.
 *
 * @param value - The share, in percent, or null.
 * @returns Something like `68%`, or a dash.
 */
export function share(value: number | null | undefined): string {
  return value === null || value === undefined ? ABSENT : `${value.toFixed(0)}%`;
}

/**
 * Write a holding's weight in the portfolio to one decimal, unsigned.
 *
 * @param value - The weight, in percent, or null.
 * @returns Something like `10.4%`, or a dash.
 */
export function weight(value: number | null | undefined): string {
  return value === null || value === undefined ? ABSENT : `${value.toFixed(1)}%`;
}

/**
 * Write a count of sessions, months or trades.
 *
 * @param value - The count, or null.
 * @param unit - What is counted, singular: "session", "month", "trade".
 * @returns Something like `124 sessions`, or a dash.
 */
export function count(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined
    ? ABSENT
    : `${String(value)} ${unit}${value === 1 ? "" : "s"}`;
}

/** What each index a backtest is measured against is called. */
const BENCHMARKS: Readonly<Record<string, string>> = {
  nifty50: "Nifty 50",
  nifty500: "Nifty 500",
  vix: "India VIX",
  gold: "Gold",
};

/**
 * Name the index a backtest is measured against.
 *
 * @param key - The platform's key for it.
 * @returns Its name, or the key itself for one not named here.
 */
export function benchmarkName(key: string): string {
  return BENCHMARKS[key] ?? key;
}
