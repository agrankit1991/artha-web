/**
 * One index, as a card: where it closed, how it moved, and how it got there.
 *
 * All four prices are shown rather than just the close, because the close
 * alone cannot distinguish a session that rose all day from one that gave
 * back everything it made. The candle says that at a glance and the grid
 * says it exactly -- with the close repeated among the three it has to be
 * read against, which is how the previous incarnation of this card had it.
 */

import type { InstrumentOverview, KnownSymbol } from "@/api/client";
import { Delta } from "@/components/Delta";
import { MiniCandlestick } from "@/components/MiniCandlestick";
import { TradingViewLink } from "@/components/TradingViewLink";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface IndexCardProps {
  name: string;
  overview: InstrumentOverview | undefined;
  /** What TradingView calls it, when this platform knows. */
  symbol?: KnownSymbol | undefined;
  /** What to do when the card is chosen, if anything. */
  onSelect?: (instrumentKey: string) => void;
}

/**
 * Render one index's latest session.
 *
 * @param props - What to call it, what it did, and what choosing it means.
 * @returns The card.
 */
export function IndexCard({ name, overview, symbol, onSelect }: IndexCardProps): React.JSX.Element {
  if (overview === undefined) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {name}
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-14 w-full" />
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
          <div className="min-w-0">
            <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {name}
            </div>
            {/* Indices do not all publish on the same schedule, so two
                cards can show different sessions. Unlabelled, they read as
                the same day. */}
            <div className="text-xs text-muted-foreground/70">{formatDay(overview.as_of)}</div>
          </div>
          <Delta value={day.change_percent} className="text-xs font-medium" />
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

        {/* The large figure above says where the session ended. This says
            it again beside the three prices it means nothing without. */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
          <Price label="Open" value={day.open} />
          <Price label="High" value={day.high} align="right" />
          <Price label="Low" value={day.low} />
          <Price label="Close" value={day.close} align="right" />
        </dl>

        {symbol !== undefined && (
          // Stopping the click from reaching the card: choosing the card
          // and leaving for TradingView are different intentions.
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            role="presentation"
          >
            <TradingViewLink
              label="View on TradingView"
              symbol={symbol.symbol}
              derived={symbol.derived}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** One of the session's prices, labelled beside its figure. */
function Price({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string | null;
  align?: "left" | "right";
}): React.JSX.Element {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-1.5", align === "right" && "justify-end")}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate tabular font-medium">{formatPrice(value)}</dd>
    </div>
  );
}
