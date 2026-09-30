/**
 * A ranked list drawn as bars either side of nought: which rose most and
 * which fell most, at a glance.
 *
 * Plain HTML rather than the chart library, like the other bar strips here:
 * there are no axes to read, only a name, a bar and its figure on one line,
 * and a line of text is what a reader scans down. Rise and fall are drawn in
 * their colours because these are rises and falls; every figure is printed
 * too, so the colour never says it alone.
 *
 * A row may carry a second figure to be read against, such as the market's
 * year beside a strategy's: drawn as a thin neutral bar under the first and
 * printed under its figure, with a legend naming the two.
 */

import { Link } from "react-router-dom";

import { Delta } from "@/components/Delta";
import { cn } from "@/lib/utils";

/** One thing ranked. */
export interface DivergingRow {
  label: string;
  /** Its figure, a signed percentage. */
  value: number;
  /** A figure it is read against, drawn thin and neutral under it; null when unknown. */
  against?: number | null;
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
  /** What the two figures are, for rows that carry a second. */
  legend?: { value: string; against: string };
  className?: string;
}

/**
 * Draw the list.
 *
 * @param props - The rows, in the order they are to be read.
 * @returns The bars, with a legend when the rows are paired.
 */
export function DivergingBars({
  rows,
  label,
  reach,
  format,
  legend,
  className,
}: DivergingBarsProps): React.JSX.Element {
  // Scaled to the largest move shown, either figure, so the strongest bar
  // reaches the edge and the rest are read against it.
  const largest =
    reach ??
    Math.max(
      ...rows.flatMap((row) => [Math.abs(row.value), Math.abs(row.against ?? 0)]),
      Number.EPSILON,
    );
  const written = format === undefined ? {} : { format };

  return (
    <div className={cn("space-y-2", className)}>
      {legend !== undefined && (
        <div aria-hidden="true" className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-gain" />
            {legend.value}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-foreground/40" />
            {legend.against}
          </span>
        </div>
      )}
      <ul aria-label={label} className="space-y-1.5">
        {rows.map((row) => {
          const paired = row.against !== undefined;
          return (
            <li
              key={row.label}
              className={cn(
                "grid items-center gap-3 text-sm",
                paired
                  ? "grid-cols-[minmax(0,11rem)_1fr_6rem]"
                  : "grid-cols-[minmax(0,11rem)_1fr_4.5rem]",
              )}
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
              <span aria-hidden="true" className="space-y-0.5">
                <Bar value={row.value} largest={largest} className="h-2.5" tone />
                {paired && <Bar value={row.against ?? 0} largest={largest} className="h-1" />}
              </span>
              <span className="text-right leading-tight">
                <Delta value={String(row.value)} {...written} />
                {paired && legend !== undefined && (
                  <span className="block text-xs text-muted-foreground">
                    <span className="sr-only">{legend.against} </span>
                    {row.against === null || row.against === undefined ? (
                      "-"
                    ) : (
                      <Delta value={String(row.against)} arrow={false} {...written} />
                    )}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * One bar from nought, across a track.
 *
 * @param props - Its figure, the figure a full half-track stands for, its
 *   height, and whether it is drawn in rise and fall colours or neutral.
 * @returns The track with its bar.
 */
function Bar({
  value,
  largest,
  className,
  tone = false,
}: {
  value: number;
  largest: number;
  className: string;
  tone?: boolean;
}): React.JSX.Element {
  const share = (Math.min(Math.abs(value), largest) / largest) * 50;
  const rising = value >= 0;
  return (
    <span className={cn("relative block rounded-full bg-muted", className)}>
      {/* Nought, where every bar starts. */}
      <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
      <span
        className={cn(
          "absolute inset-y-0 rounded-full transition-[width] duration-300 ease-brand",
          rising ? "left-1/2" : "right-1/2",
          tone ? (rising ? "bg-gain" : "bg-loss") : "bg-foreground/40",
        )}
        style={{ width: `${String(share)}%` }}
      />
    </span>
  );
}
