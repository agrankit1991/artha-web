/**
 * How many rose, held and fell, as one proportional bar.
 *
 * The breadth glance and the sectors list each drew their own, in a
 * different order and over a different track: one filled the rest with
 * red, so a sector with nothing counted would have read as all falling.
 * One bar now, risers first and fallers last over a neutral track, and the
 * counts said in words for a reader who cannot see it. Where the counts
 * are printed beside it is the caller's choice; the bar itself is not.
 */

import { cn } from "@/lib/utils";

interface AdvanceDeclineBarProps {
  advancing: number;
  declining: number;
  unchanged: number;
  /** Its height and width, which differ between a panel and a table cell. */
  className?: string;
}

/**
 * Draw the split.
 *
 * @param props - The three counts; all nought draws an empty track.
 * @returns The bar, labelled with the counts.
 */
export function AdvanceDeclineBar({
  advancing,
  declining,
  unchanged,
  className,
}: AdvanceDeclineBarProps): React.JSX.Element {
  // Nothing counted is an empty track rather than a division by nought.
  const counted = advancing + declining + unchanged || 1;
  const width = (count: number): string => `${String((count / counted) * 100)}%`;

  return (
    <div
      className={cn("flex overflow-hidden rounded-full bg-muted", className)}
      role="img"
      aria-label={`${String(advancing)} advancing, ${String(declining)} declining, ${String(unchanged)} unchanged`}
    >
      <div className="bg-gain" style={{ width: width(advancing) }} />
      <div className="bg-muted-foreground/40" style={{ width: width(unchanged) }} />
      <div className="bg-loss" style={{ width: width(declining) }} />
    </div>
  );
}
