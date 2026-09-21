/**
 * One public offering, on a page of its own.
 *
 * The card carries what is decided on; the page adds the calendar drawn as
 * a sequence, because an offering is a run of dates -- bidding, allotment,
 * refunds, listing -- and where today falls in that run is the first thing
 * anybody holding an application wants to know.
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
import { IpoCard } from "@/components/IpoCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { MARKS } from "@/lib/entities";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

interface IpoProps {
  ipoId: string;
  /** The day the page is read on. */
  today?: Date;
}

/** The dates an offering passes through, in the order it passes them. */
const STEPS: { key: keyof Offering; label: string }[] = [
  { key: "bidding_start", label: "Bidding opens" },
  { key: "bidding_end", label: "Bidding closes" },
  { key: "allotment_date", label: "Allotment finalised" },
  { key: "refund_initiation", label: "Refunds begin" },
  { key: "listing_date", label: "Lists on the exchange" },
];

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
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />;
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
    <div className="space-y-6">
      <IpoCard offering={found} today={today} linked={false} />

      <section className="space-y-3" aria-labelledby="timeline-heading">
        <SectionHeader
          id="timeline-heading"
          icon={MARKS.dates}
          title="Timeline"
          description="Where the offering stands in its run of dates."
        />
        <Card>
          <CardContent className="py-5">
            <Timeline offering={found} today={today} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** The run of dates, with today's place marked. */
function Timeline({ offering, today }: { offering: Offering; today: Date }): React.JSX.Element {
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (
    <ol className="grid gap-4 sm:grid-cols-5" aria-label="Timeline">
      {STEPS.map((step, position) => {
        const day = offering[step.key];
        const when = typeof day === "string" ? Date.parse(`${day}T00:00:00Z`) : null;
        const state: "done" | "now" | "ahead" | "unknown" =
          when === null ? "unknown" : when < now ? "done" : when === now ? "now" : "ahead";
        const Mark = state === "done" ? CheckCircle2 : state === "now" ? CircleDot : Circle;
        return (
          <li
            key={step.key}
            className="relative flex gap-3 sm:flex-col sm:gap-2"
            aria-current={state === "now" ? "date" : undefined}
          >
            {position < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-2.5 top-6 h-full w-px sm:left-auto sm:top-2.5 sm:h-px sm:w-full sm:translate-x-5",
                  state === "done" ? "bg-gain" : "bg-border",
                )}
              />
            )}
            <Mark
              aria-hidden="true"
              className={cn(
                "relative z-10 h-5 w-5 shrink-0 bg-card",
                state === "done" && "text-gain",
                state === "now" && "text-primary",
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}
