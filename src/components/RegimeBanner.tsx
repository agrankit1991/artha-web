/**
 * What kind of market this is, in two words and a sentence.
 *
 * The share of a population trading above its two-hundred-session average
 * is the single most watched breadth figure there is, and on its own it is
 * a number nobody can read: whether forty-three per cent is weak or
 * ordinary depends on the population. So the band is named, the sentence
 * says what the band means, and the figure and its place in the
 * population's own history are both printed beside it.
 */

import type { BreadthRegime } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { describeRank, describeRegime } from "@/lib/breadthReadings";
import { ABSENT } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RegimeBannerProps {
  regime: BreadthRegime | null | undefined;
  /** The share above the long average, as a percentage. */
  share: number | null;
  /** Where that share stands in this population's own history. */
  rank: number | null;
  /** How many sessions the rank is against. */
  sessions?: number | undefined;
  loading?: boolean;
}

/** How each band is painted. Colour never carries the meaning alone. */
const PAINT = {
  good: "border-gain/40 bg-gain/10",
  bad: "border-loss/40 bg-loss/10",
  warn: "border-caution/40 bg-caution/10",
  neutral: "border-border bg-muted/40",
} as const;

const TEXT = {
  good: "text-gain",
  bad: "text-loss",
  warn: "text-caution",
  neutral: "text-foreground",
} as const;

/**
 * Name the regime the population is in.
 *
 * @param props - The band, the share behind it, and its rank.
 * @returns The banner.
 */
export function RegimeBanner({
  regime,
  share,
  rank,
  sessions,
  loading = false,
}: RegimeBannerProps): React.JSX.Element {
  const reading = describeRegime(regime);

  if (reading === null) {
    return (
      <Card>
        <CardContent className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing counted for this population yet</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border", PAINT[reading.tone])}>
      <CardContent className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className={cn("text-xl font-semibold", TEXT[reading.tone])}>{reading.label}</div>
          <p className="text-sm text-muted-foreground">{reading.hint}</p>
        </div>
        <div className="text-right">
          <div className="tabular text-2xl font-semibold">
            {share === null ? ABSENT : `${share.toFixed(1)}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            above their 200-day
            {sessions !== undefined && sessions > 0 && (
              <>
                {" · "}
                {describeRank(rank)}
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
