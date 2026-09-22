/**
 * One index, as a card: where it closed, how it moved, and how it got there.
 *
 * All four prices are shown rather than just the close, because the close
 * alone cannot distinguish a session that rose all day from one that gave
 * back everything it made. The candle says that at a glance and the grid
 * says it exactly -- with the close repeated among the three it has to be
 * read against, which is how the previous incarnation of this card had it.
 */

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { InstrumentOverview, KnownSymbol } from "@/api/client";
import { Delta } from "@/components/Delta";
import { MiniCandlestick } from "@/components/MiniCandlestick";
import { TradingViewLink } from "@/components/TradingViewLink";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { direction, formatDay, formatPrice } from "@/lib/format";
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
      className={cn("transition-shadow hover:shadow-md", chosen && "cursor-pointer")}
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
        {/* The previous project's card: the name in plain case with the
            day's move as a tinted badge beside it, the previous close under
            it, then the level with the session's candle and direction. */}
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-lg font-semibold">{name}</h3>
            <Delta value={day.change_percent} arrow={false} badge />
          </div>
          {/* Indices do not all publish on the same schedule, so two cards
              can show different sessions. Unlabelled, they read as the
              same day. */}
          <p className="text-sm text-muted-foreground">
            Previous close {formatPrice(day.previous_close)} · {formatDay(overview.as_of)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-2xl font-bold tabular">{formatPrice(day.close)}</div>
          <div className="flex shrink-0 items-center gap-2">
            <MiniCandlestick open={day.open} high={day.high} low={day.low} close={day.close} />
            <Direction value={day.change_percent} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
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
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="truncate tabular font-medium">{formatPrice(value)}</dd>
    </div>
  );
}

/**
 * The session's direction as the previous project drew it: a large arrow
 * beside the level, where the eye already is.
 *
 * @param props - The day's change.
 * @returns The arrow, or nothing for a flat or unknown session.
 */
function Direction({ value }: { value: string | null }): React.JSX.Element | null {
  const way = direction(value);
  if (way === "flat") {
    return null;
  }
  const Arrow = way === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <Arrow aria-hidden="true" className={cn("h-5 w-5", way === "up" ? "text-gain" : "text-loss")} />
  );
}
