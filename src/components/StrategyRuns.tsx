/**
 * The backtests asked of a strategy, newest first: when, how each went,
 * and the record each kept.
 */

import type { StrategyRequest } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { ABSENT, formatSince } from "@/lib/format";
import { backtestPath } from "@/lib/paths";

/** How each status reads. */
const STATUSES: Record<StrategyRequest["status"], string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
};

/**
 * How long a request took, in words.
 *
 * @param request - The request.
 * @returns Something like `1m 40s`, or a dash until it has finished.
 */
export function duration(request: StrategyRequest): string {
  if (request.started_at === null || request.finished_at === null) {
    return ABSENT;
  }
  const seconds = Math.round(
    (new Date(request.finished_at).getTime() - new Date(request.started_at).getTime()) / 1000,
  );
  return seconds < 60
    ? `${String(seconds)}s`
    : `${String(Math.floor(seconds / 60))}m ${String(seconds % 60)}s`;
}

const COLUMNS: Column<StrategyRequest>[] = [
  {
    id: "requested_at",
    header: "Asked",
    accessorFn: (row) => row.requested_at,
    cell: ({ row }) => formatSince(row.original.requested_at),
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "failed" ? "destructive" : "outline"}>
        {STATUSES[row.original.status]}
      </Badge>
    ),
  },
  {
    id: "took",
    header: "Took",
    accessorFn: (row) => duration(row),
    cell: ({ row }) => duration(row.original),
  },
  {
    id: "outcome",
    header: "Outcome",
    accessorFn: (row) => row.error ?? "",
    cell: ({ row }) =>
      row.original.error !== null ? (
        <span className="font-mono text-xs text-loss">{row.original.error}</span>
      ) : row.original.backtest_id !== null ? (
        `Backtest ${String(row.original.backtest_id)}`
      ) : (
        ABSENT
      ),
  },
];

interface StrategyRunsProps {
  requests: StrategyRequest[];
}

/**
 * Draw the requests.
 *
 * @param props - The requests, newest first.
 * @returns The table; a finished one leads to its backtest.
 */
export function StrategyRuns({ requests }: StrategyRunsProps): React.JSX.Element {
  return (
    <DataTable
      columns={COLUMNS}
      rows={requests}
      linkTo={(row) => (row.backtest_id === null ? null : backtestPath(row.backtest_id))}
      label="Backtest runs"
      empty="Not backtested yet"
    />
  );
}
