/**
 * Which groups are gaining strength and which are losing it: each one's
 * return over the past month against its return over the past week.
 *
 * The four quarters of the plot are the four states a rotation passes
 * through. Up over both is leading; up over the month but down this week
 * is weakening; down over both is lagging; down over the month but up this
 * week is improving. A group drifting from one quarter to the next is the
 * rotation a reader is looking for.
 *
 * Plain HTML rather than the chart library, like the other bar strips here:
 * Lightweight Charts draws against time and has no scatter, and a dot that
 * is a real link is one a keyboard can reach and a screen reader can name.
 * Both axes are centred on nought so the four quarters are the same size
 * and a quarter's emptiness means something. The groups furthest into each
 * quarter are named beneath the plot, because a cloud of unnamed dots
 * answers "which?" only one hover at a time.
 */

import { useState } from "react";
import { Link } from "react-router-dom";

import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One group on the plot. */
export interface RotationPoint {
  name: string;
  /** Its own page. */
  href: string;
  /** Its return over the past week, in per cent. */
  week: number;
  /** Its return over the past month, in per cent. */
  month: number;
  /** How many companies it rests on, which sizes its dot. */
  companies: number;
}

interface RotationChartProps {
  points: readonly RotationPoint[];
  /** What the plot shows, for a reader who cannot see it. */
  label: string;
}

/** A quarter of the plot, named for the state it stands for. */
interface Quarter {
  name: string;
  /** What being in it means, in words. */
  reading: string;
  /** Whether a point belongs in it. */
  holds: (point: RotationPoint) => boolean;
  /** Where its name sits on the plot. */
  corner: string;
}

// A point on an axis belongs with the rises: nought is not a fall.
const QUARTERS: readonly Quarter[] = [
  {
    name: "Leading",
    reading: "Up over the month and the week",
    holds: (point) => point.month >= 0 && point.week >= 0,
    corner: "right-2 top-2 text-right",
  },
  {
    name: "Weakening",
    reading: "Up over the month, down this week",
    holds: (point) => point.month >= 0 && point.week < 0,
    corner: "bottom-2 right-2 text-right",
  },
  {
    name: "Lagging",
    reading: "Down over the month and the week",
    holds: (point) => point.month < 0 && point.week < 0,
    corner: "bottom-2 left-2",
  },
  {
    name: "Improving",
    reading: "Down over the month, up this week",
    holds: (point) => point.month < 0 && point.week >= 0,
    corner: "left-2 top-2",
  },
];

/** How many of each quarter are named beneath the plot. */
const NAMED = 3;

/**
 * Draw the plot and name the leaders of each quarter.
 *
 * @param props - The groups; an empty list draws the empty quarters.
 * @returns The plot.
 */
