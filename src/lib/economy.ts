/**
 * How the Economy page writes India's economic indicators: each period the way
 * its publisher names it, and each value in its unit. Kept apart from the page
 * so the arithmetic is tested as arithmetic.
 */

import type { EconomicSeries } from "@/api/client";

const MONTH = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const SHORT_MONTH = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

/**
 * Name a figure's period the way its publisher would.
 *
 * @param series - The indicator, for how often it is published.
 * @param periodEnd - The period's last day, `YYYY-MM-DD`.
 * @returns "as on 30 Oct 2026" for a week, "Sep 2026" for a month, "Apr-Jun 2026" for a quarter.
 */
export function periodLabel(series: Pick<EconomicSeries, "frequency">, periodEnd: string): string {
  const end = new Date(`${periodEnd}T00:00:00Z`);
  if (series.frequency === "weekly") {
    return `as on ${DAY.format(end)}`;
  }
  if (series.frequency === "monthly") {
    return MONTH.format(end);
  }
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
  return `${SHORT_MONTH.format(start)}-${MONTH.format(end)}`;
}

/**
 * Write a value in its unit: reserves in US$ billion, rates as percentages, indices bare.
 *
 * @param series - The indicator, for its unit.
 * @param value - The value as stored, a decimal string.
 * @returns The value for reading.
 */
export function formatValue(series: Pick<EconomicSeries, "unit">, value: string): string {
  const number = Number(value);
  if (series.unit === "usd_million") {
    const billions = (number / 1000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
    return `US$ ${billions} bn`;
  }
  const written = number.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return series.unit === "percent" ? `${written}%` : written;
}

/**
 * The change between two amounts, as the signed percentage `Delta` draws.
 *
 * Only an amount gets one: a rate is shown beside the rate before it, since
 * "inflation up 14%" would mislead where "4.83%, then 5.54%" does not.
 *
 * @param series - The indicator, for its unit.
 * @param latest - The latest value.
 * @param before - The value before it, if any.
 * @returns The change in per cent to two places, or null where none is drawn.
 */
export function amountChange(
  series: Pick<EconomicSeries, "unit">,
  latest: string,
  before: string | undefined,
): string | null {
  if (series.unit !== "usd_million" || before === undefined || Number(before) === 0) {
    return null;
  }
  return ((Number(latest) / Number(before) - 1) * 100).toFixed(2);
}

/**
 * A chart point's value in the unit the chart is drawn in: reserves in US$ billion.
 *
 * @param series - The indicator, for its unit.
 * @param value - The value as stored.
 * @returns The number to plot.
 */
export function plotted(series: Pick<EconomicSeries, "unit">, value: string): number {
  return series.unit === "usd_million" ? Number(value) / 1000 : Number(value);
}
