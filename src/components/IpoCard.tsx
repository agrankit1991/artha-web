/**
 * One public offering, with everything a reader decides on.
 *
 * The previous project's card, kept for its shape and improved with what
 * this platform holds: the status, board and industry lead; the four
 * figures that decide an application sit in tiles; the calendar and the
 * exchange facts follow in two blocks; the prospectus is a click away. To
 * those it adds the whole timeline -- allotment, refund and mandate dates
 * are all held -- and the subscription drawn against one times, which is
 * the line between an issue that was wanted and one that was not.
 */

import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { IpoStatus, IssueType, Offering } from "@/api/client";
import { FactList } from "@/components/FactList";
import { Hint } from "@/components/Hint";
import { StatTile } from "@/components/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatDay, formatMultiple, formatPrice, toNumber } from "@/lib/format";
import { ipoPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface IpoCardProps {
  offering: Offering;
  /** The day the card is read on, for how long bidding has left. */
  today: Date;
  /** Whether the name leads to the offering's own page. */
  linked?: boolean;
  className?: string;
}

/** What each status is called, drawn as, and tinted. */
export const STATUSES: Record<
  IpoStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  UPCOMING: {
    label: "Upcoming",
    icon: Clock,
    tint: "border-primary/40 bg-primary/10 text-primary",
  },
  OPEN: { label: "Open", icon: TrendingUp, tint: "border-gain/40 bg-gain/10 text-gain" },
  CLOSED: {
    label: "Closed",
    icon: XCircle,
    tint: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  },
  LISTED: {
    label: "Listed",
    icon: CheckCircle2,
    tint: "border-border bg-muted text-muted-foreground",
  },
};

/** Which board an offering is on, and what that means. */
export const BOARDS: Record<IssueType, { label: string; hint: string }> = {
  REGULAR: {
    label: "Mainboard",
    hint: "The main exchange board, for larger and established companies. Lots are small and the shares trade like any other.",
  },
  SME: {
    label: "SME",
    hint: "The small and medium enterprise board. Lots are large -- often a thousand shares or more -- and the shares are less liquid after listing.",
  },
};

/**
 * Render the card.
 *
 * @param props - The offering and the day it is read on.
 * @returns The card.
 */
