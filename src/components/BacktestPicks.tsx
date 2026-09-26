/**
 * The companies a playbook would hold on its history's last session.
 *
 * Chosen from the same signals its backtest ran on, so the record above
 * and the names here are one rule. Companies past the slots are shown as
 * runners-up: they pass the rules but rank below what today's exposure
 * fills. These are a fresh start's picks, not a running portfolio's, which
 * also holds what it bought earlier until its next rebalance.
 */

import type { BacktestPick, BacktestPicks } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatPrice } from "@/lib/format";
import { companyPath } from "@/lib/paths";

/** What each reason for buying nothing means, in words. */
const STANDINGS: Record<string, string> = {
  "gate shut": "The market gate is shut: the playbook would be in cash.",
  recovering: "The market is sideways by its rule: nothing would be bought.",
  "no exposure": "Its exposure rule allows no holdings today.",
  "no play": "No play's condition holds today: the money waits.",
};

const COLUMNS: Column<BacktestPick>[] = [
  // First, because `linkTo` makes the first column the way to the company.
  symbolColumn((row) => ({ symbol: row.symbol ?? row.instrument_key, name: null })),
  {
    id: "rank",
    header: "Rank",
    accessorFn: (row) => row.rank,
    cell: ({ row }) => String(row.original.rank),
    meta: { align: "right" },
  },
  {
    id: "close",
    header: "Close",
    accessorFn: (row) => row.close,
    cell: ({ row }) => formatPrice(String(row.original.close)),
    meta: { align: "right" },
  },
  {
    id: "score",
    header: "Ranking figure",
    accessorFn: (row) => row.score,
    cell: ({ row }) => row.original.score.toPrecision(4),
    meta: { align: "right" },
  },
  {
    id: "chosen",
    header: "Today",
    accessorFn: (row) => row.chosen,
    cell: ({ row }) =>
      row.original.chosen ? <Badge>Hold</Badge> : <Badge variant="outline">Runner-up</Badge>,
  },
];

interface BacktestPicksProps {
  picks: BacktestPicks;
}

/**
 * Draw the picks.
 *
 * @param props - The picks.
 * @returns What the playbook would hold, or why it would hold nothing.
 */
export function BacktestPicksPanel({ picks }: BacktestPicksProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        As of {formatDay(picks.as_of)}
        {picks.play !== null && <>, by {picks.play}</>}
        {picks.standing === "buy" && (
          <>
            {" "}
            -- holding {String(picks.room)} of at most {String(picks.slots)}.
          </>
        )}
      </p>
      {picks.standing === "buy" ? (
        <DataTable
          columns={COLUMNS}
          rows={picks.candidates}
          linkTo={(row) =>
            row.symbol === null ? null : companyPath(row.instrument_key, row.symbol)
          }
          label="Picks today"
          full
          maxHeight="26rem"
          empty="No company passes its rules today"
        />
      ) : (
        <p role="status" className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          {STANDINGS[picks.standing] ?? picks.standing}
        </p>
      )}
    </div>
  );
}