export function RotationChart({ points, label }: RotationChartProps): React.JSX.Element {
  const [pointed, setPointed] = useState<RotationPoint | null>(null);
  const across = axis(points.map((point) => point.month));
  const up = axis(points.map((point) => point.week));
  const largest = Math.max(...points.map((point) => point.companies), 1);
  // Far is measured against each axis's reach, so a week's few per cent
  // counts as much as a month's many.
  const reach = (point: RotationPoint): number =>
    Math.hypot(point.month / across.reach, point.week / up.reach);

  return (
    <figure className="space-y-4">
      <div className="grid grid-cols-[2.75rem_1fr] grid-rows-[1fr_1.5rem]">
        {/* The week's scale, read up the left. */}
        <div aria-hidden="true" className="relative">
          {up.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 -translate-y-1/2 text-micro tabular text-muted-foreground"
              style={{ top: `${String(up.place(tick, true))}%` }}
            >
              {tickLabel(tick)}
            </span>
          ))}
        </div>
        <div
          role="group"
          aria-label={label}
          className="relative h-72 rounded-md border bg-muted/20 sm:h-96"
        >
          {/* Nought on each axis, where the quarters meet. */}
          <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-foreground/25" />
          <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-foreground/25" />
          {QUARTERS.map((quarter) => (
            <span
              key={quarter.name}
              aria-hidden="true"
              className={cn("absolute text-xs font-medium text-muted-foreground", quarter.corner)}
            >
              {quarter.name}
            </span>
          ))}
          {points.map((point) => {
            const left = across.place(point.month, false);
            const top = up.place(point.week, true);
            const size = 8 + 14 * Math.sqrt(point.companies / largest);
            return (
              <Link
                key={point.name}
                to={point.href}
                viewTransition
                aria-label={`${point.name}: ${formatPercent(String(point.month))} over the month, ${formatPercent(String(point.week))} over the week, ${String(point.companies)} companies`}
                onMouseEnter={() => {
                  setPointed(point);
                }}
                onMouseLeave={() => {
                  setPointed(null);
                }}
                onFocus={() => {
                  setPointed(point);
                }}
                onBlur={() => {
                  setPointed(null);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/55 ring-2 dark:bg-primary/75 ring-card transition-colors hover:bg-primary focus-visible:bg-primary focus-visible:outline-none focus-visible:ring-foreground"
                style={{
                  left: `${String(left)}%`,
                  top: `${String(top)}%`,
                  width: size,
                  height: size,
                }}
              />
            );
          })}
          {pointed !== null && (
            <Reading
              point={pointed}
              left={across.place(pointed.month, false)}
              top={up.place(pointed.week, true)}
            />
          )}
        </div>
        <span aria-hidden="true" />
        {/* The month's scale, read along the bottom. */}
        <div aria-hidden="true" className="relative">
          {across.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-1 -translate-x-1/2 text-micro tabular text-muted-foreground"
              style={{ left: `${String(across.place(tick, false))}%` }}
            >
              {tickLabel(tick)}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Across, the past month; up, the past week. A larger dot rests on more companies.
      </figcaption>
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {QUARTERS.map((quarter) => {
          const members = points
            .filter((point) => quarter.holds(point))
            .sort((one, other) => reach(other) - reach(one));
          return (
            <div key={quarter.name} className="space-y-1">
              <dt>
                <span className="font-medium">{quarter.name}</span>{" "}
                <span className="tabular text-xs text-muted-foreground">{members.length}</span>
              </dt>
              <dd className="text-xs text-muted-foreground">{quarter.reading}</dd>
              <dd className="text-muted-foreground">
                {members.length === 0
                  ? "None"
                  : members.slice(0, NAMED).map((point, index) => (
                      <span key={point.name}>
                        {index > 0 && ", "}
                        <Link
                          to={point.href}
                          viewTransition
                          className="text-foreground hover:text-primary hover:underline"
                        >
                          {point.name}
                        </Link>
                      </span>
                    ))}
              </dd>
            </div>
          );
        })}
      </dl>
    </figure>
  );
}

/** One axis, centred on nought and reaching a little past the furthest point. */
interface Axis {
  /** How far either side of nought it reaches, in per cent. */
  reach: number;
  /** The marked values, nought among them. */
  ticks: number[];
  /**
   * Where a value falls, as a percentage of the plot from its left edge,
   * or from its top when `flipped` (a larger value is higher up).
   */
  place: (value: number, flipped: boolean) => number;
}

/**
 * Scale an axis to the values on it.
 *
 * @param values - Every value the axis carries; none gives a reach of one.
 * @returns The axis.
 */
function axis(values: readonly number[]): Axis {
  // A tenth past the furthest point, so its dot is not cut by the edge.
  const reach = Math.max(...values.map(Math.abs), 1) * 1.1;
  const step = tickStep(reach);
  const ticks: number[] = [];
  // The reach is never under 1.1, so the step is never finer than a half,
  // and halves add up exactly: no rounding is needed on the marks.
  for (let tick = -Math.floor(reach / step) * step; tick <= reach; tick += step) {
    ticks.push(tick);
  }
  return {
    reach,
    ticks,
    place: (value, flipped) => {
      const share = ((value + reach) / (2 * reach)) * 100;
      return flipped ? 100 - share : share;
    },
  };
}

/**
 * A round distance between marks giving two or three either side of nought.
 *
 * @param reach - How far the axis reaches either side.
 * @returns One, two or five times a power of ten.
 */
function tickStep(reach: number): number {
  const rough = reach / 2.5;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10]
    .map((multiple) => multiple * power)
    .reduce((best, one) => (Math.abs(one - rough) < Math.abs(best - rough) ? one : best));
}

/** A mark's value: signed, and nought plain. */
function tickLabel(tick: number): string {
  return tick === 0 ? "0" : `${tick > 0 ? "+" : ""}${String(tick)}%`;
}

/**
 * The pointed-at group's figures, beside its dot and kept inside the plot.
 *
 * @param props - The group, and where its dot is as percentages of the plot.
 * @returns The reading.
 */
function Reading({
  point,
  left,
  top,
}: {
  point: RotationPoint;
  left: number;
  top: number;
}): React.JSX.Element {
  // Turned inwards near an edge, so the reading never leaves the plot: on
  // a phone a reading past the right edge would scroll the whole page.
  const sideways = left > 65 ? "-translate-x-full -ml-3" : left < 35 ? "ml-3" : "-translate-x-1/2";
  const upwards = top < 30 ? "mt-4" : "-translate-y-full -mt-4";
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-10 w-max max-w-52 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md",
        sideways,
        upwards,
      )}
      style={{ left: `${String(left)}%`, top: `${String(top)}%` }}
    >
      <div className="font-medium">{point.name}</div>
      <div className="tabular text-muted-foreground">
        Month {formatPercent(String(point.month))} &middot; week {formatPercent(String(point.week))}
      </div>
      <div className="text-muted-foreground">{point.companies} companies</div>
    </div>
  );
}
