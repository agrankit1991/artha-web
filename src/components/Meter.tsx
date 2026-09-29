/**
 * A percentage as a bar, for reading at a glance.
 *
 * The figure is printed as well as drawn: a bar alone cannot be read
 * precisely, and a number alone cannot be compared across three of them
 * without doing arithmetic.
 *
 * The bar is the brand's teal, not green above half and red below: a share
 * of stocks above an average is not good or bad by itself (95% above the
 * 200-day is over-extended, and the breadth readings say so), so the
 * caption says what it means and the bar only says how much. A tick marks
 * the halfway line to read it against.
 */

import { ABSENT } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MeterProps {
  label: string;
  /** The percentage, between nought and a hundred. */
  percent: number | null;
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
export function Meter({ label, percent, caption, className }: MeterProps): React.JSX.Element {
  const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-medium">
          {percent === null ? ABSENT : `${percent.toFixed(1)}%`}
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-brand"
          style={{ width: `${String(clamped)}%` }}
        />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-foreground/25" />
      </div>
      {caption !== undefined && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
