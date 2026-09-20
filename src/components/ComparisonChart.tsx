/**
 * Two or more instruments on one axis, as percentages from a common start.
 *
 * A description of what to draw, handed to the one chart. The rebasing is
 * the point of this component: gold trades near ten thousand rupees a unit
 * and the Nifty near twenty-five thousand points, so on a shared price
 * axis one line is a wall and the other is the floor.
 */

import { useMemo } from "react";

import type { KnownSymbol, PriceSeries } from "@/api/client";
import { Chart, type ChartInstrument, type Series } from "@/components/Chart";
import { rebase } from "@/lib/rebase";

/** What to call each series, and what colour to draw it. */
export interface ChartLine {
  instrumentKey: string;
  label: string;
  colour: string;
}

interface ComparisonChartProps {
  series: PriceSeries[] | null;
  lines: ChartLine[];
  /** What TradingView calls each instrument, when this platform knows. */
  symbols?: Record<string, KnownSymbol>;
  loading?: boolean;
}

/**
 * Draw the comparison.
 *
 * @param props - The series, how to label them, and where to link them.
 * @returns The chart, with each line's total return beside its name.
 */
export function ComparisonChart({
  series,
  lines,
  symbols = {},
  loading = false,
}: ComparisonChartProps): React.JSX.Element {
  const rebased = useMemo(() => rebase(series ?? []), [series]);
  const named = useMemo(() => new Map(lines.map((line) => [line.instrumentKey, line])), [lines]);

  const drawn = useMemo<Series[]>(
    () =>
      rebased.map((line) => ({
        kind: "line",
        label: named.get(line.instrumentKey)?.label ?? line.instrumentKey,
        colour: named.get(line.instrumentKey)?.colour ?? "#71717a",
        width: 2,
        points: line.points.map((point) => ({ time: point.day, value: point.percent })),
      })),
    [rebased, named],
  );

  const readings = rebased.map((line) => {
    const total = line.total ?? 0;
    return {
      label: named.get(line.instrumentKey)?.label ?? line.instrumentKey,
      value: `${total >= 0 ? "+" : ""}${total.toFixed(2)}%`,
      tone: total >= 0 ? ("gain" as const) : ("loss" as const),
    };
  });

  const instruments = rebased.map<ChartInstrument>((line) => ({
    label: named.get(line.instrumentKey)?.label ?? line.instrumentKey,
    symbol: symbols[line.instrumentKey]?.symbol,
    derived: symbols[line.instrumentKey]?.derived,
  }));

  return (
    <Chart
      series={drawn}
      instruments={instruments}
      readings={readings}
      loading={loading}
      empty="No overlapping history to compare"
      asPercent
    />
  );
}
