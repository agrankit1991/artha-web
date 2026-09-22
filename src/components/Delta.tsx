/**
 * A figure that is up, down, or neither.
 *
 * One component, because "what a rise looks like" is a decision this
 * application makes once. Two screens each colouring their own percentages
 * is how one of them ends up green where the other is red.
 */

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { direction, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  /** The figure, as the platform sent it. */
  value: string | null | undefined;
  /**
   * Whether to draw the direction arrow beside the sign and the colour.
   * On by default, as in the previous project; turned off only where the
   * figure sits inside something already coloured by direction, such as a
   * heatmap tile.
   */
  arrow?: boolean;
  /**
   * Draw it as a tinted pill, as the previous project's index cards showed
   * the day's move beside the name, rather than as coloured text.
   */
  badge?: boolean;
  className?: string;
}

/**
 * Render a percentage in the colour of its direction.
 *
 * Colour is never the only carrier: the sign is always printed, so the
 * figure reads the same to someone who cannot tell the two colours apart.
 * A flat or absent figure gets no arrow, because an arrow would claim a
 * direction that is not there.
 *
 * @param props - The figure and how to show it.
 * @returns The rendered figure.
 */
export function Delta({
  value,
  arrow = true,
  badge = false,
  className,
}: DeltaProps): React.JSX.Element {
  const way = direction(value);
  const Arrow = way === "up" ? ArrowUpRight : way === "down" ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 whitespace-nowrap",
        way === "up" && "text-gain",
        way === "down" && "text-loss",
        way === "flat" && "text-muted-foreground",
        badge && "rounded-md border px-1.5 py-0.5 text-xs font-medium",
        badge && way === "up" && "border-gain/30 bg-gain/5",
        badge && way === "down" && "border-loss/30 bg-loss/5",
        className,
      )}
    >
      {arrow && Arrow !== null && (
        <Arrow
          aria-hidden="true"
          data-testid={`arrow-${way}`}
          className="h-[1.1em] w-[1.1em] shrink-0"
        />
      )}
      {formatPercent(value)}
    </span>
  );
}
