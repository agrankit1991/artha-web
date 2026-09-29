/**
 * Bulk and block deals: the large trades the exchange discloses after each
 * session, over a week, a month or a quarter.
 *
 * What was bought and sold in size, and by whom. The kind and the window
 * live in the address, so a filtered view can be bookmarked and survives
 * Back; the days' net value is drawn above the list, because "was there
 * unusual buying this week" is the question the list alone cannot answer.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { type Deal, type DealKind, fetchDeals } from "@/api/client";
import { Chooser, type Option } from "@/components/Chooser";
import { DealsTable } from "@/components/DealsTable";
import { Failed } from "@/components/Failed";
import { FlowBars } from "@/components/FlowBars";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { formatCroreSigned, formatDay } from "@/lib/format";

type Kind = "ALL" | DealKind;
type Window = "7" | "30" | "90";

const KINDS: Option<Kind>[] = [
  { key: "ALL", label: "All deals" },
  { key: "BULK", label: "Bulk" },
  { key: "BLOCK", label: "Block" },
];

const WINDOWS: Option<Window>[] = [
  { key: "7", label: "Week" },
  { key: "30", label: "Month" },
  { key: "90", label: "Quarter" },
];

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Deals(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const kind = KINDS.find((one) => one.key === params.get("kind"))?.key ?? "ALL";
  const span = WINDOWS.find((one) => one.key === params.get("window"))?.key ?? "30";
  const choose = (name: "kind" | "window", value: string): void => {
    const next = new URLSearchParams(params);
    next.set(name, value);
    setParams(next, { replace: true });
  };

  const load = useCallback(
    () => fetchDeals({ days: Number(span), ...(kind === "ALL" ? {} : { kind }) }),
    [kind, span],
  );
  const deals = useResource(load);
  const byDay = useMemo(() => netByDay(deals.data ?? []), [deals.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk & block deals"
        count={deals.data === null ? undefined : `${String(deals.data.length)} deals`}
        description="Large trades the exchange discloses after each session: a bulk deal moves at least half a per cent of a company's shares; a block deal is a single trade of at least ₹25 crore (SEBI raised it from ₹10 crore in an October 2025 circular). History is kept from the day the platform began capturing them."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Chooser
          options={KINDS}
          chosen={kind}
          onChange={(next) => {
            choose("kind", next);
          }}
          label="Kind"
        />
        <Chooser
          options={WINDOWS}
          chosen={span}
          onChange={(next) => {
            choose("window", next);
          }}
          label="Window"
        />
      </div>

      {deals.error !== null ? (
        <Failed message={deals.error} />
      ) : (
        <>
          {byDay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Net value by day</CardTitle>
                <CardDescription>
                  Each day&apos;s deals bought less sold, in rupees crore, oldest to latest.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlowBars
                  label="Net value of deals by day"
                  height={72}
                  bars={byDay.map((day) => ({
                    day: day.day,
                    net: day.net.toFixed(2),
                    title: `${formatDay(day.day)}: ${formatCroreSigned(day.net.toFixed(2))}`,
                  }))}
                />
              </CardContent>
            </Card>
          )}
          <DealsTable deals={deals.data ?? []} loading={deals.loading} label="Disclosed deals" />
        </>
      )}
    </div>
  );
}

/**
 * Each day's deals, bought less sold, oldest first.
 *
 * @param deals - The deals, in any order.
 * @returns One net value per day, in rupees crore.
 */
function netByDay(deals: readonly Deal[]): { day: string; net: number }[] {
  const days = new Map<string, number>();
  for (const deal of deals) {
    const value = Number(deal.value_crore);
    days.set(
      deal.session_date,
      (days.get(deal.session_date) ?? 0) + (deal.side === "BUY" ? value : -value),
    );
  }
  return [...days.entries()]
    .sort(([one], [other]) => one.localeCompare(other))
    .map(([day, net]) => ({ day, net }));
}
