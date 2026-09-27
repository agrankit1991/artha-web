/**
 * The same playbook with baskets of other sizes: 10 companies, 20, 30, 40, 50.
 *
 * Each size is the playbook rerun with every strategy's slots set to it and
 * nothing else changed, over the whole stretch; its in- and out-of-sample
 * figures are that run's two parts. So a reader keeping a basket of 20, or
 * of 50, sees what the rules would have done at their size.
 */

import type { BacktestBasket } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { percent, ratio } from "@/lib/backtestFigures";

/**
 * The table's columns, marking the size the playbook is written with.
 *
 * @param written - The playbook's own slots; null when its plays differ.
 * @returns The columns.
 */
function columnsFor(written: number | null): Column<BacktestBasket>[] {
  return [
    {
      id: "slots",
      header: "Basket",
      accessorFn: (row) => row.slots,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          {String(row.original.slots)} companies
          {row.original.slots === written && <Badge variant="outline">as written</Badge>}
        </span>
      ),
    },
    {
      id: "cagr",
      header: "CAGR",
      accessorFn: (row) => row.cagr,
      cell: ({ row }) => percent(row.original.cagr),
      meta: { align: "right", emphasis: true },
    },
    {
      id: "in_sample_cagr",
      header: "In-sample",
      accessorFn: (row) => row.in_sample_cagr,
      cell: ({ row }) => percent(row.original.in_sample_cagr),
      meta: { align: "right" },
    },
    {
      id: "out_of_sample_cagr",
      header: "Out of sample",
      accessorFn: (row) => row.out_of_sample_cagr,
      cell: ({ row }) => percent(row.original.out_of_sample_cagr),
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
      id: "holdings",
      header: "Held on average",
      accessorFn: (row) => row.holdings,
      cell: ({ row }) => row.original.holdings.toFixed(1),
      meta: { align: "right" },
    },
  ];
}

interface BacktestBasketsProps {
  baskets: BacktestBasket[];
  /** The playbook's own slots, to mark its row; null when its plays hold different numbers. */
  written: number | null;
}

/**
 * Draw the basket sizes.
 *
 * @param props - The sizes, and the playbook's own.
 * @returns The table.
 */
export function BacktestBaskets({ baskets, written }: BacktestBasketsProps): React.JSX.Element {
  return <DataTable columns={columnsFor(written)} rows={baskets} label="Basket sizes" />;
}
