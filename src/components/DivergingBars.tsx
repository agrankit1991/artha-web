/**
 * A ranked list drawn as bars either side of nought: which rose most and
 * which fell most, at a glance.
 *
 * Plain HTML rather than the chart library, like the other bar strips here:
 * there are no axes to read, only a name, a bar and its figure on one line,
 * and a line of text is what a reader scans down. Rise and fall are drawn in
 * their colours because these are rises and falls; every figure is printed
 * too, so the colour never says it alone.
 */

import { Link } from "react-router-dom";

import { Delta } from "@/components/Delta";
import { cn } from "@/lib/utils";

/** One thing ranked. */
export interface DivergingRow {
  label: string;
  /** Its figure, a signed percentage. */
  value: number;
  /** Its own page, when it has one. */
  href?: string;
}

interface DivergingBarsProps {
  rows: readonly DivergingRow[];
  /** What the list ranks, for a reader who cannot see the bars. */
  label: string;
  /**
   * The move a full half-bar stands for. By default the largest shown;
   * lists read side by side pass one reach, or a +4% on one reads as long
   * as a +50% on the other.
   */
  reach?: number;
  /** How a figure is written; a signed percentage by default. */
  format?: (value: string | null | undefined) => string;
  className?: string;
}

/**
 * Draw the list.
 *
 * @param props - The rows, in the order they are to be read.
 * @returns The bars.
 */
export function DivergingBars({
  rows,
  label,
  reach,
  format,
  className,
}: DivergingBarsProps): React.JSX.Element {
  // Scaled to the largest move shown, so the strongest bar reaches the edge
  // and the rest are read against it.
  const largest = reach ?? Math.max(...rows.map((row) => Math.abs(row.value)), Number.EPSILON);

  return (
    <ul aria-label={label} className={cn("space-y-1.5", className)}>
      {rows.map((row) => {
        const share = (Math.abs(row.value) / largest) * 50;
        const rising = row.value >= 0;
        return (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] items-center gap-3 text-sm"
          >
            <span className="truncate" title={row.label}>
              {row.href === undefined ? (
                row.label
              ) : (
                <Link to={row.href} viewTransition className="hover:text-primary hover:underline">
                  {row.label}
                </Link>
              )}
            </span>
            <span aria-hidden="true" className="relative h-2.5 rounded-full bg-muted">
              {/* Nought, where every bar starts. */}
              <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
              <span
                className={cn(
                  "absolute inset-y-0 rounded-full transition-[width] duration-300 ease-brand",
                  rising ? "left-1/2 bg-gain" : "right-1/2 bg-loss",
                )}
                style={{ width: `${String(share)}%` }}
              />
            </span>
            <span className="text-right">
              <Delta value={String(row.value)} {...(format === undefined ? {} : { format })} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
