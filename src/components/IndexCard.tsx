/**
 * One index, as a card: where it closed, how it moved, and how it got there.
 *
 * The four prices are all shown rather than just the close, because the
 * close alone cannot distinguish a session that rose all day from one that
 * gave back everything it made. The candle says that at a glance and the
 * grid says it exactly.
 */

import type { InstrumentOverview } from "@/api/client";
import { Delta } from "@/components/Delta";
import { MiniCandlestick } from "@/components/MiniCandlestick";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface IndexCardProps {
  name: string;
  overview: InstrumentOverview | undefined;
  /** What to do when the card is chosen, if anything. */
  onSelect?: (instrumentKey: string) => void;
}

/**
 * Render one index's latest session.
 *
 * @param props - What to call it, what it did, and what choosing it means.
 * @returns The card.
 */
export function IndexCard({ name, overview, onSelect }: IndexCardProps): React.JSX.Element {
  if (overview === undefined) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {name}
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { day } = overview;
  const chosen = onSelect;

  return (
    <Card
      className={cn(chosen && "cursor-pointer transition-colors hover:bg-muted/50")}
      {...(chosen
        ? {
            role: "button",
            tabIndex: 0,
            onClick: () => {
              chosen(overview.instrument_key);
            },
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                chosen(overview.instrument_key);
              }
            },
          }
        : {})}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {name}
          </span>
          <Delta value={day.change_percent} arrow className="text-xs font-medium" />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold tabular">{formatPrice(day.close)}</div>
            <div className="text-xs text-muted-foreground">
              Previous close {formatPrice(day.previous_close)}
            </div>
          </div>
          <MiniCandlestick open={day.open} high={day.high} low={day.low} close={day.close} />
        </div>

        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <Price label="Open" value={day.open} />
          <Price label="High" value={day.high} />
          <Price label="Low" value={day.low} />
        </dl>
      </CardContent>
    </Card>
  );
}

/** One of the session's prices, labelled. */
function Price({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate tabular font-medium">{formatPrice(value)}</dd>
    </div>
  );
}
