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
