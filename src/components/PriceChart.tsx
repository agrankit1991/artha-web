/**
 * One instrument's sessions as candles, with what it traded and the
 * averages it is read against.
 *
 * A description of what to draw, handed to the one chart. The averages are
 * the platform's own, fetched alongside the bars rather than computed
 * here: a chart working them out in the browser would use a different
 * warm-up period and a different handling of gaps from the rule engine,
 * and the two would disagree about where a crossover happened -- the one
 * thing a chart on a backtesting platform must not do.
 */

import { useMemo } from "react";

import type { ChartPoint } from "@/api/client";
import { Chart, type ChartInstrument, type Series } from "@/components/Chart";
import { toNumber } from "@/lib/format";

interface PriceChartProps {
  points: ChartPoint[] | null;
  /** The instrument drawn, offered as a link out. */
  instrument?: ChartInstrument;
  loading?: boolean;
}

/** The averages drawn over the candles, and the colour each is drawn in. */
const AVERAGES: { of: (point: ChartPoint) => string | null; label: string; colour: string }[] = [
  { of: (point) => point.sma_20, label: "20-day", colour: "#f59e0b" },
  { of: (point) => point.sma_50, label: "50-day", colour: "#3b82f6" },
  { of: (point) => point.sma_200, label: "200-day", colour: "#a855f7" },
];

const RISING = "rgba(22,163,74,0.35)";
const FALLING = "rgba(220,38,38,0.35)";

/**
 * Draw the candles.
 *
 * @param props - The sessions, and the instrument they belong to.
 * @returns The chart.
 */
export function PriceChart({
  points,
  instrument,
  loading = false,
}: PriceChartProps): React.JSX.Element {
  const sessions = useMemo(() => points ?? [], [points]);

  const series = useMemo<Series[]>(() => {
    if (sessions.length === 0) {
      return [];
    }
    return [
      {
        kind: "candles",
        label: "Price",
        points: sessions.map((point) => ({
          time: point.day,
          open: toNumber(point.open) ?? 0,
          high: toNumber(point.high) ?? 0,
          low: toNumber(point.low) ?? 0,
          close: toNumber(point.close) ?? 0,
        })),
      },
      {
        kind: "bars",
        label: "Volume",
        points: sessions.map((point) => ({
          time: point.day,
          value: point.volume,
          color: (toNumber(point.close) ?? 0) >= (toNumber(point.open) ?? 0) ? RISING : FALLING,
        })),
      },
      ...AVERAGES.map<Series>((average) => ({
        kind: "line",
        label: average.label,
        colour: average.colour,
        // Sessions with no average yet are left out rather than drawn as
        // nought, which would put a cliff at the start of every line.
        points: sessions
          .map((point) => ({ time: point.day, value: toNumber(average.of(point)) }))
          .filter((entry): entry is { time: string; value: number } => entry.value !== null),
      })),
    ];
  }, [sessions]);

  return (
    <Chart
      series={series}
      instruments={instrument ? [instrument] : []}
      loading={loading}
      empty="No sessions to draw"
    />
  );
}
