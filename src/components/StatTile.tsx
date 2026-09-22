/**
 * One figure that decides something, in a tile.
 *
 * The previous project's four-across grid, as one component: a label, the
 * figure, and beside or under it whatever qualifies it -- a change, a date,
 * a phrase. Tiles are for the handful of figures a reader decides on; a
 * dozen of them is a table wearing a costume.
 */

import { Delta } from "@/components/Delta";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  /** The figure, already formatted. */
  value: React.ReactNode;
  /** A percentage change to show beside the figure, signed and coloured. */
  delta?: string | null;
  /** What qualifies the figure: when it was, what it is against. */
  hint?: string;
  className?: string;
}

/**
 * Render the tile.
 *
 * @param props - The figure and what qualifies it.
 * @returns The tile.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  className,
}: StatTileProps): React.JSX.Element {
  return (
    <div className={cn("rounded-lg bg-muted/50 p-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="tabular text-lg font-semibold">{value}</span>
        {delta !== undefined && delta !== null && <Delta value={delta} className="text-sm" />}
      </div>
      {hint !== undefined && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * A row of tiles, four across on a wide screen and two on a phone.
 *
 * @param props - The tiles.
 * @returns The grid.
 */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}
