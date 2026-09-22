/**
 * The top of an index's or a company's own page.
 *
 * The previous project's index header, with the price the plan adds to it:
 * a monogram tile, the badges that say where and what it is, the name
 * large with its exchange and symbol under it, and -- for anything that
 * trades -- the latest level with its move in points and per cent, and
 * where it sits in the day's and the year's range. One component so an
 * index page and a company page open the same way.
 */

import { RangeMeter } from "@/components/RangeMeter";
import { Delta } from "@/components/Delta";
import { direction, formatDay, formatPrice, formatSignedPrice, toNumber } from "@/lib/format";
import type { InstrumentOverview } from "@/api/client";
import { cn } from "@/lib/utils";

interface InstrumentHeaderProps {
  /** What it is called. */
  name: string;
  /** The line under the name, such as `NSE • NIFTY 50 • 50 companies`. */
  subline?: React.ReactNode;
  /** Where and what it is: exchange-and-symbol, category, sector. */
  badges?: React.ReactNode;
  /** Its latest figures; absent for a sector, which does not trade. */
  overview?: InstrumentOverview | null | undefined;
  description?: string | null | undefined;
  actions?: React.ReactNode;
}

/**
 * Draw the header.
 *
 * @param props - What to show.
 * @returns The header.
 */
export function InstrumentHeader({
  name,
  subline,
  badges,
  overview,
  description,
  actions,
}: InstrumentHeaderProps): React.JSX.Element {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 shadow-sm"
        >
          <span className="text-3xl font-bold text-primary">{monogram(name)}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {badges !== undefined && (
            <div className="flex flex-wrap items-center gap-2">{badges}</div>
          )}
          <h1 className="text-2xl font-bold md:text-3xl">{name}</h1>
          {subline !== undefined && (
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {subline}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          {actions}
          {overview != null && <Level overview={overview} />}
        </div>
      </div>
      {overview != null && (
        <div className="grid gap-4 sm:grid-cols-2">
          <RangeMeter
            label="Day's range"
            low={toNumber(overview.day.low)}
            high={toNumber(overview.day.high)}
            value={toNumber(overview.day.close)}
            format={(value) => formatPrice(String(value))}
          />
          <RangeMeter
            label="52-week range"
            low={toNumber(overview.year_range.low)}
            high={toNumber(overview.year_range.high)}
            value={toNumber(overview.day.close)}
            format={(value) => formatPrice(String(value))}
          />
        </div>
      )}
      {description != null && description !== "" && (
        <p className="max-w-5xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </header>
  );
}

/** The latest level, its move in points and per cent, and the session it is from. */
function Level({ overview }: { overview: InstrumentOverview }): React.JSX.Element {
  const way = direction(overview.day.change);
  return (
    <div className="text-left lg:text-right">
      <div className="text-3xl font-bold tabular">{formatPrice(overview.day.close)}</div>
      <div className="flex items-center gap-2 text-sm lg:justify-end">
        <span
          className={cn(
            "tabular font-medium",
            way === "up" && "text-gain",
            way === "down" && "text-loss",
            way === "flat" && "text-muted-foreground",
          )}
        >
          {formatSignedPrice(overview.day.change)}
        </span>
        <Delta value={overview.day.change_percent} className="font-medium" />
      </div>
      <div className="text-xs text-muted-foreground">As of {formatDay(overview.as_of)}</div>
    </div>
  );
}

/**
 * Up to two initials for the tile, from the name's first words.
 *
 * @param name - Such as `Nifty Bank`.
 * @returns Such as `NB`.
 */
export function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
