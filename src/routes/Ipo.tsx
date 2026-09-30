/**
 * One public offering, on a page of its own.
 *
 * Its name and where it stands head the page; the figures it is judged by
 * follow, then its calendar drawn as a sequence, because an offering is a
 * run of dates -- bidding, allotment, refunds, listing -- and where today
 * falls in that run is the first thing anybody holding an application wants
 * to know. The list's card lists the same dates; this page says each once,
 * in the timeline, so it is built from the card's parts rather than the
 * card (`OfferingSections`).
 *
 * Read from the list rather than an endpoint of its own: the whole set is
 * a page's worth of text and is already fetched to draw the list this page
 * was reached from.
 */

import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { useCallback, useMemo } from "react";

import type { Offering } from "@/api/client";
import { fetchIpos } from "@/api/client";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import {
  OfferingBadges,
  OfferingDetails,
  OfferingDocuments,
  OfferingFigures,
  OfferingIsin,
  SubscriptionMeter,
} from "@/components/OfferingSections";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { MARKS } from "@/lib/entities";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

interface IpoProps {
  ipoId: string;
  /** The day the page is read on. */
  today?: Date;
}

/**
 * The dates an offering passes through, in the order it passes them. The
 * mandates end last: after the listing for 179 of the 180 offerings stored
 * with both dates (checked 2026-09-30).
 */
const STEPS: { key: keyof Offering; label: string }[] = [
  { key: "bidding_start", label: "Bidding opens" },
  { key: "bidding_end", label: "Bidding closes" },
  { key: "allotment_date", label: "Allotment finalised" },
  { key: "refund_initiation", label: "Refunds begin" },
  { key: "listing_date", label: "Lists on the exchange" },
  { key: "mandate_end", label: "Mandates end" },
];

/** Where a step stands against today, said in words beside its mark. */
type StepState = "done" | "now" | "ahead" | "unknown";

const STATE_WORDS: Record<Exclude<StepState, "unknown">, string> = {
  done: "Done",
  now: "Today",
  ahead: "Ahead",
};

/**
 * Render the page.
 *
 * @param props - Which offering, and the day it is read on.
 * @returns The page.
 */
export function Ipo({ ipoId, today = new Date() }: IpoProps): React.JSX.Element {
  const load = useCallback(() => fetchIpos(), []);
  const offerings = useResource(load);
  const found = useMemo(
    () => offerings.data?.find((one) => one.ipo_id === ipoId) ?? null,
    [offerings.data, ipoId],
  );

  if (offerings.error !== null) {
    return <Failed message={offerings.error} />;
  }
  if (offerings.loading && found === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (found === null) {
    return (
      <Empty
        title="No such offering"
        reason="It may have been withdrawn, or the address may be wrong."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        kind="ipo"
        title={found.name}
        identifiers={
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono font-semibold">
              {found.symbol ?? "Symbol not yet assigned"}
            </span>
            <OfferingIsin isin={found.isin} />
          </span>
        }
        badges={<OfferingBadges offering={found} today={today} />}
      />

      <Card>
        <CardContent className="space-y-5">
          <OfferingFigures offering={found} />
          <SubscriptionMeter offering={found} />
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="timeline-heading">
        <SectionHeader
          id="timeline-heading"
          icon={MARKS.dates}
          title="Timeline"
          description="Where the offering stands in its run of dates."
        />
        <Card>
          <CardContent>
            <Timeline offering={found} today={today} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="details-heading">
        <SectionHeader id="details-heading" icon={MARKS.exchange} title="Exchange and details" />
        <Card>
          <CardContent className="space-y-4">
            <OfferingDetails offering={found} />
            <OfferingDocuments offering={found} className="border-t pt-4" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** The run of dates, each with its state in words and today's place marked. */
function Timeline({ offering, today }: { offering: Offering; today: Date }): React.JSX.Element {
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (
    <ol className="grid gap-4 lg:grid-cols-6" aria-label="Timeline">
      {STEPS.map((step, position) => {
        const day = offering[step.key];
        const when = typeof day === "string" ? Date.parse(`${day}T00:00:00Z`) : null;
        const state: StepState =
          when === null ? "unknown" : when < now ? "done" : when === now ? "now" : "ahead";
        const Mark = state === "done" ? CheckCircle2 : state === "now" ? CircleDot : Circle;
        return (
          <li
            key={step.key}
            className="relative flex gap-3 lg:flex-col lg:gap-2"
            aria-current={state === "now" ? "date" : undefined}
          >
            {position < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-2.5 top-6 h-full w-px lg:left-auto lg:top-2.5 lg:h-px lg:w-full lg:translate-x-5",
                  state === "done" ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <Mark
              aria-hidden="true"
              className={cn(
                "relative z-10 h-5 w-5 shrink-0 bg-card",
                (state === "done" || state === "now") && "text-primary",
                state === "ahead" && "text-muted-foreground",
                state === "unknown" && "text-muted-foreground/40",
              )}
            />
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-medium",
                  state === "unknown" && "text-muted-foreground",
                )}
              >
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground tabular">
                {typeof day === "string" ? formatDay(day) : "Not yet published"}
              </div>
              {state !== "unknown" && (
                <div
                  className={cn(
                    "text-xs font-medium",
                    state === "now" ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {STATE_WORDS[state]}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
