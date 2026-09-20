/**
 * Choosing how much history to look at.
 *
 * One control, so the chart, the breadth page and anything else that
 * spans time offer the same choice in the same order and call it the same
 * thing. The ranges themselves differ per screen -- a year of breadth and
 * a year of prices are worth different amounts -- so they are passed in.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One span on offer, and how many sessions it comes to. */
export interface Range {
  label: string;
  sessions: number;
}

/**
 * The spans a price chart offers.
 *
 * `Max` is the endpoint's own ceiling rather than a guess at how much
 * history exists: instruments differ, and asking for more than an
 * instrument has simply returns what it has.
 */
export const PRICE_RANGES: readonly Range[] = [
  { label: "1M", sessions: 21 },
  { label: "3M", sessions: 65 },
  { label: "6M", sessions: 125 },
  { label: "1Y", sessions: 250 },
  { label: "5Y", sessions: 1250 },
  { label: "Max", sessions: 12500 },
];

/** The spans the breadth page offers. */
export const BREADTH_RANGES: readonly Range[] = [
  { label: "3M", sessions: 65 },
  { label: "6M", sessions: 125 },
  { label: "1Y", sessions: 250 },
  { label: "2Y", sessions: 500 },
  { label: "5Y", sessions: 1250 },
];

interface RangeSelectorProps {
  ranges: readonly Range[];
  sessions: number;
  onChange: (sessions: number) => void;
  /** What the choice is about, for a reader who cannot see the buttons. */
  label?: string;
  className?: string;
}

/**
 * Offer the spans.
 *
 * @param props - The spans, which one is showing, and what to call.
 * @returns The selector.
 */
export function RangeSelector({
  ranges,
  sessions,
  onChange,
  label = "Range",
  className,
}: RangeSelectorProps): React.JSX.Element {
  return (
    <div className={cn("flex gap-1", className)} role="group" aria-label={label}>
      {ranges.map((range) => (
        <Button
          key={range.label}
          size="sm"
          variant={range.sessions === sessions ? "secondary" : "ghost"}
          aria-pressed={range.sessions === sessions}
          onClick={() => {
            onChange(range.sessions);
          }}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
