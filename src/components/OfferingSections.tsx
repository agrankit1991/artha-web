/**
 * The parts a public offering is shown in.
 *
 * The list's card and the offering's own page are the same offering at two
 * sizes, so they are built from the same parts rather than the page
 * wrapping the whole card: the card lists its dates, and the page, which
 * draws them as a timeline, would otherwise say every date twice.
 *
 * What an offering is judged by changes as it goes. While bidding is ahead
 * or open it is the band, the lot and the outlay; once it has listed it is
 * the price it was sold at and the price it opened at. The figures follow
 * the status, as the list's table columns do.
 */

import { ExternalLink } from "lucide-react";

import type { Offering } from "@/api/client";
import { FactList } from "@/components/FactList";
import { Hint } from "@/components/Hint";
import { OfferingStatus } from "@/components/OfferingStatus";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatCrore, formatMultiple, formatRupees, toNumber } from "@/lib/format";
import { BOARDS, daysLeft, listingGain, minimumInvestment, priceBand } from "@/lib/offerings";
import { cn } from "@/lib/utils";

/**
 * How an offering is classified, and how long bidding has left.
 *
 * @param props - The offering, and the day it is read on.
 * @returns The badges.
 */
export function OfferingBadges({
  offering,
  today,
}: {
  offering: Offering;
  today: Date;
}): React.JSX.Element {
  const board = BOARDS[offering.issue_type];
  const left = daysLeft(offering, today);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <OfferingStatus status={offering.status} />
      <Hint term={board.label} text={board.hint}>
        <Badge variant="secondary">{board.label}</Badge>
      </Hint>
      {offering.industry !== null && (
        <Badge variant="secondary" className="gap-1">
          <ENTITIES.company.icon aria-hidden="true" className="h-3 w-3" />
          {offering.industry}
        </Badge>
      )}
      {left !== null && (
        <Badge variant="outline" className="border-caution/40 bg-caution/10 text-caution">
          {left === 0 ? "Last day to bid" : `${String(left)} ${left === 1 ? "day" : "days"} left`}
        </Badge>
      )}
    </div>
  );
}

/**
 * An offering's ISIN, explained on hover, or a note that it has none yet.
 *
 * @param props - The ISIN, if assigned.
 * @returns The identifier.
 */
export function OfferingIsin({ isin }: { isin: string | null }): React.JSX.Element {
  return (
    <Hint
      term="ISIN"
      text="International Securities Identification Number: the code that identifies these shares on every exchange and in every depository."
    >
      <span className="text-xs text-muted-foreground">{isin ?? "ISIN not yet assigned"}</span>
    </Hint>
  );
}

/**
 * The four figures an offering is judged by at its stage.
 *
 * @param props - The offering.
 * @returns Four tiles.
 */
export function OfferingFigures({ offering }: { offering: Offering }): React.JSX.Element {
  const size = <StatTile label="Issue size" value={formatCrore(offering.issue_size)} />;
  const lot = (
    <StatTile
      label="Lot size"
      value={offering.lot_size === null ? ABSENT : `${String(offering.lot_size)} shares`}
    />
  );
  if (offering.status === "LISTED") {
    return (
      <StatGrid>
        {size}
        <StatTile
          label="Priced at"
          value={formatRupees(offering.cut_off_price)}
          hint="The price struck within the band"
        />
        <StatTile
          label="Opened at"
          value={formatRupees(offering.listing_price)}
          delta={listingGain(offering)}
          hint="Its first price on listing, against the price it was sold at"
        />
        {lot}
      </StatGrid>
    );
  }
  const least = minimumInvestment(offering);
  return (
    <StatGrid>
      {size}
      <StatTile
        label="Price band"
        value={priceBand(offering)}
        {...(offering.face_value === null
          ? {}
          : { hint: `Face value ${formatRupees(offering.face_value)}` })}
      />
      {lot}
      <StatTile
        label="Minimum investment"
        value={least === null ? ABSENT : formatRupees(String(least))}
        hint="One lot at the top of the band"
      />
    </StatGrid>
  );
}

/** The most the meter draws: a hundred-times issue would flatten every other reading. */
const METER_MOST = 10;

