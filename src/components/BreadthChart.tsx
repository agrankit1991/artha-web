/**
 * How many companies rose and fell each session, and the McClellan
 * oscillator beneath them.
 *
 * Two counts rather than the textbook cumulative advance-decline line.
 * That line is a running total from an arbitrary origin, so its level says
 * nothing on its own: it reaches many times the size of the population it
 * counts, and a reader has to know the convention before the number means
 * anything at all. These are companies -- bounded by the population,
 * readable without the convention, and answering what is actually asked of
 * a breadth chart, which is how much of the market was taking part. Where
 * the advancing line sits above the declining one the market rose broadly;
 * where they cross, it turned.
 *
 * Two panes, because counts and an oscillator cannot share a scale: the
 * counts run to several thousand and the oscillator between roughly plus
 * and minus a hundred. On one axis the oscillator is a flat line along the
 * bottom.
 */

import { useMemo } from "react";

import type { BreadthSession } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { CANDLE_DOWN, CANDLE_UP, OSCILLATOR, PRICE_WIDTH } from "@/lib/chartPalette";
import { toNumber } from "@/lib/format";

interface BreadthChartProps {
  sessions: BreadthSession[];
  loading?: boolean;
}

/** Nought, which is the only level an oscillator is read against. */
const ZERO = [{ value: 0 }];

/**
 * Draw the participation measures.
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
        // The green a rising candle is drawn in, and the red a falling
        // one, so a colour means the same thing on every chart here.
        label: "Advancing",
        colour: CANDLE_UP,
        width: PRICE_WIDTH,
        points: points(sessions, (session) => session.advancing),
      },
      {
        kind: "line",
        label: "Declining",
        colour: CANDLE_DOWN,
        width: PRICE_WIDTH,
        points: points(sessions, (session) => session.declining),
      },
      {
        kind: "line",
        label: "McClellan oscillator",
        colour: OSCILLATOR,
        pane: 1,
        thresholds: ZERO,
        points: points(sessions, (session) => toNumber(session.mcclellan_oscillator)),
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
function points(
  sessions: BreadthSession[],
  of: (session: BreadthSession) => number | null,
): { time: string; value: number }[] {
  return sessions
    .map((session) => ({ time: session.as_of, value: of(session) }))
    .filter((point): point is { time: string; value: number } => point.value !== null);
}
