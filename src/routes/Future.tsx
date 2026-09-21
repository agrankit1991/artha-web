/**
 * One futures contract, with the chain it belongs to.
 *
 * What it is on, when it expires and how big a lot is; the same figures a
 * company carries, because a contract trades; its own sessions with the
 * platform's averages over them; and every contract on the same
 * underlying, nearest first, with the price gap to this one -- the
 * calendar spread, which is the number a futures reader looks for that
 * nobody else does.
 */

import { Link } from "react-router-dom";
import { useCallback, useState } from "react";

import type { ContractSummary } from "@/api/client";
import { fetchFigures, fetchFuture, fetchOverviews } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { PageHeader } from "@/components/PageHeader";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { SectionHeader } from "@/components/SectionHeader";
import { ShareButton } from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { ENTITIES, MARKS } from "@/lib/entities";
import {
  ABSENT,
  formatCount,
  formatDay,
  formatPercent,
  formatPrice,
  formatVolume,
  toNumber,
} from "@/lib/format";
import { comparePath, futurePath } from "@/lib/paths";
import { monthOfCloses } from "@/lib/sharing";
import { daysLeft } from "@/routes/Futures";

interface FutureProps {
  instrumentKey: string;
}

const DEFAULT_RANGE = 125;

/**
 * Render the page.
 *
 * @param props - Which contract.
 * @returns The page.
 */
