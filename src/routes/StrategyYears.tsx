/**
 * What worked each year: every saved strategy's calendar years beside the market's.
 *
 * One row per year, newest first: the market that year and the strategy that
 * did best, with what the leaders had in common -- the trait of their rules
 * (a market gate, few holdings, less invested in weak markets, a stop, a
 * target, switching) that most separated the strategies having it from the
 * rest. Choosing a year lists every strategy's result in it.
 *
 * It is hindsight: it says what worked once a year was over. Picking a
 * strategy for a year still to come needs a condition known at its start,
 * written as a combination that switches yearly and backtested like any
 * other.
 */

import { useState } from "react";

import {
  type StrategyYear,
  type TraitGap,
  type YearReview,
  fetchStrategyYears,
} from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { useResource } from "@/hooks/useResource";
import { percent, points, share } from "@/lib/backtestFigures";
import { ABSENT } from "@/lib/format";
import { strategyPath } from "@/lib/paths";

/** How each class of year reads, by the Nifty 500's return. */
const KINDS: Record<string, string> = {
  good: "Good year",
  average: "Average year",
  bad: "Bad year",
};

/**
 * A trait's gap in words.
 *
 * @param gap - The gap.
 * @returns Something like `a market gate, +14.2 pp`.
 */
function trait(gap: TraitGap | null): string {
  return gap === null ? ABSENT : `${gap.trait}, ${points(gap.gap)}`;
}

const YEAR_COLUMNS: Column<YearReview>[] = [
  {
    id: "year",
    header: "Year",
    accessorFn: (row) => row.year,
    cell: ({ row }) => <span className="font-medium">{String(row.original.year)}</span>,
  },
  {
    id: "kind",
    header: "Market",
    accessorFn: (row) => row.market?.nifty500 ?? null,
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        {row.original.kind !== null && (
          <Badge variant="outline">{KINDS[row.original.kind] ?? row.original.kind}</Badge>
        )}
        {percent(row.original.market?.nifty500)}
      </span>
    ),
  },
  {
    id: "drawdown",
    header: "Nifty 500's worst fall",
    accessorFn: (row) => row.market?.nifty500_drawdown ?? null,
    cell: ({ row }) => percent(row.original.market?.nifty500_drawdown),
    meta: { align: "right" },
  },
  {
    id: "breadth",
    header: "Large companies above 200-day",
    accessorFn: (row) => row.market?.breadth ?? null,
    cell: ({ row }) => share(row.original.market?.breadth),
    meta: { align: "right" },
  },
  {
    id: "uptrend",
    header: "Nifty 50 above 200-day",
    accessorFn: (row) => row.market?.uptrend ?? null,
    cell: ({ row }) => share(row.original.market?.uptrend),
    meta: { align: "right" },
  },
  {
    id: "best",
    header: "Best strategy",
    accessorFn: (row) => row.strategies[0]?.name ?? "",
    cell: ({ row }) => row.original.strategies[0]?.name ?? ABSENT,
  },
  {
    id: "best_change",
    header: "Its return",
    accessorFn: (row) => row.strategies[0]?.change ?? null,
    cell: ({ row }) => percent(row.original.strategies[0]?.change),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "led",
    header: "What the leaders had",
    accessorFn: (row) => row.led?.gap ?? null,
    cell: ({ row }) => trait(row.original.led),
  },
];

const STRATEGY_COLUMNS: Column<StrategyYear>[] = [
  {
    id: "name",
    header: "Strategy",
    accessorFn: (row) => row.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "change",
    header: "Return",
    accessorFn: (row) => row.change,
    cell: ({ row }) => percent(row.original.change),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "max_drawdown",
    header: "Worst fall",
    accessorFn: (row) => row.max_drawdown,
    cell: ({ row }) => percent(row.original.max_drawdown),
    meta: { align: "right" },
  },
  {
    id: "holdings",
    header: "Held on average",
    accessorFn: (row) => row.holdings,
    cell: ({ row }) => (row.original.holdings === null ? ABSENT : row.original.holdings.toFixed(1)),
    meta: { align: "right" },
  },
];

/**
 * Render the page.
 *
 * @returns The page.
 */
export function StrategyYears(): React.JSX.Element {
  const reviews = useResource(fetchStrategyYears);
  const [chosen, setChosen] = useState<number | null>(null);

  if (reviews.error !== null) {
    return <Failed message={reviews.error} />;
  }
  const shown = reviews.data?.find((review) => review.year === chosen) ?? reviews.data?.[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="What worked each year"
        description="Every saved strategy's return in each calendar year, from its latest backtest, beside the market that year and what the leaders had in common. This is hindsight: it shows what worked once a year was over. To pick a strategy for a year ahead, write the condition known at its start as a combination that switches yearly, and backtest it."
      />
      {reviews.data?.length === 0 ? (
        <Empty
          title="No backtested strategies yet"
          reason="Run a backtest of a strategy on its page, and its years appear here."
        />
      ) : (
        <DataTable
          columns={YEAR_COLUMNS}
          rows={reviews.data ?? []}
          loading={reviews.loading}
          onSelect={(row) => {
            setChosen(row.year);
          }}
          label="Years"
        />
      )}
      {shown !== undefined && (
        <section aria-label="The year chosen" className="space-y-3">
          <SectionHeader
            title={`${String(shown.year)}: every strategy`}
            description="Choose a year above to see it here."
          />
          <Reading review={shown} />
          <DataTable
            columns={STRATEGY_COLUMNS}
            rows={shown.strategies}
            linkTo={(row) => strategyPath(row.strategy_id)}
            label={`Strategies in ${String(shown.year)}`}
            full
            maxHeight="32rem"
          />
        </section>
      )}
    </div>
  );
}

/** What set the year's leaders apart, and what held others back, in sentences. */
function Reading({ review }: { review: YearReview }): React.JSX.Element | null {
  if (review.led === null && review.lagged === null) {
    return null;
  }
  return (
    <ul className="space-y-1 text-sm">
      {review.led !== null && (
        <li>
          Strategies with <span className="font-medium">{review.led.trait}</span> led by{" "}
          {points(review.led.gap)}: a median of {percent(review.led.with_median)} against{" "}
          {percent(review.led.without_median)} ({String(review.led.having)} had it).
        </li>
      )}
      {review.lagged !== null && (
        <li>
          Strategies with <span className="font-medium">{review.lagged.trait}</span> trailed by{" "}
          {points(-review.lagged.gap)}: a median of {percent(review.lagged.with_median)} against{" "}
          {percent(review.lagged.without_median)} ({String(review.lagged.having)} had it).
        </li>
      )}
    </ul>
  );
}
