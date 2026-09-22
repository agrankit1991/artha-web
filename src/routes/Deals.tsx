/**
 * Bulk and block deals, as the exchange discloses them each evening.
 *
 * StockEdge's Deals page: which clients bought or sold a large stake, in
 * what, at what price. The exchange publishes only the day's file, so the
 * history here is what the platform has captured since it began.
 */

import { useCallback, useState } from "react";

import { type DealKind, fetchDeals } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { DealsTable } from "@/components/DealsTable";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { useResource } from "@/hooks/useResource";

type Kind = "ALL" | DealKind;

const KINDS: { key: Kind; label: string }[] = [
  { key: "ALL", label: "All deals" },
  { key: "BULK", label: "Bulk" },
  { key: "BLOCK", label: "Block" },
];

const WINDOWS: { key: "7" | "30" | "90"; label: string }[] = [
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
  const [kind, setKind] = useState<Kind>("ALL");
  const [span, setSpan] = useState<"7" | "30" | "90">("30");
  const load = useCallback(
    () => fetchDeals({ days: Number(span), ...(kind === "ALL" ? {} : { kind }) }),
    [kind, span],
  );
  const deals = useResource(load);

  if (deals.error !== null) {
    return <Failed message={deals.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk & Block Deals"
        count={deals.data === null ? undefined : `${String(deals.data.length)} deals`}
        description="Large trades the exchange discloses after each session: a bulk deal moves at least half a per cent of a company's shares, a block deal is a single trade of at least ten crore. History is kept from the day the platform began capturing them."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Chooser options={KINDS} chosen={kind} onChange={setKind} label="Kind" />
        <Chooser options={WINDOWS} chosen={span} onChange={setSpan} label="Window" />
      </div>
      <DealsTable deals={deals.data ?? []} loading={deals.loading} label="Disclosed deals" />
    </div>
  );
}
