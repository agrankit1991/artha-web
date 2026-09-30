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

import { type Deal, type DealKind, fetchDeals } from "@/api/client";
import { Chooser, type Option } from "@/components/Chooser";
import { DealsTable } from "@/components/DealsTable";
import { Failed } from "@/components/Failed";
import { type DivergingRow, DivergingBars } from "@/components/DivergingBars";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { companyPath } from "@/lib/paths";
import { formatCroreSigned } from "@/lib/format";

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
  const [chosenKind, setKind] = useSearchParam("kind", "ALL");
  const [chosenWindow, setWindow] = useSearchParam("window", "30");
  const kind = KINDS.find((one) => one.key === chosenKind)?.key ?? "ALL";
  const span = WINDOWS.find((one) => one.key === chosenWindow)?.key ?? "30";

  const load = useCallback(
    () => fetchDeals({ days: Number(span), ...(kind === "ALL" ? {} : { kind }) }),
    [kind, span],
  );
  const deals = useResource(load);
  const byCompany = useMemo(() => netByCompany(deals.data ?? []), [deals.data]);
  const bought = byCompany.filter((one) => one.value > 0).slice(0, RANKED);
  const sold = byCompany
    .filter((one) => one.value < 0)
    .reverse()
    .slice(0, RANKED);
  // One scale for both lists, so a bar on one reads against a bar on the other.
  const reach = Math.max(...[...bought, ...sold].map((one) => Math.abs(one.value)), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk & block deals"
        count={deals.data === null ? undefined : `${String(deals.data.length)} deals`}
        description="Large trades the exchange discloses after each session: a bulk deal moves at least half a per cent of a company's shares; a block deal is a single trade of at least ₹25 crore (SEBI raised it from ₹10 crore in an October 2025 circular). History is kept from the day the platform began capturing them."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Chooser options={KINDS} chosen={kind} onChange={setKind} label="Kind" />
        <Chooser options={WINDOWS} chosen={span} onChange={setWindow} label="Window" />
      </div>

      {deals.error !== null ? (
        <Failed message={deals.error} />
      ) : (
        <>
          {byCompany.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Where the deal money went</CardTitle>
                <CardDescription>
                  Each company&apos;s disclosed deals in the window, bought less sold, in rupees
                  crore: the most bought and the most sold. A deal&apos;s other side is disclosed
                  only when it crosses the threshold too, so a figure is what the disclosed deals
                  add up to, not every trade.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Bought most</h3>
                  {bought.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No company was net bought.</p>
                  ) : (
                    <DivergingBars
                      label="Companies most bought in disclosed deals"
                      rows={bought}
                      reach={reach}
                      format={formatCroreSigned}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Sold most</h3>
                  {sold.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No company was net sold.</p>
                  ) : (
                    <DivergingBars
                      label="Companies most sold in disclosed deals"
                      rows={sold}
                      reach={reach}
                      format={formatCroreSigned}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <DealsTable deals={deals.data ?? []} loading={deals.loading} label="Disclosed deals" />
        </>
      )}
    </div>
  );
}

/** How many companies each side of the ranking names. */
const RANKED = 10;

/**
 * Net each company's deals: bought less sold, in crore, largest first.
 *
 * @param deals - The deals in the window.
 * @returns A row per company, named, leading to its page where the symbol
 *   maps to a listing, ordered from most bought to most sold.
 */
export function netByCompany(deals: readonly Deal[]): DivergingRow[] {
  const companies = new Map<string, { name: string; href?: string; value: number }>();
  for (const deal of deals) {
    const id = deal.instrument_key ?? deal.symbol;
    const value = Number(deal.value_crore);
    const held = companies.get(id) ?? {
      name: deal.security_name,
      ...(deal.instrument_key === null
        ? {}
        : { href: companyPath(deal.instrument_key, deal.symbol) }),
      value: 0,
    };
    held.value += deal.side === "BUY" ? value : -value;
    companies.set(id, held);
  }
  return [...companies.values()]
    .map(({ name, href, value }) => ({
      label: name,
      value: Math.round(value * 100) / 100,
      ...(href === undefined ? {} : { href }),
    }))
    .sort((one, other) => other.value - one.value);
}
