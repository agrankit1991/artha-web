/**
 * Where the strategies' market switch stands today.
 *
 * Three of the strategies are invested only while the Nifty 50 is clear of
 * its 150-day average, and hold gold once it falls clear below. Whether
 * they hold any of a scan's rows today depends on that, so the reading is
 * shown beside the rows rather than left for the reader to look up.
 *
 * The figure is found through the platform's registry of screenable
 * figures, as the screener finds every other: the registry says where it
 * is kept, so this does not assume a path of its own.
 */

import { useCallback } from "react";

import { type InstrumentOverview, type ScreenField, fetchOverviews } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Hint } from "@/components/Hint";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { figureAt } from "@/lib/figures";
import { formatDay, toNumber } from "@/lib/format";
import {
  MARKET_SWITCH,
  STRATEGIES_DATA_THROUGH,
  SWITCH_SHUT_SINCE,
  type SwitchPosition,
  switchPosition,
} from "@/lib/scans";
import { cn } from "@/lib/utils";

/** What each position means for a strategy that uses the switch. */
const MEANING: Record<SwitchPosition, string> = {
  on: "On: invested",
  off: "Off: in gold",
  band: "In the band: as it was",
};

interface MarketSwitchProps {
  /** The screener's registry of figures; null while it loads. */
  fields: ScreenField[] | null;
  className?: string;
}

/**
 * Render today's reading of the switch.
 *
 * @param props - The registry, to find the index's reading by.
 * @returns A line with the index against its average and what that means,
 *   or a line saying the reading is not available -- which it is not until
 *   the platform publishes the figure, or when the index has none.
 */
export function MarketSwitch({ fields, className }: MarketSwitchProps): React.JSX.Element {
  const loadIndex = useCallback(() => fetchOverviews([MARKET_SWITCH.index.key]), []);
  const index = useResource(loadIndex);

  if (fields === null || index.loading) {
    return <Skeleton className={cn("h-5 w-72", className)} />;
  }
  const today = readingOf(fields, index.data);

  return (
    <div
      role="group"
      aria-label="Market switch"
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}
    >
      <span className="font-medium">Market switch today:</span>
      {today === null ? (
        <span className="text-muted-foreground">
          not available: the platform has no 150-day reading for the {MARKET_SWITCH.index.name} yet.
        </span>
      ) : (
        <Reading {...today} />
      )}
    </div>
  );
}

/** The index against its average, what that means, and the lab's last state inside the band. */
function Reading({ fromAverage, asOf }: SwitchReading): React.JSX.Element {
  const { name } = MARKET_SWITCH.index;
  const band = String(MARKET_SWITCH.band);
  const position = switchPosition(fromAverage);
  return (
    <>
      <span>
        {name} <Delta value={String(fromAverage)} /> from its 150-day average
      </span>
      <span className="text-xs text-muted-foreground">({formatDay(asOf)})</span>
      <Badge variant="outline">{MEANING[position]}</Badge>
      <Hint
        text={`Invested once the ${name} closes more than ${band}% above its 150-day average, in gold once it closes more than ${band}% below. In between the switch stays as it last was, which one day's reading cannot tell.`}
      />
      {position === "band" && (
        // The lab's record is the last state of the switch this page knows.
        <span className="text-xs text-muted-foreground">
          At the lab&apos;s last reading, on {formatDay(STRATEGIES_DATA_THROUGH)}, it was off, as it
          had been since {formatDay(SWITCH_SHUT_SINCE)}.
        </span>
      )}
    </>
  );
}

/** One reading of the switch's index. */
interface SwitchReading {
  /** The close against its 150-day average, per cent. */
  fromAverage: number;
  /** The session the reading is for. */
  asOf: string;
}

/**
 * The index's distance from its average, and the session it is for.
 *
 * @param fields - The registry, which says where the figure is kept.
 * @param overviews - The index's figures, if they arrived.
 * @returns The reading, or null when the registry has no such figure, the
 *   index has no figures, or they carry no value for it.
 */
function readingOf(
  fields: ScreenField[],
  overviews: InstrumentOverview[] | null,
): SwitchReading | null {
  const field = fields.find((one) => one.name === MARKET_SWITCH.field);
  const overview = overviews?.[0];
  if (field === undefined || overview === undefined) {
    return null;
  }
  const fromAverage = toNumber(String(figureAt(overview, field.path) ?? ""));
  return fromAverage === null ? null : { fromAverage, asOf: overview.as_of };
}