export function Future({ instrumentKey }: FutureProps): React.JSX.Element {
  const [sessions, setSessions] = useState(DEFAULT_RANGE);
  const load = useCallback(() => fetchFuture(instrumentKey), [instrumentKey]);
  const loadOverview = useCallback(() => fetchOverviews([instrumentKey]), [instrumentKey]);
  const loadChart = useCallback(
    () => fetchFigures(instrumentKey, sessions),
    [instrumentKey, sessions],
  );
  const future = useResource(load);
  const overview = useResource(loadOverview);
  const chart = useResource(loadChart);

  if (future.error !== null) {
    return <Failed message={future.error} />;
  }
  const found = future.data;
  const contract = found?.contract ?? null;
  const own = overview.data?.[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract?.symbol ?? instrumentKey}
        badges={
          found !== null && (
            <>
              <Badge variant="outline">{found.underlying.exchange}</Badge>
              <Badge variant="secondary">{found.underlying.name}</Badge>
              <Badge
                variant="outline"
                className={
                  found.contract.days_to_expiry <= 7
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500"
                    : ""
                }
              >
                Expires {formatDay(found.contract.expiry)} ·{" "}
                {daysLeft(found.contract.days_to_expiry)}
              </Badge>
              <Badge variant="outline">Lot {formatCount(found.contract.lot_size)}</Badge>
            </>
          )
        }
        description={
          found === null
            ? null
            : `One of ${String(found.underlying.contracts)} ${found.underlying.symbol} contracts listed today.`
        }
        actions={
          found !== null &&
          contract !== null && (
            <span className="flex flex-wrap items-center gap-2">
              <ShareButton
                facts={{
                  title: contract.symbol,
                  subtitle: `${found.underlying.exchange} · expires ${formatDay(contract.expiry)}`,
                  price: formatPrice(contract.close),
                  changePercent: toNumber(contract.change_percent),
                  changeText: formatPercent(contract.change_percent),
                  asOf: `As of ${formatDay(contract.as_of)}`,
                }}
                loadPoints={() => monthOfCloses(instrumentKey)}
                filename={contract.symbol.toLowerCase()}
              />
              <Button variant="outline" size="sm" asChild>
                <Link to={comparePath([instrumentKey])}>
                  <MARKS.compare aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  Compare
                </Link>
              </Button>
            </span>
          )
        }
      />

      {found !== null && (
        <section className="space-y-3" aria-labelledby="chain-heading">
          <SectionHeader
            id="chain-heading"
            icon={MARKS.dates}
            title="Expiry Chain"
            description="Every contract on the same underlying, nearest first, with each one's premium or discount to this contract."
          />
          <Chain chain={found.chain} subject={found.contract} />
        </section>
      )}

      <section className="space-y-3" aria-labelledby="figures-heading">
        <SectionHeader
          id="figures-heading"
          icon={ENTITIES.index.icon}
          title="The Contract Itself"
          description="Its level, range, trend, volume and momentum — the same figures a company carries, because a contract trades."
        />
        {overview.error !== null ? (
          <Failed message={overview.error} />
        ) : (
          <InstrumentFigures overview={own} loading={overview.loading} />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="price-heading">
        <SectionHeader
          id="price-heading"
          icon={ENTITIES.index.icon}
          title="Price"
          description="Its own sessions, with this platform's moving averages over them. A contract's history is as long as its life."
          actions={
            <RangeSelector ranges={PRICE_RANGES} sessions={sessions} onChange={setSessions} />
          }
        />
        {chart.error !== null ? (
          <Failed message={chart.error} />
        ) : (
          <PriceChart
            points={chart.data?.points ?? null}
            instrument={{ label: contract?.symbol ?? instrumentKey }}
            loading={chart.loading}
          />
        )}
      </section>
    </div>
  );
}

/** The run, with each contract's gap to the one on the page. */
function Chain({
  chain,
  subject,
}: {
  chain: ContractSummary[];
  subject: ContractSummary;
}): React.JSX.Element {
  const here = toNumber(subject.close);
  const columns: Column<ContractSummary>[] = [
    {
      id: "symbol",
      header: "Contract",
      accessorFn: (row) => row.symbol,
      cell: ({ row }) => (
        <span
          className={
            row.original.instrument_key === subject.instrument_key ? "font-semibold" : "font-medium"
          }
        >
          {row.original.symbol}
          {row.original.instrument_key === subject.instrument_key && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">this page</span>
          )}
        </span>
      ),
    },
    {
      id: "expiry",
      header: "Expiry",
      accessorFn: (row) => row.expiry,
      cell: ({ row }) =>
        `${formatDay(row.original.expiry)} · ${daysLeft(row.original.days_to_expiry)}`,
    },
    {
      id: "close",
      header: "Price",
      accessorFn: (row) => toNumber(row.close) ?? 0,
      cell: ({ row }) => formatPrice(row.original.close),
      meta: { align: "right" },
    },
    {
      id: "change",
      header: "Change",
      accessorFn: (row) => toNumber(row.change_percent) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => <Delta value={row.original.change_percent} />,
      meta: { align: "right" },
    },
    {
      id: "spread",
      header: "vs this",
      accessorFn: (row) => spread(here, row.close) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => {
        const gap = spread(here, row.original.close);
        return gap === null || row.original.instrument_key === subject.instrument_key ? (
          <span className="text-muted-foreground">{ABSENT}</span>
        ) : (
          <Delta value={gap.toFixed(2)} />
        );
      },
      meta: { align: "right" },
    },
    {
      id: "volume",
      header: "Volume",
      accessorFn: (row) => row.volume ?? 0,
      cell: ({ row }) => formatVolume(row.original.volume),
      meta: { align: "right" },
    },
    {
      id: "open_interest",
      header: "Open interest",
      accessorFn: (row) => row.open_interest ?? 0,
      cell: ({ row }) =>
        row.original.open_interest === null ? ABSENT : formatCount(row.original.open_interest),
      meta: { align: "right" },
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={chain}
      empty="No contracts"
      label="Expiry chain"
      linkTo={(row) => futurePath(row.instrument_key)}
    />
  );
}

/**
 * A contract's price against this page's, in per cent of this page's.
 *
 * @param here - This page's close, or null.
 * @param other - The other contract's close, or null.
 * @returns The gap, or null when either is unknown.
 */
export function spread(here: number | null, other: string | null): number | null {
  const there = toNumber(other);
  if (here === null || there === null || here === 0) {
    return null;
  }
  return ((there - here) / here) * 100;
}
