/**
 * One index or one sector, as a card in a list of them.
 *
 * Both lists offered cards and each drew its own, with a different shape:
 * three readings on one, two on the other, a level on one and nothing in
 * its place on the other. One card now, so the two lists read alike: the
 * name and the day's move, what identifies it, its level when it has one,
 * anything particular to it, then up to three readings.
 *
 * The overview's `IndexCard` is a different thing -- one session of a
 * headline index, with its open, high, low and candle -- and stays apart.
 */

import { Link } from "react-router-dom";

import { Delta } from "@/components/Delta";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";

/** One reading beneath the level: a return, or how far from the high. */
export interface PopulationReading {
  label: string;
  value: string | null;
  /**
   * A distance rather than a move: shown plainly, without the colour and
   * arrow of a rise or a fall. Near the high is not a fall.
   */
  distance?: boolean;
}

interface PopulationCardProps {
  name: string;
  /** Its own page. */
  href: string;
  /** How it moved today: an index's change, a sector's median company's. */
  change: string | null;
  /** What identifies it under the name: its exchange and kind, its companies. */
  identity: React.ReactNode;
  /** Its level, formatted; a sector has none. */
  level?: string;
  /** Up to three readings, in the order they are read. */
  readings: readonly PopulationReading[];
  /** Anything particular to it, between its identity and its readings. */
  children?: React.ReactNode;
}

/**
 * Render one card.
 *
 * @param props - What it is, how it moved, and what to read against.
 * @returns The card, which leads to its page.
 */
export function PopulationCard({
  name,
  href,
  change,
  identity,
  level,
  readings,
  children,
}: PopulationCardProps): React.JSX.Element {
  return (
    <Link to={href} viewTransition className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-panel font-semibold">{name}</h3>
            <Delta value={change} arrow={false} badge />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {identity}
          </div>
          {level !== undefined && <div className="text-2xl font-bold tabular">{level}</div>}
          {children}
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {readings.map((reading) => (
              <div key={reading.label}>
                <dt className="text-muted-foreground">{reading.label}</dt>
                <dd>
                  {reading.distance === true ? (
                    <span className="tabular text-muted-foreground">
                      {formatPercent(reading.value)}
                    </span>
                  ) : (
                    <Delta value={reading.value} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Where cards will be, while they are on their way.
 *
 * @param props - How many to hold room for.
 * @returns The placeholders.
 */
export function PopulationCardsLoading({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
