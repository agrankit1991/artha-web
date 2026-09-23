/**
 * Where a company stands among the rest: its size band and its momentum.
 *
 * Both come from the platform's nightly company snapshot. The size band is
 * SEBI's rank rule over market capitalisation; the momentum score is
 * StockEdge's idea, nought to a hundred, read in three bands so a glance
 * says strong, middling or weak.
 */

import type { SizeBucket } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SIZES: Record<SizeBucket, string> = {
  LARGE: "Large cap",
  MID: "Mid cap",
  SMALL: "Small cap",
  MICRO: "Micro cap",
};

/**
 * The size band, with the rank it comes from.
 *
 * @param props - The band and the rank, either absent before the snapshot has the company.
 * @returns The badge, or nothing without a band.
 */
export function SizeBadge({
  bucket,
  rank,
}: {
  bucket: SizeBucket | null;
  rank: number | null;
}): React.JSX.Element | null {
  if (bucket === null) {
    return null;
  }
  return (
    <Badge variant="secondary" title="By market capitalisation, SEBI's rank bands">
      {SIZES[bucket]}
      {rank !== null && <span className="ml-1 tabular text-muted-foreground">#{rank}</span>}
    </Badge>
  );
}

/** Which band a momentum score falls in: weak to forty, strong from sixty-one. */
export function momentumBand(score: number): "weak" | "neutral" | "strong" {
  if (score <= 40) {
    return "weak";
  }
  return score <= 60 ? "neutral" : "strong";
}

const BAND_TINTS = {
  weak: "border-loss/30 bg-loss/10 text-loss",
  neutral: "border-caution/30 bg-caution/10 text-caution",
  strong: "border-gain/30 bg-gain/10 text-gain",
} as const;

/**
 * A momentum score as a chip, coloured by its band.
 *
 * @param props - The score, absent before the snapshot has one.
 * @returns The chip, or nothing without a score.
 */
export function MomentumChip({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}): React.JSX.Element | null {
  if (score === null) {
    return null;
  }
  return (
    <Badge
      variant="outline"
      title="Momentum: its one-, three- and six-month returns against every other company, 0–100"
      className={cn("tabular", BAND_TINTS[momentumBand(score)], className)}
    >
      Momentum {Math.round(score)}
    </Badge>
  );
}
