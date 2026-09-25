/**
 * The forecast band, as lines a chart can draw and sentences a reader can read.
 *
 * The platform forecasts where a price may be five, ten and twenty sessions
 * past its last close: the 10th, 50th and 90th percentile. Drawn from the
 * close through each of those sessions, the two outer lines hold the price
 * eight times in ten -- which is the claim, and the only one, that a band
 * makes. Every sentence about it states how that claim fared in testing.
 */

import type { BandRecord, PriceBands } from "@/api/client";
import { toNumber } from "@/lib/format";

/** One point on a band's line. */
export interface BandPoint {
  time: string;
  value: number;
}

/** The band's three lines, each beginning at the last close. */
export interface BandLines {
  low: BandPoint[];
  median: BandPoint[];
  high: BandPoint[];
}

/**
 * Turn the platform's bands into three lines from the last close.
 *
 * @param bands - The bands.
 * @returns The lines. A horizon the calendar could not place on a date, or
 *   whose prices will not parse, is left out rather than drawn at a guessed
 *   date or at nought.
 */
export function bandLines(bands: PriceBands): BandLines {
  const close = toNumber(bands.close);
  const start = close === null ? [] : [{ time: bands.as_of, value: close }];
  const lines: BandLines = { low: [...start], median: [...start], high: [...start] };
  for (const point of bands.points) {
    const low = toNumber(point.low);
    const median = toNumber(point.median);
    const high = toNumber(point.high);
    if (point.session === null || low === null || median === null || high === null) {
      continue;
    }
    lines.low.push({ time: point.session, value: low });
    lines.median.push({ time: point.session, value: median });
    lines.high.push({ time: point.session, value: high });
  }
  return lines;
}

/**
 * Name the kind of model behind a band in words.
 *
 * @param method - The method the platform records.
 * @returns What it is, for a reader.
 */
export function methodName(method: string): string {
  if (method === "volatility-cone") {
    return "each stock's own volatility (no AI)";
  }
  if (method.startsWith("lightgbm-band")) {
    const context = [
      method.includes("+market") ? "market strength" : null,
      method.includes("+sector") ? "sector strength" : null,
    ].filter((part): part is string => part !== null);
    return context.length === 0
      ? "an AI model (LightGBM) reading the stock's own figures"
      : `an AI model (LightGBM) reading the stock's figures, ${context.join(" and ")}`;
  }
  return method;
}

/**
 * Whether a band's middle line has shown any skill at direction in testing.
 *
 * @param record - How the model did on years it never saw.
 * @returns True only where its middle missed by less, on average, than
 *   saying the price would not move.
 */
export function middleHasSkill(record: BandRecord): boolean {
  return record.median_error < record.zero_error;
}

/**
 * The record of the model behind the longest band drawn.
 *
 * @param bands - The bands.
 * @returns That horizon's record, or null when the platform has none.
 */
export function longestRecord(bands: PriceBands): BandRecord | null {
  const longest = bands.points.at(-1)?.horizon;
  return bands.records.find((record) => record.horizon === longest) ?? null;
}

/**
 * The lines a chart should draw for a band.
 *
 * The edges always follow the forecast. The middle follows it only where the
 * model's middle beat "no change" in testing; otherwise it is drawn flat at
 * the last close, because a line that bends without skill claims a direction
 * nobody measured.
 *
 * @param bands - The bands.
 * @returns The lines to draw.
 */
export function drawnBand(bands: PriceBands): BandLines {
  const lines = bandLines(bands);
  const record = longestRecord(bands);
  if (record !== null && middleHasSkill(record)) {
    return lines;
  }
  const close = toNumber(bands.close);
  return close === null
    ? lines
    : { ...lines, median: lines.median.map((point) => ({ time: point.time, value: close })) };
}
