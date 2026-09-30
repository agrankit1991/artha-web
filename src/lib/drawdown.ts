/**
 * How far a series sits below its own highest value to date.
 *
 * One calculation for a fund's values and a backtest's equity alike: the
 * fund page draws it under the fund's record, the backtest page under the
 * strategy's growth.
 */

/** A value on a day. */
export interface Dated {
  day: string;
  value: number;
}

/**
 * How far below its highest value to date each day sits, in per cent.
 *
 * Nought on a day the series made a new high; negative between highs. The
 * deepest point is the worst a holder who bought at the wrong moment has
 * had to sit through, which is the fact a volatility figure hides.
 *
 * @param held - The readings, oldest first.
 * @returns The drawdown on each day, never above nought.
 */
export function drawdown(held: readonly Dated[]): Dated[] {
  let peak = 0;
  return held.flatMap((one) => {
    peak = Math.max(peak, one.value);
    return peak <= 0 ? [] : [{ day: one.day, value: ((one.value - peak) / peak) * 100 }];
  });
}
