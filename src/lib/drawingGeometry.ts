/**
 * The arithmetic of drawings on a chart: where each kind is painted, whether
 * the pointer is on one, where a point snaps to, and what a measure reads.
 *
 * Kept apart from the canvas that paints them (artha-web CLAUDE.md: the chart
 * is stubbed in tests, so geometry is tested as geometry). Everything here
 * works in the plot's pixels; turning a session and a price into pixels is
 * the chart's job.
 */

import type { DrawingKind } from "@/api/client";

/** A spot on the plot, in pixels from its top left. */
export interface Pixel {
  x: number;
  y: number;
}

/** What a kind of drawing paints, in pixels. */
export type Shape =
  { kind: "segment"; from: Pixel; to: Pixel } | { kind: "box"; from: Pixel; to: Pixel };

/** How many points each kind is made of. */
export const POINTS: Record<DrawingKind, number> = {
  horizontal: 1,
  "horizontal-ray": 1,
  trend: 2,
  ray: 2,
  extended: 2,
  vertical: 1,
  rectangle: 2,
};

/** How near the pointer must come to a drawing, in pixels, to be on it. */
export const NEAR = 6;

/**
 * Work out what a drawing paints on a plot of a size.
 *
 * @param kind - What is drawn.
 * @param points - Its points in pixels, as many as the kind takes.
 * @param width - The plot's width.
 * @param height - The plot's height.
 * @returns The shape, lines carried to the plot's edge where the kind runs on;
 *   null when a ray's or a line's two points are the same spot, which give no
 *   direction to run in.
 */
export function shapeOf(
  kind: DrawingKind,
  points: readonly Pixel[],
  width: number,
  height: number,
): Shape | null {
  const [first, second] = points;
  if (first === undefined) {
    return null;
  }
  switch (kind) {
    case "horizontal":
      return { kind: "segment", from: { x: 0, y: first.y }, to: { x: width, y: first.y } };
    case "horizontal-ray":
      return { kind: "segment", from: first, to: { x: width, y: first.y } };
    case "vertical":
      return { kind: "segment", from: { x: first.x, y: 0 }, to: { x: first.x, y: height } };
    case "trend":
      return second === undefined ? null : { kind: "segment", from: first, to: second };
    case "rectangle":
      return second === undefined ? null : { kind: "box", from: first, to: second };
    case "ray":
    case "extended": {
      if (second === undefined || (first.x === second.x && first.y === second.y)) {
        return null;
      }
      const ahead = toEdge(first, second, width, height);
      return {
        kind: "segment",
        from: kind === "ray" ? first : toEdge(second, first, width, height),
        to: ahead,
      };
    }
  }
}

/**
 * Carry a line from one point through another until it leaves the plot.
 *
 * @param from - Where it starts.
 * @param through - A point it passes through, giving its direction.
 * @param width - The plot's width.
 * @param height - The plot's height.
 * @returns Where it meets the plot's edge.
 */
function toEdge(from: Pixel, through: Pixel, width: number, height: number): Pixel {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  // How far along the line each edge is; the nearest one ahead is where it leaves.
  const along = [
    dx > 0 ? (width - from.x) / dx : dx < 0 ? -from.x / dx : Number.POSITIVE_INFINITY,
    dy > 0 ? (height - from.y) / dy : dy < 0 ? -from.y / dy : Number.POSITIVE_INFINITY,
  ];
  const t = Math.max(1, Math.min(...along));
  return { x: from.x + dx * t, y: from.y + dy * t };
}

/**
 * How far a spot is from a segment.
 *
 * @param spot - The pointer.
 * @param from - One end.
 * @param to - The other.
 * @returns The distance in pixels to the nearest point of the segment.
 */
export function distanceToSegment(spot: Pixel, from: Pixel, to: Pixel): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((spot.x - from.x) * dx + (spot.y - from.y) * dy) / length));
  return Math.hypot(spot.x - (from.x + t * dx), spot.y - (from.y + t * dy));
}

/**
 * Whether the pointer is on a shape: near its line, or near a box's edge.
 *
 * @param shape - What a drawing paints.
 * @param spot - The pointer.
 * @returns True within `NEAR` pixels.
 */
export function isOn(shape: Shape, spot: Pixel): boolean {
  if (shape.kind === "segment") {
    return distanceToSegment(spot, shape.from, shape.to) <= NEAR;
  }
  const { from, to } = shape;
  const levelWithFrom = { x: to.x, y: from.y };
  const levelWithTo = { x: from.x, y: to.y };
  const edges: [Pixel, Pixel][] = [
    [from, levelWithFrom],
    [levelWithFrom, to],
    [to, levelWithTo],
    [levelWithTo, from],
  ];
  return edges.some(([start, end]) => distanceToSegment(spot, start, end) <= NEAR);
}

