/**
 * One public offering, as a card in the list, with everything a reader
 * decides on.
 *
 * The previous project's card, kept for its shape: the status, board and
 * industry lead; the four figures that decide an application sit in tiles;
 * the subscription is drawn against one times; the calendar and the
 * exchange facts follow side by side; the prospectus is a click away. The
 * parts are the offering page's too (`OfferingSections`); the card alone
 * lists the dates, which the page draws as a timeline instead.
 */

import { Calendar, Globe } from "lucide-react";
import { Link } from "react-router-dom";

import type { Offering } from "@/api/client";
import { FactList } from "@/components/FactList";
import {
  OfferingBadges,
  OfferingDetails,
  OfferingDocuments,
  OfferingFigures,
  OfferingIsin,
  SubscriptionMeter,
} from "@/components/OfferingSections";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ENTITIES } from "@/lib/entities";
import { ABSENT, formatDay } from "@/lib/format";
import { ipoPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface IpoCardProps {
  offering: Offering;
  /** The day the card is read on, for how long bidding has left. */
  today: Date;
  className?: string;
}

/**
 * Render the card.
 *
 * @param props - The offering and the day it is read on.
 * @returns The card, its name leading to the offering's own page.
 */
export function IpoCard({ offering, today, className }: IpoCardProps): React.JSX.Element {
  const Mark = ENTITIES.ipo.icon;
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold leading-tight">
              <Mark aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Link to={ipoPath(offering.ipo_id)} className="hover:text-primary hover:underline">
                {offering.name}
              </Link>
            </h3>
            <OfferingBadges offering={offering} today={today} />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tabular">{offering.symbol ?? ABSENT}</div>
            <OfferingIsin isin={offering.isin} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <OfferingFigures offering={offering} />
        <SubscriptionMeter offering={offering} />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Calendar aria-hidden="true" className="h-4 w-4 text-primary" />
              Important dates
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
              Exchange and details
            </h4>
            <OfferingDetails offering={offering} />
          </div>
        </div>
        <OfferingDocuments offering={offering} className="border-t pt-4" />
      </CardContent>
    </Card>
  );
}
