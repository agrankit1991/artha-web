/**
 * How fast a reported figure has grown, compounded, as Screener states it.
 *
 * Over the span the statements actually cover and no further: this
 * platform holds about four yearly periods, so a three-year rate is the
 * longest it can honestly give, and it says how many years it used.
 */

import type { Statement } from "@/api/client";
import { toNumber } from "@/lib/format";

/** One figure's growth over the periods held. */
export interface Growth {
  lineItem: string;
  /** Compound annual growth from the earliest period held to the latest, in per cent. */
  compounded: number | null;
  /** How many years that rate spans. */
  years: number;
  /** Growth over the latest year alone, in per cent. */
  lastYear: number | null;
}

/** Days in a year, for turning two period ends into a span of years. */
const DAYS_PER_YEAR = 365.25;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Work out a line item's growth from a yearly statement.
 *
 * A compounded rate needs a positive start and end: growth from a loss, or
 * into one, has no compound rate, and inventing one would mislead.
 *
 * @param statement - A yearly statement, periods newest first.
 * @param lineItem - Which figure.
 * @returns Its growth, or null when fewer than two periods report it.
 */
export function growthOf(statement: Statement, lineItem: string): Growth | null {
  const values = statement.periods.flatMap((period) => {
    const figure = period.figures.find((one) => one.line_item === lineItem);
    const value = toNumber(figure?.value);
    return value === null ? [] : [{ end: period.period_end, value }];
  });
  const latest = values[0];
  const previous = values[1];
  const earliest = values.at(-1);
  if (latest === undefined || previous === undefined || earliest === undefined) {
    return null;
  }
  const years = Math.round(
    (Date.parse(latest.end) - Date.parse(earliest.end)) / MILLISECONDS_PER_DAY / DAYS_PER_YEAR,
  );
  return {
    lineItem,
    compounded:
      earliest.value > 0 && latest.value > 0 && years > 0
        ? ((latest.value / earliest.value) ** (1 / years) - 1) * 100
        : null,
    years,
    lastYear: previous.value > 0 ? ((latest.value - previous.value) / previous.value) * 100 : null,
  };
}
