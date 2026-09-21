/**
 * Where a value sits between a low and a high.
 *
 * A day's range, a year's range: the ends are printed and the value is a
 * marker between them, so "near its high" is seen rather than computed.
 * The figure is printed too -- a marker alone cannot be read precisely.
 */

import { ABSENT } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RangeMeterProps {
  label: string;
  low: number | null;
  high: number | null;
  value: number | null;
  /** How the three figures are written. */
  format: (value: number) => string;
  className?: string;
}

/**
 * Draw the range.
 *
 * @param props - The ends, the value, and how to write them.
 * @returns The meter.
 */
export function RangeMeter({
  label,
  low,
  high,
  value,
  format,
  className,
}: RangeMeterProps): React.JSX.Element {
  const known = low !== null && high !== null && value !== null && high > low;
  // Clamped: a value outside the range it was published against -- a close
  // above the year's high on the day it made one -- sits at the end rather
  // than off the bar.
  const share = known ? Math.max(0, Math.min(1, (value - low) / (high - low))) : null;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-medium">{value === null ? ABSENT : format(value)}</span>
      </div>
      <div
        className="relative h-1.5 w-full rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={value ?? undefined}
        aria-valuemin={low ?? undefined}
        aria-valuemax={high ?? undefined}
      >
        {share !== null && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
            style={{ left: `${String(share * 100)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs tabular text-muted-foreground">
        <span>{low === null ? ABSENT : format(low)}</span>
        <span>{high === null ? ABSENT : format(high)}</span>
      </div>
    </div>
  );
}