/**
 * How many times the issue was subscribed, against one times.
 *
 * One times is the line: below it the issue was not fully taken up, above
 * it bids were scaled back. The bar is the brand's neutral teal either way,
 * with the line marked and the reading said in words: red below one times
 * once suggested a loss that had not happened.
 *
 * @param props - The offering.
 * @returns The meter, or nothing before bids are counted.
 */
export function SubscriptionMeter({ offering }: { offering: Offering }): React.JSX.Element | null {
  const times = toNumber(offering.total_subscription);
  if (times === null) {
    return null;
  }
  const written = formatMultiple(offering.total_subscription);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <Hint
          term="Subscribed"
          text="Bids received as a multiple of the shares on offer. Above one times the issue was oversubscribed and allotment is scaled back; below it, some shares went unsold."
        >
          <span className="text-muted-foreground">Subscribed</span>
        </Hint>
        <span>
          <span className="font-semibold tabular">{written}</span>{" "}
          <span className="text-muted-foreground">
            {times >= 1 ? "oversubscribed" : "not fully taken up"}
          </span>
        </span>
      </div>
      <div
        className="relative h-2 w-full rounded-full bg-muted"
        role="meter"
        aria-label="Subscription"
        aria-valuenow={Math.min(times, METER_MOST)}
        aria-valuemin={0}
        aria-valuemax={METER_MOST}
        aria-valuetext={`${written} subscribed`}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${String((Math.min(times, METER_MOST) / METER_MOST) * 100)}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -inset-y-0.5 w-0.5 rounded-full bg-foreground/60"
          style={{ left: `${String(100 / METER_MOST)}%` }}
        />
      </div>
      <div aria-hidden="true" className="relative h-4 text-xs text-muted-foreground tabular">
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${String(100 / METER_MOST)}%` }}
        >
          1×
        </span>
        <span className="absolute right-0">{`${String(METER_MOST)}× and over`}</span>
      </div>
    </div>
  );
}

/**
 * The exchange facts the figures leave out.
 *
 * A listed offering's tiles carry what it was priced and opened at, so the
 * band and the lot are said here; before listing it is the other way round.
 *
 * @param props - The offering.
 * @returns The facts.
 */
export function OfferingDetails({ offering }: { offering: Offering }): React.JSX.Element {
  const exchanges = (offering.listing_exchange ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "");
  const stage =
    offering.status === "LISTED"
      ? [{ label: "Price band", value: priceBand(offering) }]
      : [
          {
            label: "Cut-off price",
            value: (
              <Hint
                term="the cut-off price"
                text="The price finally struck within the band, once bidding closed. Bids below it are not allotted."
              >
                <span>{formatRupees(offering.cut_off_price)}</span>
              </Hint>
            ),
          },
        ];
  return (
    <FactList
      facts={[
        {
          label: "Lists on",
          value:
            exchanges.length === 0 ? null : (
              <span className="flex gap-1">
                {exchanges.map((one) => (
                  <Badge key={one} variant="outline">
                    {one}
                  </Badge>
                ))}
              </span>
            ),
        },
        { label: "Face value", value: formatRupees(offering.face_value) },
        ...stage,
        {
          label: "Minimum quantity",
          value:
            offering.minimum_quantity === null
              ? null
              : `${String(offering.minimum_quantity)} shares`,
        },
      ]}
    />
  );
}

/**
 * The prospectuses, where they were published.
 *
 * @param props - The offering, and any class for the row (a card sets it
 *   off with a rule, which must not be drawn when there is nothing under it).
 * @returns A link to each, or nothing when neither was published.
 */
export function OfferingDocuments({
  offering,
  className,
}: {
  offering: Offering;
  className?: string;
}): React.JSX.Element | null {
  const documents = [
    { url: offering.rhp_url, label: "Red herring prospectus" },
    { url: offering.drhp_url, label: "Draft prospectus" },
  ].filter((one): one is { url: string; label: string } => one.url !== null);
  if (documents.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {documents.map((one) => (
        <Button key={one.label} variant="outline" size="sm" asChild>
          <a href={one.url} target="_blank" rel="noopener noreferrer">
            <MARKS.documents aria-hidden="true" className="mr-2 h-4 w-4" />
            {one.label}
            <ExternalLink aria-hidden="true" className="ml-2 h-3 w-3 opacity-60" />
          </a>
        </Button>
      ))}
    </div>
  );
}
