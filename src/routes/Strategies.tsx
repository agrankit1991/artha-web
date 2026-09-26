/**
 * Every strategy written here, with how its latest backtest went.
 *
 * A strategy is written as rules on its own page and backtested there by
 * the platform's backtester; a combination plays saved strategies, each in
 * the market conditions it names. The column to read is the edge over
 * random picks out of sample: survivor-only history flatters every return.
 */

import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchStrategies } from "@/api/client";
import type { StrategySummary } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { percent, points } from "@/lib/backtestFigures";
import { ABSENT, formatSince } from "@/lib/format";
import { strategyPath } from "@/lib/paths";

/** What the latest request's status says in the list. */
function standing(row: StrategySummary): string {
  if (row.latest === null) {
    return "Not run";
  }
  return {
    queued: "Queued",
    running: "Running",
    done: "Done",
    failed: "Failed",
  }[row.latest.status];
}

const COLUMNS: Column<StrategySummary>[] = [
  {
    id: "name",
    header: "Strategy",
    accessorFn: (row) => row.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "combines",
    header: "Kind",
    accessorFn: (row) => row.combines,
    cell: ({ row }) =>
      row.original.combines ? <Badge variant="secondary">Combination</Badge> : "Strategy",
  },
  {
    id: "status",
    header: "Latest run",
    accessorFn: (row) => standing(row),
    cell: ({ row }) => standing(row.original),
  },
  {
    id: "out_of_sample_cagr",
    header: "Out of sample",
    accessorFn: (row) => row.result?.out_of_sample_cagr ?? null,
    cell: ({ row }) =>
      row.original.result === null ? ABSENT : percent(row.original.result.out_of_sample_cagr),
    meta: { align: "right" },
  },
  {
    id: "out_of_sample_edge",
    header: "Edge vs random",
    accessorFn: (row) => row.result?.out_of_sample_edge ?? null,
    cell: ({ row }) =>
      row.original.result === null ? ABSENT : points(row.original.result.out_of_sample_edge),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "cagr",
    header: "CAGR",
    accessorFn: (row) => row.result?.cagr ?? null,
    cell: ({ row }) => (row.original.result === null ? ABSENT : percent(row.original.result.cagr)),
    meta: { align: "right" },
  },
  {
    id: "max_drawdown",
    header: "Max drawdown",
    accessorFn: (row) => row.result?.max_drawdown ?? null,
    cell: ({ row }) =>
      row.original.result === null ? ABSENT : percent(row.original.result.max_drawdown),
    meta: { align: "right" },
  },
  {
    id: "updated_at",
    header: "Changed",
    accessorFn: (row) => row.updated_at,
    cell: ({ row }) => formatSince(row.original.updated_at),
  },
];

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Strategies(): React.JSX.Element {
  const strategies = useResource(fetchStrategies);

  if (strategies.error !== null) {
    return <Failed message={strategies.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategies"
        count={
          strategies.data === null ? undefined : `${String(strategies.data.length)} strategies`
        }
        description="Write a strategy as rules, or combine saved ones by the market's conditions, and backtest it on the stored history. Each shows the companies it would hold today. History before September 2026 holds only the companies that survived, so every return is optimistic -- the edge over random picks is the figure to trust."
        actions={
          <Button size="sm" asChild>
            <Link to={strategyPath("new")}>
              <Plus aria-hidden /> New strategy
            </Link>
          </Button>
        }
      />
      {strategies.data?.length === 0 ? (
        <Empty
          title="No strategies yet"
          reason="Write one with New strategy: it starts from a commented example."
        />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={strategies.data ?? []}
          loading={strategies.loading}
          linkTo={(row) => strategyPath(row.strategy_id)}
          label="Strategies"
        />
      )}
    </div>
  );
}
