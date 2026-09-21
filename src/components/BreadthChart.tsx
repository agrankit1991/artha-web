/**
 * The advance–decline line and the McClellan oscillator, over time.
 *
 * Both are shapes rather than readings -- a cumulative line is read for
 * its direction and its disagreements with the index, and an oscillator
 * for where it crosses nought -- so both want a chart with dates on it
 * rather than the sparkline that stands in for them at a glance.
 *
 * Two panes, because the two cannot share a scale: this market's
 * advance–decline line sits near minus seventy-six thousand and its
 * oscillator between roughly plus and minus a hundred. On one axis the
 * oscillator is a flat line along the bottom.
 */

import { useMemo } from "react";

import type { BreadthSession } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { toNumber } from "@/lib/format";

interface BreadthChartProps {
  sessions: BreadthSession[];
  loading?: boolean;
}

/** Nought, which is the only level an oscillator is read against. */
const ZERO = [{ value: 0 }];

/**
 * Draw the two measures.
 *
 * @param props - The counted sessions, oldest first.
 * @returns The chart.
 */
export function BreadthChart({ sessions, loading = false }: BreadthChartProps): React.JSX.Element {
  const series = useMemo<Series[]>(() => {
    if (sessions.length === 0) {
      return [];
    }
    return [
      {
        kind: "line",
        label: "Advance–decline line",
        colour: PRICE_LINE,
        width: PRICE_WIDTH,
        points: figures(sessions, (session) => session.advance_decline_line),
      },
      {
        kind: "line",
        label: "McClellan oscillator",
        colour: OSCILLATOR,
        pane: 1,
        thresholds: ZERO,
        points: figures(sessions, (session) => session.mcclellan_oscillator),
      },
    ];
  }, [sessions]);

  return <Chart series={series} scale="count" loading={loading} empty="No sessions to draw" />;
}

/**
 * Take one figure from every session it exists for.
 *
 * @param sessions - The counted sessions.
 * @param of - Which figure.
 * @returns The points. A session the figure does not exist for yet is left
 *   out rather than drawn at nought -- the oscillator needs thirty-nine
 *   sessions before it means anything, and a flat run at nought before
 *   that would read as a market in perfect balance.
 */
function figures(
  sessions: BreadthSession[],
  of: (session: BreadthSession) => string | null,
): { time: string; value: number }[] {
  return sessions
    .map((session) => ({ time: session.as_of, value: toNumber(of(session)) }))
    .filter((point): point is { time: string; value: number } => point.value !== null);
}
