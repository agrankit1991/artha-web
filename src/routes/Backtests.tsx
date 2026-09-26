/**
 * Every backtest kept: each playbook tested, with its verdict at a glance.
 *
 * Backtests run on the laptop, where the history is read, and are kept by
 * `backtest --keep` there or `import-backtest` here. The column to read is
 * the edge: survivor-only history flatters every return, so what a
 * playbook earned beyond random picks under its own rules is the figure
 * that survives the flattery.
 */

import { fetchBacktests } from "@/api/client";
import type { BacktestSummary } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { useResource } from "@/hooks/useResource";
import { formatDay } from "@/lib/format";
import { percent, points, ratio } from "@/lib/backtestFigures";
import { backtestPath } from "@/lib/paths";

const COLUMNS: Column<BacktestSummary>[] = [
  {
    id: "name",
    header: "Playbook",
    accessorFn: (row) => row.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "stretch",
    header: "Traded",
    accessorFn: (row) => row.first_session,
    cell: ({ row }) =>
      `${formatDay(row.original.first_session)} – ${formatDay(row.original.last_session)}`,
  },
  {
    id: "cagr",
    header: "CAGR",
    accessorFn: (row) => row.cagr,
    cell: ({ row }) => percent(row.original.cagr),
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
    id: "out_of_sample_edge",
    header: "Edge vs random",
    accessorFn: (row) => row.out_of_sample_edge,
    cell: ({ row }) => points(row.original.out_of_sample_edge),
    meta: { align: "right", emphasis: true },
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
    id: "run_at",
    header: "Run",
    accessorFn: (row) => row.run_at,
    cell: ({ row }) => formatDay(row.original.run_at.slice(0, 10)),
  },
];

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Backtests(): React.JSX.Element {
  const backtests = useResource(fetchBacktests);

  if (backtests.error !== null) {
    return <Failed message={backtests.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtests"
        count={backtests.data === null ? undefined : `${String(backtests.data.length)} backtests`}
        description="Every playbook tested on the stored history and kept, judged the strategy lab's way: in and out of sample, against the index, and against random picks under the same rules. History before September 2026 holds only the companies that survived, so every return is optimistic -- the edge over random picks is the figure to trust."
      />
      {backtests.data?.length === 0 ? (
        <Empty
          title="No backtests kept yet"
          reason="Run one on the laptop with python -m artha backtest <file> --keep, or copy its report here and import it with python -m artha import-backtest."
        />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={backtests.data ?? []}
          loading={backtests.loading}
          linkTo={(row) => backtestPath(row.backtest_id)}
          label="Kept backtests"
        />
      )}
    </div>
  );
}
