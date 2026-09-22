/**
 * A run of net figures as bars either side of nought: green above, red below.
 *
 * A sparkline's kind of drawing, so inline SVG with no axes: the eye reads
 * the run -- ten red sessions of foreign selling -- and each bar says its
 * own session and figure when asked.
 */

import { toNumber } from "@/lib/format";

/** One bar: a session and its net figure. */
export interface FlowBar {
  day: string;
  net: string | null;
  /** What the bar says when asked, such as `22 Sep: -3,809.99 Cr`. */
  title: string;
}

interface FlowBarsProps {
  /** Oldest first, so the run reads left to right. */
  bars: FlowBar[];
  label: string;
  height?: number;
}

/** Room between bars, as a share of each bar's slot. */
const GAP = 0.25;

/**
 * Draw the bars.
 *
 * @param props - The bars, what they are, and how tall to draw them.
 * @returns The drawing, or nothing when there are no figures.
 */
export function FlowBars({ bars, label, height = 56 }: FlowBarsProps): React.JSX.Element | null {
  const known = bars.flatMap((one) => {
    const value = toNumber(one.net);
    return value === null ? [] : [{ ...one, value }];
  });
  if (known.length === 0) {
    return null;
  }
  // Scaled to the largest move either way, so nought sits in the middle
  // and a day's size reads against the run's.
  const largest = Math.max(...known.map((one) => Math.abs(one.value)), 1);
  const width = known.length * 10;
  const middle = height / 2;
  const slot = width / known.length;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
    >
      <line x1={0} x2={width} y1={middle} y2={middle} className="stroke-border" strokeWidth={0.5} />
      {known.map((one, position) => {
        const size = (Math.abs(one.value) / largest) * middle;
        return (
          <rect
            key={one.day}
            x={position * slot + (slot * GAP) / 2}
            width={slot * (1 - GAP)}
            y={one.value >= 0 ? middle - size : middle}
            height={Math.max(size, 0.5)}
            className={one.value >= 0 ? "fill-gain" : "fill-loss"}
          >
            <title>{one.title}</title>
          </rect>
        );
      })}
    </svg>
  );
}
