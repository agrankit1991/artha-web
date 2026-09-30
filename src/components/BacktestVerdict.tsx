/**
 * The verdict on a backtest: four figures from the period it is judged on.
 *
 * One set of tiles for the strategy's page and the backtest's page, which
 * once labelled the same figures differently ("CAGR, out of sample" on one,
 * "CAGR" under "Out of sample" on the other). The period is out of sample
 * when the backtest has one, after the years its settings could have been
 * chosen on, and the whole stretch otherwise.
 *
 * **The edge is not the CAGR less random picks.** A strategy that re-picks
 * on a schedule is judged on the median of the days its schedule could
 * start on, which the tile beside shows only for the one schedule played:
 * 30.4% a year against a judged 26.1% for the first kept backtest. The
 * edge's hint names the figure it is measured from, so the subtraction a
 * reader makes comes out.
 */

import type { BacktestPeriod } from "@/api/client";
import { Delta } from "@/components/Delta";
import { StatGrid, StatTile } from "@/components/StatTile";
import { percent, ratio } from "@/lib/backtestFigures";
import { formatPercentTenths, formatPercentagePoints } from "@/lib/format";

/** What each period is called. */
const NAMES: Record<BacktestPeriod["name"], string> = {
  "out-of-sample": "Out of sample",
  "in-sample": "In sample",
  whole: "The whole stretch",
};

/**
 * The period a backtest is judged on.
 *
 * @param periods - Its periods.
 * @returns Out of sample when it has one, else the whole stretch, else nothing.
 */
export function verdictPeriod(periods: readonly BacktestPeriod[]): BacktestPeriod | undefined {
  return (
    periods.find((period) => period.name === "out-of-sample") ??
    periods.find((period) => period.name === "whole")
  );
}

/**
 * What a period is called, one spelling everywhere.
 *
 * @param period - The period.
 * @returns Its name.
 */
export function periodName(period: BacktestPeriod): string {
  return NAMES[period.name];
}

/**
 * A figure that moves up or down, or a dash.
 *
 * @param value - The figure.
 * @param format - How it is written.
 * @returns The move.
 */
function move(
  value: number | null,
  format: (value: string | null | undefined) => string,
): React.ReactNode {
  return <Delta value={value === null ? null : String(value)} format={format} />;
}

/**
 * What the edge is measured from, in words.
 *
 * @param period - The period.
 * @returns The judged rate against random picks', naming the median start
 *   day where it is not the rate the CAGR tile shows.
 */
function edgeHint(period: BacktestPeriod): string {
  const random = `random picks' ${percent(period.random_median)}`;
  const judged = period.judged_cagr;
  const scheduled =
    judged !== null && period.cagr !== null && Math.abs(judged - period.cagr) >= 0.05;
  return scheduled ? `Median start day ${percent(judged)} against ${random}` : `Against ${random}`;
}

/**
 * Render the tiles.
 *
 * @param props - The period judged on (undefined while it loads) and the
 *   index the backtest is measured against, by name.
 * @returns Four tiles: CAGR, the edge, the deepest fall and the Sharpe ratio.
 */
export function VerdictTiles({
  period,
  index,
}: {
  period: BacktestPeriod | undefined;
  index: string;
}): React.JSX.Element {
  const loading = period === undefined;
  return (
    <StatGrid>
      <StatTile
        label="CAGR"
        value={loading ? null : move(period.cagr, formatPercentTenths)}
        loading={loading}
        {...(loading ? {} : { hint: `${index}: ${percent(period.benchmark_cagr)}` })}
      />
      <StatTile
        label="Edge over random picks"
        value={loading ? null : move(period.edge, formatPercentagePoints)}
        loading={loading}
        {...(loading ? {} : { hint: edgeHint(period) })}
      />
      <StatTile
        label="Max drawdown"
        value={loading ? null : percent(period.max_drawdown)}
        loading={loading}
      />
      <StatTile label="Sharpe" value={loading ? null : ratio(period.sharpe)} loading={loading} />
    </StatGrid>
  );
}
