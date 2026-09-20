/**
 * A percentage as a bar, for reading at a glance.
 *
 * The figure is printed as well as drawn: a bar alone cannot be read
 * precisely, and a number alone cannot be compared across three of them
 * without doing arithmetic.
 */

import { ABSENT } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MeterProps {
  label: string;
  /** The percentage, between nought and a hundred. */
  percent: number | null;
  /** A value above which the bar reads as healthy rather than neutral. */
  healthyAbove?: number;
  /** A phrase placing the reading in context, shown under the bar. */
  caption?: string;
  className?: string;
}

/**
 * Draw one percentage.
 *
 * @param props - What it measures and where it stands.
 * @returns The meter.
 */
export function Meter({
  label,
  percent,
  healthyAbove = 50,
  caption,
  className,
}: MeterProps): React.JSX.Element {
  const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-medium">
          {percent === null ? ABSENT : `${percent.toFixed(0)}%`}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent === null ? "bg-muted" : percent >= healthyAbove ? "bg-gain" : "bg-loss",
          )}
          style={{ width: `${String(clamped)}%` }}
        />
      </div>
      {caption !== undefined && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
