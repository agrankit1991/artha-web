/**
 * Foreign and domestic institutions' latest cash-market flows, at a glance.
 *
 * What the overview shows of the FII / DII page: each side's latest net
 * and its run over the last few weeks, leading to the page for the rest.
 */

import { Link } from "react-router-dom";

import type { InstitutionalFlow } from "@/api/client";
import { Delta } from "@/components/Delta";
import { FlowBars } from "@/components/FlowBars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MARKS } from "@/lib/entities";
import { formatDay, formatSignedPrice } from "@/lib/format";
import { PATHS } from "@/lib/paths";

interface FlowsGlanceProps {
  /** Session flows, newest first, as the platform serves them. */
  flows: InstitutionalFlow[] | null;
  loading?: boolean;
}

const SIDES = [
  { participant: "FII", label: "Foreign (FII/FPI)" },
  { participant: "DII", label: "Domestic (DII)" },
] as const;

/**
 * Draw the card.
 *
 * @param props - The flows and whether they are loading.
 * @returns The card.
 */
export function FlowsGlance({ flows, loading = false }: FlowsGlanceProps): React.JSX.Element {
  const cash = (flows ?? []).filter((one) => one.segment === "CASH" && one.period === "DAY");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MARKS.flows aria-hidden="true" className="h-5 w-5 text-primary" />
            Institutional Flows
          </CardTitle>
          <Link
            to={PATHS.flows}
            className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            See all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {loading && flows === null ? (
          <Skeleton className="h-20 w-full sm:col-span-2" />
        ) : (
          SIDES.map(({ participant, label }) => {
            // Newest first from the platform; the bars read oldest to latest.
            const side = cash.filter((one) => one.participant === participant);
            const latest = side[0];
            return (
              <div key={participant} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {latest === undefined ? "No session yet" : formatDay(latest.day)}
                  </span>
                </div>
                <Delta
                  value={latest?.net_amount}
                  format={(value) => `${formatSignedPrice(value)} Cr`}
                  arrow={false}
                  className="text-xl font-semibold"
                />
                <FlowBars
                  label={`${participant} net buying, last ${String(Math.min(side.length, GLANCE))} sessions`}
                  bars={side
                    .slice(0, GLANCE)
                    .reverse()
                    .map((one) => ({
                      day: one.day,
                      net: one.net_amount,
                      title: `${formatDay(one.day)}: ${formatSignedPrice(one.net_amount)} Cr`,
                    }))}
                  height={40}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/** How many sessions the glance draws: about a month. */
const GLANCE = 20;
