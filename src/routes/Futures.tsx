/**
 * Every underlying with futures listed today.
 *
 * Commodities, equity and index derivatives, and currencies, one family
 * at a time: each underlying with its nearest contract's price, move,
 * volume and open interest, how many days that contract has left, and
 * how many contracts run on it. Each row leads to the nearest contract's
 * page, where the whole chain is.
 */

import { useCallback, useMemo } from "react";

import type { FuturesSegment, UnderlyingSummary } from "@/api/client";
import { fetchFutures } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
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
 * Render the page. The family and the letters are in the address, so a
 * reader who opens a contract and comes Back finds the same list.
 *
 * @returns The page.
 */
export function Futures(): React.JSX.Element {
  const [chosen, setSegment] = useSearchParam("family", "COMMODITY");
  const [typed, setTyped] = useSearchParam("q");
  const segment = SEGMENTS.find((one) => one.key === chosen)?.key ?? "COMMODITY";
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
      // Symbol and name apart, as every list of instruments has them.
      symbolColumn((row) => row),
      nameColumn((row) => row),
      {
        id: "exchange",
        header: "Exchange",
        accessorFn: (row) => row.exchange,
        cell: ({ row }) => row.original.exchange,
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
        cell: ({ row }) => formatCount(row.original.contracts),
        meta: { align: "right" },
      },
    ],
    [],
  );

  const count = futures.data?.length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Futures"
        count={
          count === undefined
            ? undefined
            : `${formatCount(count)} ${count === 1 ? "underlying" : "underlyings"}`
        }
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
        {/* The total is in the header; here only what the letters leave. */}
        {futures.data !== null && shown.length !== futures.data.length && (
          <span className="text-xs text-muted-foreground">
            {formatCount(shown.length)} of {formatCount(futures.data.length)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{NOTES[segment]}</span>
      </div>
      {futures.error !== null ? (
        <Failed message={futures.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={shown}
          loading={futures.loading}
          empty={typed.trim() === "" ? "No futures in this family today" : "No underlying matches"}
          placeholderRows={10}
          label="Underlyings"
          full
          linkTo={(row) => futurePath(row.nearest.instrument_key)}
        />
      )}
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
