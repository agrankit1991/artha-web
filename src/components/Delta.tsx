/**
 * A figure that is up, down, or neither.
 *
 * One component, because "what a rise looks like" is a decision this
 * application makes once. Two screens each colouring their own percentages
 * is how one of them ends up green where the other is red.
 */

import { direction, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  /** The figure, as the platform sent it. */
  value: string | null | undefined;
  /** Whether to show an arrow as well as the sign and the colour. */
  arrow?: boolean;
  className?: string;
}

/**
 * Render a percentage in the colour of its direction.
 *
 * Colour is never the only carrier: the sign is always printed, so the
 * figure reads the same to someone who cannot tell the two colours apart.
 *
 * @param props - The figure and how to show it.
 * @returns The rendered figure.
 */
export function Delta({ value, arrow = false, className }: DeltaProps): React.JSX.Element {
  const way = direction(value);
  return (
    <span
      className={cn(
        "tabular",
        way === "up" && "text-gain",
        way === "down" && "text-loss",
        way === "flat" && "text-muted-foreground",
        className,
      )}
    >
      {arrow && way !== "flat" ? (way === "up" ? "▲ " : "▼ ") : null}
      {formatPercent(value)}
    </span>
  );
}