export function IpoCard({
  offering,
  today,
  linked = true,
  className,
}: IpoCardProps): React.JSX.Element {
  const status = STATUSES[offering.status];
  const board = BOARDS[offering.issue_type];
  const Mark = ENTITIES.ipo.icon;
  const left = daysLeft(offering, today);
  const least = minimumInvestment(offering);
  const exchanges = (offering.listing_exchange ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "");

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold leading-tight">
              <Mark aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              {linked ? (
                <Link to={ipoPath(offering.ipo_id)} className="hover:text-primary hover:underline">
                  {offering.name}
                </Link>
              ) : (
                offering.name
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("gap-1", status.tint)}>
                <status.icon aria-hidden="true" className="h-3 w-3" />
                {status.label}
              </Badge>
              <Hint text={board.hint}>
                <Badge variant="secondary">{board.label}</Badge>
              </Hint>
              {offering.industry !== null && (
                <Badge variant="secondary" className="gap-1">
                  <ENTITIES.company.icon aria-hidden="true" className="h-3 w-3" />
                  {offering.industry}
                </Badge>
              )}
              {left !== null && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500"
                >
                  {left === 0
                    ? "Last day to bid"
                    : `${String(left)} ${left === 1 ? "day" : "days"} left`}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tabular">{offering.symbol ?? ABSENT}</div>
            <Hint text="International Securities Identification Number: the code that identifies these shares on every exchange and in every depository.">
              <span className="text-xs text-muted-foreground">
                {offering.isin ?? "ISIN not yet assigned"}
              </span>
            </Hint>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Issue size" value={crore(offering.issue_size)} />
          <StatTile
            label="Price band"
            value={priceBand(offering)}
            {...(offering.face_value === null
              ? {}
              : { hint: `Face value ${formatPrice(offering.face_value)}` })}
          />
          <StatTile
            label="Lot size"
            value={offering.lot_size === null ? ABSENT : `${String(offering.lot_size)} shares`}
          />
          <StatTile
            label="Minimum investment"
            value={least === null ? ABSENT : formatPrice(String(least))}
            hint="One lot at the top of the band"
          />
        </div>

        <Subscription offering={offering} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Calendar aria-hidden="true" className="h-4 w-4 text-primary" />
              Important Dates
            </h4>
            <FactList
              facts={[
                { label: "Bidding opens", value: formatDay(offering.bidding_start) },
                { label: "Bidding closes", value: formatDay(offering.bidding_end) },
                { label: "Allotment", value: formatDay(offering.allotment_date) },
                { label: "Refunds begin", value: formatDay(offering.refund_initiation) },
                { label: "Listing", value: formatDay(offering.listing_date) },
                { label: "Mandate ends", value: formatDay(offering.mandate_end) },
              ]}
            />
          </div>
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Globe aria-hidden="true" className="h-4 w-4 text-primary" />
              Exchange & Details
            </h4>
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
                { label: "Face value", value: formatPrice(offering.face_value) },
                {
                  label: "Cut-off price",
                  value: (
                    <Hint text="The price finally struck within the band, once bidding closed. Bids below it are not allotted.">
                      <span>{formatPrice(offering.cut_off_price)}</span>
                    </Hint>
                  ),
                },
                { label: "Opened at", value: formatPrice(offering.listing_price) },
                {
                  label: "Minimum quantity",
                  value:
                    offering.minimum_quantity === null ? null : String(offering.minimum_quantity),
                },
              ]}
            />
          </div>
        </div>

        {(offering.rhp_url !== null || offering.drhp_url !== null) && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {offering.rhp_url !== null && (
              <Button variant="outline" size="sm" asChild>
                <a href={offering.rhp_url} target="_blank" rel="noopener noreferrer">
                  <MARKS.documents aria-hidden="true" className="mr-2 h-4 w-4" />
                  Red herring prospectus
                  <ExternalLink aria-hidden="true" className="ml-2 h-3 w-3 opacity-60" />
                </a>
              </Button>
            )}
            {offering.drhp_url !== null && (
              <Button variant="outline" size="sm" asChild>
                <a href={offering.drhp_url} target="_blank" rel="noopener noreferrer">
                  <MARKS.documents aria-hidden="true" className="mr-2 h-4 w-4" />
                  Draft prospectus
                  <ExternalLink aria-hidden="true" className="ml-2 h-3 w-3 opacity-60" />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * How many times the issue was subscribed, against one times.
 *
 * One times is the line: below it the issue was not fully taken up, above
 * it bids were scaled back. The bar is capped at ten times so a
 * hundred-times issue does not flatten every other reading on the page.
 */
function Subscription({ offering }: { offering: Offering }): React.JSX.Element | null {
  const times = toNumber(offering.total_subscription);
  if (times === null) {
    return null;
  }
  const share = Math.min(times / 10, 1) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <Hint text="Bids received as a multiple of the shares on offer. Above one times the issue was oversubscribed and allotment is scaled back; below it, some shares went unsold.">
          <span className="text-muted-foreground">Subscribed</span>
        </Hint>
        <span className={cn("tabular font-semibold", times >= 1 ? "text-gain" : "text-loss")}>
          {formatMultiple(offering.total_subscription)}
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Subscription"
        aria-valuenow={times}
        aria-valuemin={0}
        aria-valuemax={10}
      >
        <div
          className={cn("h-full rounded-full", times >= 1 ? "bg-gain" : "bg-loss")}
          style={{ width: `${String(share)}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-foreground/40"
          style={{ left: "10%" }}
          title="1×"
        />
      </div>
    </div>
  );
}

/**
 * How many days of bidding remain, for an offering that is open.
 *
 * @param offering - The offering.
 * @param today - The day it is read on.
 * @returns The days, nought on the last day, or null when it is not open
 *   or has no closing date published.
 */
export function daysLeft(offering: Offering, today: Date): number | null {
  if (offering.status !== "OPEN" || offering.bidding_end === null) {
    return null;
  }
  const end = new Date(`${offering.bidding_end}T00:00:00Z`);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((end.getTime() - now) / 86_400_000));
}

/**
 * The smallest cheque an applicant can write.
 *
 * The top of the band times a lot, because a bid below the top is not
 * allotted when an offering is oversubscribed, which the ones worth
 * applying for are.
 *
 * @param offering - The offering.
 * @returns The outlay, or null when the band or the lot is unpublished.
 */
export function minimumInvestment(offering: Offering): number | null {
  const price = toNumber(offering.maximum_price);
  return price === null || offering.lot_size === null ? null : price * offering.lot_size;
}

/**
 * The price band, or the one price when the band has no width.
 *
 * @param offering - The offering.
 * @returns The band, or a dash.
 */
export function priceBand(offering: Offering): string {
  const low = toNumber(offering.minimum_price);
  const high = toNumber(offering.maximum_price);
  if (low === null && high === null) {
    return ABSENT;
  }
  if (low === null || high === null || low === high) {
    return formatPrice(offering.maximum_price ?? offering.minimum_price);
  }
  return `${formatPrice(offering.minimum_price)} – ${formatPrice(offering.maximum_price)}`;
}

/** An issue size in crore, written as such. */
function crore(value: string | null): string {
  return value === null ? ABSENT : `₹${formatPrice(value)} cr`;
}
