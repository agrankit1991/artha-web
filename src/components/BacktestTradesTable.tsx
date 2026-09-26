/**
 * Every sale a backtest made, newest first.
 *
 * A holding sold in parts -- a portion at its target, its cost recovered in
 * a sideways market -- is one row per part, with the share of the purchase
 * each sold. A company still listed leads to its page; one that is not has
 * no page to lead to and its key is shown instead.
 */

import type { BacktestTrade } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { percent, share } from "@/lib/backtestFigures";
import { formatDay, formatPrice } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** Why each sale was made, as a reader would say it. */
const REASONS: Record<string, string> = {
  rebalance: "Rebalance",
  exit: "Exit",
  stop: "Stop",
  target: "Target",
  time: "Time",
  regime: "Regime",
  exposure: "Exposure",
  recover: "Recover cost",
  switch: "Switch",
  discontinuity: "Neutralised",
  end: "Still held",
};

const COLUMNS: Column<BacktestTrade>[] = [
  symbolColumn((row) => ({ symbol: row.symbol ?? row.instrument_key, name: null })),
  {
    id: "entered",
    header: "Bought",
    accessorFn: (row) => row.entered,
    cell: ({ row }) => formatDay(row.original.entered),
  },
  {
    id: "exited",
    header: "Sold",
    accessorFn: (row) => row.exited,
    cell: ({ row }) => formatDay(row.original.exited),
  },
  {
    id: "sessions",
    header: "Sessions",
    accessorFn: (row) => row.sessions,
    cell: ({ row }) => String(row.original.sessions),
    meta: { align: "right" },
  },
  {
    id: "prices",
    header: "Bought at → sold at",
    accessorFn: (row) => row.entry_price,
    cell: ({ row }) =>
      `${formatPrice(String(row.original.entry_price))} → ${formatPrice(String(row.original.exit_price))}`,
    meta: { align: "right" },
  },
  {
    id: "gain_percent",
    header: "Gain",
    accessorFn: (row) => row.gain_percent,
    cell: ({ row }) => (
      <span className={cn(row.original.gain_percent >= 0 ? "text-gain" : "text-loss")}>
        {percent(row.original.gain_percent)}
      </span>
    ),
    meta: { align: "right" },
  },
  {
    id: "portion",
    header: "Of the holding",
    accessorFn: (row) => row.portion,
    cell: ({ row }) => share(row.original.portion * 100),
    meta: { align: "right" },
  },
  {
    id: "reason",
    header: "Why",
    accessorFn: (row) => row.reason,
    cell: ({ row }) => (
      <Badge variant="outline">{REASONS[row.original.reason] ?? row.original.reason}</Badge>
    ),
  },
];

interface BacktestTradesTableProps {
  trades: BacktestTrade[];
}

/**
 * Draw the table.
 *
 * @param props - The trades, in the order they were made.
 * @returns The table, newest first.
 */
export function BacktestTradesTable({ trades }: BacktestTradesTableProps): React.JSX.Element {
  return (
    <DataTable
      columns={COLUMNS}
      rows={[...trades].reverse()}
      linkTo={(row) => (row.symbol === null ? null : companyPath(row.instrument_key, row.symbol))}
      label="Trades"
      full
      maxHeight="32rem"
    />
  );
}
