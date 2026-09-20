/**
 * A line with no axes, read for its shape rather than its values.
 *
 * Inline SVG rather than a charting library: this draws one path and a
 * baseline, and a dependency that renders it would also bring interaction,
 * legends and a theme of its own to be argued with.
 */

import { cn } from "@/lib/utils";

interface SparklineProps {
  /** The series, oldest first. Gaps are permitted and are not drawn. */
  values: (number | null)[];
  /** A value to mark with a horizontal rule, such as nought for an oscillator. */
  baseline?: number;
  /** What the shape is, for a reader who cannot see it. */
  label: string;
  className?: string;
}

const WIDTH = 100;
const HEIGHT = 28;

/**
 * Draw a series as a single path.
 *
 * @param props - The series and how to describe it.
 * @returns The sparkline, or an empty box when there is nothing to draw.
 */
export function Sparkline({
  values,
  baseline,
  label,
  className,
}: SparklineProps): React.JSX.Element {
  const drawn = values.filter((value): value is number => value !== null);
  if (drawn.length < 2) {
    return (
      <div
        className={cn("h-7 w-full rounded bg-muted/40", className)}
        role="img"
        aria-label={`${label}: not enough history`}
      />
    );
  }

  const lowest = Math.min(...drawn, ...(baseline === undefined ? [] : [baseline]));
  const highest = Math.max(...drawn, ...(baseline === undefined ? [] : [baseline]));
  // A flat series would divide by nought; drawn down the middle instead,
  // which is what a flat series looks like.
  const span = highest - lowest || 1;
  const y = (value: number): number => HEIGHT - ((value - lowest) / span) * HEIGHT;
  const step = WIDTH / (drawn.length - 1);
  const path = drawn.map((value, index) => `${String(index * step)},${String(y(value))}`).join(" ");
  const last = drawn[drawn.length - 1] ?? 0;
  const first = drawn[0] ?? 0;

  return (
    <svg
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-full", className)}
      role="img"
      aria-label={`${label}: ${last > first ? "rising" : last < first ? "falling" : "flat"}`}
    >
      {baseline !== undefined && (
        <line
          x1={0}
          x2={WIDTH}
          y1={y(baseline)}
          y2={y(baseline)}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={path}
        fill="none"
        className={cn(last >= first ? "stroke-gain" : "stroke-loss")}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
