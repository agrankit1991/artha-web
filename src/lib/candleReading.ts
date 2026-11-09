/**
 * What a candle's legend reading says, as a trading screen writes it: the
 * session's open, high, low and close, and its change from the close before.
 * Worked out once per series rather than on every pointer move, and kept
 * apart from the chart so it is tested as arithmetic.
 */

/** A candle as a chart draws one: a session and its four prices. */
export interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** One session's reading. */
export interface CandleReading {
  open: number;
  high: number;
  low: number;
  close: number;
  /** The close less the session before's; null for the first session drawn. */
  change: number | null;
  /** That change in per cent of the close before; null where there is none. */
  percent: number | null;
}

/**
 * Read every candle of a series, each against the one before it.
 *
 * @param points - The candles, oldest first, as a chart draws them.
 * @returns Each session's reading, by its `time`.
 */
export function candleReadings(points: readonly CandlePoint[]): Map<string, CandleReading> {
  const readings = new Map<string, CandleReading>();
  let before: number | null = null;
  for (const { time, open, high, low, close } of points) {
    const change = before === null ? null : close - before;
    const percent =
      change === null || before === 0 || before === null ? null : (change / before) * 100;
    readings.set(time, { open, high, low, close, change, percent });
    before = close;
  }
  return readings;
}

/**
 * Write a change with its sign, as `Delta` does: a plus for a rise, an ASCII
 * hyphen for a fall, so a pasted figure keeps its sign in a spreadsheet.
 *
 * @param change - The change in price.
 * @param percent - The change in per cent.
 * @param price - How a price is written; given the change's size, the sign added here.
 * @returns "+5.00 (+0.33%)", or "-5.00 (-0.33%)".
 */
export function writtenChange(
  change: number,
  percent: number | null,
  price: (value: number) => string,
): string {
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  const share = percent === null ? "" : ` (${percent > 0 ? "+" : ""}${percent.toFixed(2)}%)`;
  return `${sign}${price(Math.abs(change))}${share}`;
}
