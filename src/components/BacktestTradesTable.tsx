/**
 * Every sale a backtest made, newest first.
 *
 * A holding sold in parts -- a portion at its target, its cost recovered in
 * a sideways market -- is one row per part, with the share of the purchase
 * each sold. A company still listed leads to its page; one that is not has
 * no page to lead to and its key is shown instead. Each sale's reason says
 * what it means on its own mark, and `SaleReasonsGuide` lists them all.
 */

import type { BacktestTrade } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Hint } from "@/components/Hint";
import { symbolColumn } from "@/components/identityColumns";
import { ReadingGuide } from "@/components/ReadingGuide";
import { Badge } from "@/components/ui/badge";
import { percent, share, weight } from "@/lib/backtestFigures";
import { ABSENT, formatDay, formatPrice, formatWhole } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { RECORD_TERMS, SALE_REASONS } from "@/lib/strategyTerms";

/**
 * Why a sale was made, as a badge with a mark saying what the reason means.
 *
 * A reason the platform has added since `SALE_REASONS` was written is shown
 * as the platform names it, with no mark, rather than as nothing.
 *
 * @param props - The platform's reason.
 * @returns The badge.
 */
function SaleReasonBadge({ reason }: { reason: string }): React.JSX.Element {
  const known = SALE_REASONS[reason];
  if (known === undefined) {
    return <Badge variant="outline">{reason}</Badge>;
  }
  return (
    // The last column, so the explanation opens back over the table.
    <Hint text={known.meaning} term={known.word} side="start">
      <Badge variant="outline">{known.word}</Badge>
    </Hint>
  );
}

/**
 * Every reason a backtest sells for and what it means: the Why column, read whole.
 *
 * @returns The guide, shut until asked.
 */
export function SaleReasonsGuide(): React.JSX.Element {
  return (
    <ReadingGuide title="What each reason in Why means">
      <dl className="grid gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr]">
        {Object.values(SALE_REASONS).map(({ word, meaning }) => (
          <div key={word} className="contents">
            <dt>
              <Badge variant="outline">{word}</Badge>
            </dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </ReadingGuide>
  );
}

const COLUMNS: Column<BacktestTrade>[] = [
  symbolColumn((row) => ({ symbol: row.symbol ?? row.instrument_key, name: null })),
  {
    id: "entered",
    header: "Bought",
    accessorFn: (row) => row.entered,
    cell: ({ row }) => formatDay(row.original.entered),
    meta: { hint: RECORD_TERMS.bought },
  },
  {
    id: "exited",
    header: "Sold",
    accessorFn: (row) => row.exited,
    cell: ({ row }) => formatDay(row.original.exited),
    meta: { hint: RECORD_TERMS.sold },
  },
  {
    id: "sessions",
    header: "Sessions",
    accessorFn: (row) => row.sessions,
    cell: ({ row }) => String(row.original.sessions),
    meta: { hint: RECORD_TERMS.sessions, align: "right" },
  },
  {
    id: "prices",
    header: "Bought at → sold at",
    accessorFn: (row) => row.entry_price,
    cell: ({ row }) =>
      `${formatPrice(String(row.original.entry_price))} → ${formatPrice(String(row.original.exit_price))}`,
    meta: { hint: RECORD_TERMS.prices, align: "right" },
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
    meta: { hint: RECORD_TERMS.gain, align: "right" },
  },
  {
    id: "portion",
    header: "Of the holding",
    accessorFn: (row) => row.portion,
    cell: ({ row }) => share(row.original.portion * 100),
    meta: { hint: RECORD_TERMS.portion, align: "right" },
  },
  {
    id: "shares",
    header: "Shares",
    accessorFn: (row) => row.shares ?? null,
    cell: ({ row }) =>
      row.original.shares === null || row.original.shares === undefined
        ? ABSENT
        : formatWhole(Math.round(row.original.shares)),
    meta: { hint: RECORD_TERMS.shares, align: "right" },
  },
  {
    id: "first_weight",
    header: "Weight at entry",
    accessorFn: (row) => row.first_weight ?? null,
    cell: ({ row }) => weight(row.original.first_weight),
    meta: { hint: RECORD_TERMS.firstWeight, align: "right" },
  },
  {
    id: "weight_range",
    header: "Weight while held",
    accessorFn: (row) => row.highest_weight ?? null,
    cell: ({ row }) =>
      row.original.lowest_weight === null || row.original.lowest_weight === undefined
        ? ABSENT
        : `${weight(row.original.lowest_weight)} - ${weight(row.original.highest_weight)}`,
    meta: { hint: RECORD_TERMS.weightRange, align: "right" },
  },
  {
    id: "reason",
    header: "Why",
    accessorFn: (row) => row.reason,
    cell: ({ row }) => <SaleReasonBadge reason={row.original.reason} />,
    meta: { hint: RECORD_TERMS.reason },
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
