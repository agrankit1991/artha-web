/**
 * A backtest's periods side by side: in sample, out of sample, the whole.
 *
 * The edge column is emphasised because it is the verdict: survivor-only
 * history flatters every return, random picks under the same rules
 * included, so what a playbook earned beyond them is what survives.
 */

import type { BacktestPeriod } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { percent, points, ratio, share } from "@/lib/backtestFigures";
import { ABSENT, formatDay } from "@/lib/format";

const NAMES: Record<BacktestPeriod["name"], string> = {
  whole: "Whole stretch",
  "in-sample": "In sample",
  "out-of-sample": "Out of sample",
};

const COLUMNS: Column<BacktestPeriod>[] = [
  {
    id: "name",
    header: "Period",
    accessorFn: (row) => row.name,
    cell: ({ row }) => (
      <span>
        <span className="font-medium">{NAMES[row.original.name]}</span>
        <span className="block text-xs text-muted-foreground">
          {formatDay(row.original.first_session)} – {formatDay(row.original.last_session)}
        </span>
      </span>
    ),
  },
  {
    id: "cagr",
    header: "CAGR",
    accessorFn: (row) => row.cagr,
    cell: ({ row }) => percent(row.original.cagr),
    meta: { align: "right" },
  },
  {
    id: "judged",
    header: "Median calendar",
    accessorFn: (row) => row.judged_cagr,
    cell: ({ row }) =>
      row.original.calendar_low === null ? (
        ABSENT
      ) : (
        <span>
          {percent(row.original.judged_cagr)}
          <span className="block text-xs text-muted-foreground">
            {percent(row.original.calendar_low)} to {percent(row.original.calendar_high)}
          </span>
        </span>
      ),
    meta: { align: "right" },
  },
  {
    id: "random",
    header: "Random picks",
    accessorFn: (row) => row.random_median,
    cell: ({ row }) => percent(row.original.random_median),
    meta: { align: "right" },
  },
  {
    id: "edge",
    header: "Edge",
    accessorFn: (row) => row.edge,
    cell: ({ row }) => points(row.original.edge),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "benchmark",
    header: "Index",
    accessorFn: (row) => row.benchmark_cagr,
    cell: ({ row }) => percent(row.original.benchmark_cagr),
    meta: { align: "right" },
  },
  {
    id: "max_drawdown",
    header: "Max drawdown",
    accessorFn: (row) => row.max_drawdown,
    cell: ({ row }) => percent(row.original.max_drawdown),
    meta: { align: "right" },
  },
  {
    id: "sharpe",
    header: "Sharpe",
    accessorFn: (row) => row.sharpe,
    cell: ({ row }) => ratio(row.original.sharpe),
    meta: { align: "right" },
  },
  {
    id: "trades",
    header: "Trades",
    accessorFn: (row) => row.trades,
    cell: ({ row }) => String(row.original.trades),
    meta: { align: "right" },
  },
  {
    id: "win_rate",
    header: "Won",
    accessorFn: (row) => row.win_rate,
    cell: ({ row }) => share(row.original.win_rate),
    meta: { align: "right" },
  },
  {
    id: "invested",
    header: "Invested",
    accessorFn: (row) => row.invested,
    cell: ({ row }) => share(row.original.invested),
    meta: { align: "right" },
  },
];

interface BacktestPeriodsTableProps {
  periods: BacktestPeriod[];
}

/**
 * Draw the table.
 *
 * @param props - The periods.
 * @returns The table.
 */
export function BacktestPeriodsTable({ periods }: BacktestPeriodsTableProps): React.JSX.Element {
  return <DataTable columns={COLUMNS} rows={periods} label="Periods" />;
}
