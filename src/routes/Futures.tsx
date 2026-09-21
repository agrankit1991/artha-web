/**
 * Every underlying with futures listed today.
 *
 * Commodities, equity and index derivatives, and currencies, one family
 * at a time: each underlying with its nearest contract's price, move,
 * volume and open interest, how many days that contract has left, and
 * how many contracts run on it. Each row leads to the nearest contract's
 * page, where the whole chain is.
 */

import { useCallback, useMemo, useState } from "react";

import type { FuturesSegment, UnderlyingSummary } from "@/api/client";
import { fetchFutures } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatCount, formatDay, formatPrice, formatVolume, toNumber } from "@/lib/format";
import { futurePath } from "@/lib/paths";

/** The families, as the chooser names them. */
export const SEGMENTS: { key: FuturesSegment; label: string }[] = [
  { key: "COMMODITY", label: "Commodities" },
  { key: "DERIVATIVES", label: "Equity & index" },
  { key: "CURRENCY", label: "Currency" },
];

/** What each family holds, said beside the chooser. */
const NOTES: Record<FuturesSegment, string> = {
  COMMODITY: "MCX and NSE commodity contracts: metals, energy, agriculture.",
  DERIVATIVES: "NSE and BSE futures on companies and indices.",
  CURRENCY: "Rupee pairs on the currency segments.",
};

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Futures(): React.JSX.Element {
  const [segment, setSegment] = useState<FuturesSegment>("COMMODITY");
  const [typed, setTyped] = useState("");
  const load = useCallback(() => fetchFutures(segment), [segment]);
  const futures = useResource(load);

  const shown = useMemo(() => {
    const letters = typed.trim().toLowerCase();
    return (futures.data ?? []).filter(
      (one) =>
        letters === "" ||
        one.symbol.toLowerCase().includes(letters) ||
        one.name.toLowerCase().includes(letters),
    );
  }, [futures.data, typed]);

  const columns = useMemo<Column<UnderlyingSummary>[]>(
    () => [
      {
        id: "symbol",
        header: "Underlying",
        accessorFn: (row) => row.symbol,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.symbol}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.name} · {row.original.exchange}
            </div>
          </div>
        ),
      },
      {
        id: "expiry",
        header: "Nearest expiry",
        accessorFn: (row) => row.nearest.expiry,
        cell: ({ row }) => (
          <span className="inline-flex flex-col leading-tight">
            <span>{formatDay(row.original.nearest.expiry)}</span>
            <span className="text-xs text-muted-foreground">
              {daysLeft(row.original.nearest.days_to_expiry)}
            </span>
          </span>
        ),
      },
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.nearest.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.nearest.close),
        meta: { align: "right" },
      },
      {
        id: "change",
        header: "Change",
        accessorFn: (row) => toNumber(row.nearest.change_percent) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <Delta value={row.original.nearest.change_percent} />,
        meta: { align: "right" },
      },
      {
        id: "one_month",
        header: "1M",
        accessorFn: (row) => toNumber(row.nearest.one_month) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <Delta value={row.original.nearest.one_month} />,
        meta: { align: "right" },
      },
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.nearest.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.nearest.volume),
        meta: { align: "right" },
      },
      {
        id: "open_interest",
        header: "Open interest",
        accessorFn: (row) => row.nearest.open_interest ?? 0,
        cell: ({ row }) =>
          row.original.nearest.open_interest === null
            ? ABSENT
            : formatCount(row.original.nearest.open_interest),
        meta: { align: "right" },
      },
      {
        id: "contracts",
        header: "Contracts",
        accessorFn: (row) => row.contracts,
        cell: ({ row }) => row.original.contracts,
        meta: { align: "right" },
      },
    ],
    [],
  );

  if (futures.error !== null) {
    return <Failed message={futures.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Futures"
        description="Every underlying with contracts listed today, with its nearest contract's price, move, volume and open interest. Each leads to the contract and its chain."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Chooser options={SEGMENTS} chosen={segment} onChange={setSegment} label="Family" />
        <Input
          type="search"
          aria-label="Find an underlying"
          placeholder="Find an underlying"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          className="w-64"
        />
        <span className="text-xs text-muted-foreground">{NOTES[segment]}</span>
      </div>
      <DataTable
        columns={columns}
        rows={shown}
        loading={futures.loading}
        empty="No futures in this family today"
        placeholderRows={10}
        label="Underlyings"
        full
        linkTo={(row) => futurePath(row.nearest.instrument_key)}
      />
    </div>
  );
}

/**
 * Say how long a contract has, in words.
 *
 * @param days - Calendar days to expiry; nought on the day, negative past it.
 * @returns The words.
 */
export function daysLeft(days: number): string {
  if (days < 0) {
    return "expired";
  }
  if (days === 0) {
    return "expires today";
  }
  return `${String(days)} ${days === 1 ? "day" : "days"} left`;
}
