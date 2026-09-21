/**
 * Whether a session advanced or declined, and the McClellan oscillator
 * beneath it.
 *
 * One line rather than two counts. Two counts meant reading which of them
 * sat higher, which is a comparison the eye has to make afresh at every
 * point; a single line against a rule at nought answers it by its sign.
 * Above the rule more companies rose than fell, below it more fell than
 * rose, and how far from the rule is how one-sided the session was.
 *
 * The counts are not lost -- they are written under the reading when the
 * crosshair is over a session, which is the moment anybody wants them.
 *
 * Not the cumulative advance-decline line this replaced. That is a running
 * total from an arbitrary origin: its level is a fact about where the
 * window starts rather than about the market, and it reaches many times
 * the size of the population it counts.
 *
 * Two panes, because a percentage and an oscillator cannot share a scale:
 * the oscillator runs to some hundreds and would flatten the line against
 * the middle of the frame.
 */

import { useMemo } from "react";

import type { BreadthSession } from "@/api/client";
import { Chart, type Point, type Series } from "@/components/Chart";
import { OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { formatCount, toNumber } from "@/lib/format";

interface BreadthChartProps {
  sessions: BreadthSession[];
  loading?: boolean;
}

/** Nought: balance, and the only level either measure is read against. */
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
        label: "Net advancing",
        colour: PRICE_LINE,
        width: PRICE_WIDTH,
        scale: "percent",
        thresholds: ZERO,
        points: balance(sessions),
      },
      {
        kind: "line",
        label: "McClellan oscillator",
        colour: OSCILLATOR,
        pane: 1,
        scale: "count",
        thresholds: ZERO,
        points: figures(sessions, (session) => session.mcclellan_oscillator),
      },
    ];
  }, [sessions]);

  return <Chart series={series} scale="percent" loading={loading} empty="No sessions to draw" />;
}

/**
 * How one-sided each session was, with its counts kept alongside.
 *
 * @param sessions - The counted sessions.
 * @returns One point per session that anything moved on. A session nothing
 *   moved on has no balance to report -- not a balanced one -- so it is
 *   left out rather than drawn at nought.
 */
function balance(sessions: BreadthSession[]): Point[] {
  return sessions.flatMap((session) => {
    const percent = toNumber(session.net_advance_percent);
    if (percent === null) {
      return [];
    }
    return [
      {
        time: session.as_of,
        value: percent,
        detail: `${formatCount(session.advancing)} up · ${formatCount(session.declining)} down`,
      },
    ];
  });
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
): Point[] {
  return sessions
    .map((session) => ({ time: session.as_of, value: toNumber(of(session)) }))
    .filter((point): point is Point => point.value !== null);
}
