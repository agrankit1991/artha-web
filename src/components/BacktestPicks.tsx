/**
 * The companies a playbook would hold on its history's last session.
 *
 * Chosen from the same signals its backtest ran on, so the record above
 * and the names here are one rule. Companies past the slots are shown as
 * runners-up: they pass the rules but rank below what today's exposure
 * fills. These are a fresh start's picks, not a running portfolio's, which
 * also holds what it bought earlier until its next rebalance.
 *
 * While it would buy nothing -- its gate shut, say -- the candidates are
 * still listed, the first slots' worth marked Next: research is done on the
 * weekend's closes, and a shut market is when a watchlist is wanted.
 */

import { useMemo } from "react";

import { Callout } from "@/components/Callout";
import { ReadingGuide } from "@/components/ReadingGuide";
import type { BacktestPick, BacktestPicks } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatPrice } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { PICK_TERMS } from "@/lib/strategyTerms";

/** What each reason for buying nothing means, in words. */
const STANDINGS: Record<string, string> = {
  "gate shut": "The market gate is shut: the strategy would be in cash.",
  recovering: "The market is sideways by its rule: nothing would be bought.",
  "no exposure": "Its exposure rule allows no holdings today.",
  "no play": "No play's condition holds today: the money waits.",
};

/**
 * The picks table's columns, given whether the playbook is buying.
 *
 * @param picks - The picks.
 * @returns The columns; Today reads Hold, Next (first to buy once it may) or Runner-up.
 */
function columnsFor(picks: BacktestPicks): Column<BacktestPick>[] {
  const buying = picks.standing === "buy";
  const today = (row: BacktestPick): string =>
    row.chosen ? "Hold" : !buying && row.rank <= picks.slots ? "Next" : "Runner-up";
  return [
    // First, because `linkTo` makes the first column the way to the company.
    symbolColumn((row) => ({ symbol: row.symbol ?? row.instrument_key, name: null })),
    {
      id: "rank",
      header: "Rank",
      accessorFn: (row) => row.rank,
      cell: ({ row }) => String(row.original.rank),
      meta: { hint: PICK_TERMS.rank, align: "right" },
    },
    {
      id: "close",
      header: "Close",
      accessorFn: (row) => row.close,
      cell: ({ row }) => formatPrice(String(row.original.close)),
      meta: { hint: PICK_TERMS.close, align: "right" },
    },
    {
      id: "score",
      header: "Ranking figure",
      accessorFn: (row) => row.score,
      cell: ({ row }) => row.original.score.toPrecision(4),
      meta: { hint: PICK_TERMS.score, align: "right" },
    },
    {
      id: "chosen",
      header: "Today",
      accessorFn: (row) => today(row),
      cell: ({ row }) => {
        const reading = today(row.original);
        return <Badge variant={reading === "Hold" ? "default" : "outline"}>{reading}</Badge>;
      },
      meta: { hint: PICK_TERMS.today },
    },
  ];
}

interface BacktestPicksProps {
  picks: BacktestPicks;
}

/**
 * Draw the picks.
 *
 * @param props - The picks.
 * @returns What the playbook would hold; while it would hold nothing, why,
 *   and what it would buy first once it may.
 */
export function BacktestPicksPanel({ picks }: BacktestPicksProps): React.JSX.Element {
  const buying = picks.standing === "buy";
  const columns = useMemo(() => columnsFor(picks), [picks]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        As of {formatDay(picks.as_of)}
        {picks.play !== null && <>, by {picks.play}</>}
        {buying && (
          <>
            {" "}
            -- holding {String(picks.room)} of at most {String(picks.slots)}.
          </>
        )}
      </p>
      <PicksGuide slots={picks.slots} />
      {!buying && (
        <Callout tone="info" role="status">
          {STANDINGS[picks.standing] ?? picks.standing}
          {picks.candidates.length > 0 && (
            <>
              {" "}
              Below is what passes its rules today; those marked Next are what it would buy first
              once it may.
            </>
          )}
        </Callout>
      )}
      {(buying || picks.candidates.length > 0) && (
        <DataTable
          columns={columns}
          rows={picks.candidates}
          linkTo={(row) =>
            row.symbol === null ? null : companyPath(row.instrument_key, row.symbol)
          }
          label="Picks today"
          full
          maxHeight="26rem"
          empty="No company passes its rules today"
        />
      )}
    </div>
  );
}

/** The money a worked example of buying the picks starts with: the backtest's own default. */
const EXAMPLE_CAPITAL = 1_000_000;

/** The price a worked example buys at. */
const EXAMPLE_PRICE = 2_500;

/**
 * How to read the picks and how many shares to buy, worked for this strategy's slots.
 *
 * @param props - How many companies the strategy holds at most.
 * @returns The guide, shut until asked.
 */
function PicksGuide({ slots }: { slots: number }): React.JSX.Element {
  const each = Math.round(EXAMPLE_CAPITAL / Math.max(slots, 1));
  const shares = Math.floor(each / EXAMPLE_PRICE);
  return (
    <ReadingGuide>
      <p>
        <strong>Hold</strong> is what a fresh start would buy at the next open: the top-ranked
        companies passing its rules, as many as it may hold today. <strong>Next</strong>, while it
        would buy nothing (its market gate shut, say), is what it would buy first once it may.{" "}
        <strong>Runner-up</strong> passes the rules but ranks below the slots it fills.
      </p>
      <p>
        <strong>How many shares:</strong> each holding takes an equal share of the money, your
        capital divided by its {String(slots)} slots, then by the price. With Rs 10 lakh that is Rs{" "}
        {each.toLocaleString("en-IN")} a holding: at a price of Rs{" "}
        {EXAMPLE_PRICE.toLocaleString("en-IN")}, {String(shares)} shares.
      </p>
      <p>
        <strong>Holding fewer than its slots</strong> (a strategy easing to six of ten while the
        Nifty 50 is under its 50-day average, say) keeps the rest in gold or cash, as its rules say.
      </p>
      <p>
        <strong>These are a fresh start&apos;s picks.</strong> A portfolio already running keeps
        what it bought until its own next rebalance or exit, so it may hold others.
      </p>
    </ReadingGuide>
  );
}
