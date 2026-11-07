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
 * Snap a price to the nearest of a session's open, high, low and close.
 *
 * @param price - Where the pointer is.
 * @param session - The session it is over, or null where there is none.
 * @returns The nearest of the four, or the price itself with no session.
 */
export function snapped(price: number, session: Session | null): number {
  if (session === null) {
    return price;
  }
  const prices = [session.open, session.high, session.low, session.close];
  return prices.reduce((best, one) =>
    Math.abs(one - price) < Math.abs(best - price) ? one : best,
  );
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