/** One session's four prices, for the magnet. */
export interface Session {
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Snap a price to the nearest of a session's open, high, low and close, when
 * it is near enough to it.
 *
 * Near enough is the caller's to say, in the chart's pixels: a magnet that
 * pulled every point onto a price left no way to draw in the room above or
 * below one -- a zone's corner, a level clear of the bars (the owner,
 * 2026-11-08). As TradingView's weak magnet does, it pulls only what is close.
 *
 * @param price - Where the pointer is.
 * @param session - The session it is over, or null where there is none.
 * @param within - Whether a session's price is near enough to the pointer to
 *   snap to; any is, unless said.
 * @returns The nearest of the four where it is within reach, else the price itself.
 */
export function snapped(
  price: number,
  session: Session | null,
  within: (candidate: number) => boolean = () => true,
): number {
  if (session === null) {
    return price;
  }
  const prices = [session.open, session.high, session.low, session.close];
  const nearest = prices.reduce((best, one) =>
    Math.abs(one - price) < Math.abs(best - price) ? one : best,
  );
  return within(nearest) ? nearest : price;
}

/** A day in milliseconds, for stepping through the calendar in UTC. */
const DAY = 86_400_000;

/**
 * Step through the calendar a number of weekdays from a day, Saturdays and
 * Sundays skipped.
 *
 * @param day - Where to start, as an ISO date.
 * @param count - How many weekdays on; backwards when negative.
 * @returns The day reached, as an ISO date.
 */
function weekdaysFrom(day: string, count: number): string {
  let at = Date.parse(`${day}T00:00:00Z`);
  const step = count < 0 ? -DAY : DAY;
  for (let left = Math.abs(count); left > 0;) {
    at += step;
    const weekday = new Date(at).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      left -= 1;
    }
  }
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * Count the weekdays after one day up to and including a later one.
 *
 * @param from - The earlier day.
 * @param to - The later day.
 * @returns How many weekdays on `to` is from `from`.
 */
function weekdaysBetween(from: string, to: string): number {
  let count = 0;
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let at = Date.parse(`${from}T00:00:00Z`) + DAY; at <= end; at += DAY) {
    const weekday = new Date(at).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      count += 1;
    }
  }
  return count;
}

/**
 * The session a place on the time scale stands for: its bar's day where there
 * is a bar, and past either end a weekday counted on from the nearest one.
 *
 * Past the last session the chart has no dates of its own -- the room to its
 * right is empty -- so a point drawn there is dated as the sessions to come
 * would be. Holidays ahead are not known, and count as sessions.
 *
 * @param days - The chart's sessions in order, as ISO dates.
 * @param logical - The place, in bars from the first (the library's logical index).
 * @returns The day, or null on a chart with no sessions.
 */
export function dayAtLogical(days: readonly string[], logical: number): string | null {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  const at = Math.round(logical);
  if (at < 0) {
    return weekdaysFrom(first, at);
  }
  return days[at] ?? weekdaysFrom(last, at - (days.length - 1));
}

/**
 * Where a day sits on the time scale: its bar's place, the next bar's where
 * it fell between two (a holiday), and past either end as many places on as
 * weekdays -- `dayAtLogical` turned round.
 *
 * @param days - The chart's sessions in order, as ISO dates.
 * @param day - The day, as an ISO date.
 * @returns The place in bars from the first, or null on a chart with no sessions.
 */
export function logicalOfDay(days: readonly string[], day: string): number | null {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  if (day > last) {
    return days.length - 1 + weekdaysBetween(last, day);
  }
  if (day < first) {
    return -weekdaysBetween(day, first);
  }
  // The first bar on or after the day, found by halving.
  let low = 0;
  let high = days.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    // `?? last` is unreachable: `middle` is always within the days.
    if ((days[middle] ?? last) < day) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/** What a measure between two points reads. */
export interface Measure {
  change: number;
  percent: number;
  sessions: number;
}

/**
 * Measure from one point to another: the move in price and per cent, and the
 * sessions between them.
 *
 * @param from - Where the measure starts: its session's position and price.
 * @param to - Where it ends.
 * @returns The reading; a percentage of nought from a price of nought.
 */
export function measure(
  from: { index: number; price: number },
  to: { index: number; price: number },
): Measure {
  const change = to.price - from.price;
  return {
    change,
    percent: from.price === 0 ? 0 : (change / from.price) * 100,
    sessions: Math.abs(to.index - from.index),
  };
}
