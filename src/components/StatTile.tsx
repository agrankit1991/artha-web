/**
 * One figure that decides something, in a tile.
 *
 * The previous project's four-across grid, as one component: a label, the
 * figure, and beside or under it whatever qualifies it -- a change, a date,
 * a phrase. Tiles are for the handful of figures a reader decides on; a
 * dozen of them is a table wearing a costume.
 */

import { Delta } from "@/components/Delta";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * What a reading means, when a tile judges it: a breadth measure that is
 * healthy, weak or stretched. Separate from a change's rise or fall, which
 * `delta` carries.
 */
export type Tone = "good" | "bad" | "warn" | "neutral";

const TONES: Record<Tone, string> = {
  good: "text-gain",
  bad: "text-loss",
  warn: "text-caution",
  neutral: "",
};

interface StatTileProps {
  label: string;
  /** The figure, already formatted. */
  value: React.ReactNode;
  /** A percentage change to show beside the figure, signed and coloured. */
  delta?: string | null;
  /** What qualifies the figure: when it was, what it is against, what it means. */
  hint?: string;
  /** What the reading means, colouring the figure; neutral unless said. */
  tone?: Tone;
  /**
   * Whether the figure is still on its way. Shown as a placeholder rather
   * than as the absent mark, which would say "there is none".
   */
  loading?: boolean;
  className?: string;
}

/**
 * Render one tile.
 *
 * @param props - The label, the figure, and what qualifies it.
 * @returns The tile.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  tone = "neutral",
  loading = false,
  className,
}: StatTileProps): React.JSX.Element {
  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-xs", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className={cn("tabular text-xl font-semibold tracking-tight", TONES[tone])}>
            {value}
          </span>
          {delta !== undefined && delta !== null && <Delta value={delta} className="text-sm" />}
        </div>
      )}
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
