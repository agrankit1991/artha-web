/**
 * How a day's moves were spread across a population, as a row of bars.
 *
 * "The index rose one per cent" hides whether every company rose one per
 * cent or two giants rose five while the rest fell. Counting the moves
 * into a few buckets says which. It sat inside the valuation panel, which
 * is about what companies trade at; it is about how they moved, so it now
 * sits with the day's leaders.
 */

import { useMemo } from "react";

import { Hint } from "@/components/Hint";
import { toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The buckets today's moves are counted into, in per cent. */
export const BUCKETS: { from: number; to: number; label: string }[] = [
  { from: Number.NEGATIVE_INFINITY, to: -5, label: "< -5%" },
  { from: -5, to: -2, label: "-5 to -2%" },
  { from: -2, to: 0, label: "-2 to 0%" },
  { from: 0, to: 0, label: "0%" },
  { from: 0, to: 2, label: "0 to 2%" },
  { from: 2, to: 5, label: "2 to 5%" },
  { from: 5, to: Number.POSITIVE_INFINITY, label: "> 5%" },
];

/**
 * How today's moves were distributed, as a row of bars.
 *
 * Inline SVG rather than the chart library, as the sparklines are: bars
 * with no axes are a few rectangles, and every bar is labelled beneath and
 * for a screen reader.
 */
export function MoveSpread({
  changes,
}: {
  changes: readonly (string | null)[];
}): React.JSX.Element {
  const counts = useMemo(() => bucketed(changes), [changes]);
  const total = counts.reduce((sum, one) => sum + one, 0);
  if (total === 0) {
    return <></>;
  }
  const tallest = Math.max(...counts);
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1 text-sm font-semibold">
        Spread of today&rsquo;s moves
        <Hint
          term="the spread of moves"
          text="How many companies moved by how much. A rise carried by everybody is a wide right-hand side; one carried by a few giants is a tall middle and a long thin tail."
        />
      </h4>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${String(BUCKETS.length)}, minmax(0, 1fr))` }}
        role="img"
        aria-label={BUCKETS.map((bucket, at) => `${bucket.label}: ${String(counts[at] ?? 0)}`).join(
          ", ",
        )}
      >
        {BUCKETS.map((bucket, at) => {
          const count = counts[at] ?? 0;
          const share = count / tallest;
          const tone =
            bucket.to <= 0 && bucket.from < 0
              ? "bg-loss"
              : bucket.from >= 0 && bucket.to > 0
                ? "bg-gain"
                : "bg-muted-foreground/50";
          return (
            <div key={bucket.label} className="flex flex-col items-center gap-1">
              <span className="text-xs tabular text-muted-foreground">{count}</span>
              <div className="flex h-16 w-full items-end">
                <div
                  className={cn("w-full rounded-t", tone)}
                  style={{ height: `${String(Math.max(share * 100, count > 0 ? 4 : 0))}%` }}
                />
              </div>
              <span className="text-[0.65rem] text-muted-foreground">{bucket.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Count the moves into the buckets.
 *
 * @param changes - Each company's move in per cent; one without a move is
 *   not counted.
 * @returns A count per bucket, in the buckets' order.
 */
export function bucketed(changes: readonly (string | null)[]): number[] {
  const counts = BUCKETS.map(() => 0);
  for (const moved of changes) {
    const change = toNumber(moved);
    if (change === null) {
      continue;
    }
    const at =
      change === 0
        ? BUCKETS.findIndex((bucket) => bucket.from === 0 && bucket.to === 0)
        : BUCKETS.findIndex(
            (bucket) =>
              !(bucket.from === 0 && bucket.to === 0) &&
              (change > 0
                ? change > bucket.from && change <= bucket.to
                : change >= bucket.from && change < bucket.to),
          );
    counts[at] = (counts[at] ?? 0) + 1;
  }
  return counts;
}
