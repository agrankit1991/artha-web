/**
 * One kept backtest, whole: its verdict, its growth beside the index, each
 * period and year, the rules it played, and every trade.
 *
 * The verdict leads with the out-of-sample figures when the stretch was
 * split, because those years are the honest test -- the in-sample ones are
 * where the settings were chosen.
 */

import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";

import { Callout } from "@/components/Callout";
import { type BacktestPlay, type BacktestYear, fetchBacktest } from "@/api/client";
import { BacktestBaskets } from "@/components/BacktestBaskets";
import { BacktestMeasures } from "@/components/BacktestMeasures";
import { BacktestPeriodsTable } from "@/components/BacktestPeriodsTable";
import { BacktestPicksPanel } from "@/components/BacktestPicks";
import { BacktestPlays } from "@/components/BacktestPlays";
import { BacktestTradesTable } from "@/components/BacktestTradesTable";
import { Chart, type Series } from "@/components/Chart";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StrategyExplanationPanel } from "@/components/StrategyExplanationPanel";
import { VerdictTiles, periodName, verdictPeriod } from "@/components/BacktestVerdict";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { benchmarkName, percent, points, share } from "@/lib/backtestFigures";
import { growthLines } from "@/lib/backtestReadings";
import { BENCHMARK, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ABSENT, formatDay, formatDayInIndia } from "@/lib/format";

/** A year of the run, beside the breadth of the market that year. */
type YearRow = BacktestYear & { breadth: number | null };

const YEAR_COLUMNS: Column<YearRow>[] = [
  {
    id: "year",
    header: "Year",
    accessorFn: (row) => row.year,
    cell: ({ row }) => String(row.original.year),
  },
  {
    id: "playbook",
    header: "Strategy",
    accessorFn: (row) => row.playbook,
    cell: ({ row }) => percent(row.original.playbook),
    meta: { align: "right" },
  },
  {
    id: "benchmark",
    header: "Index",
    accessorFn: (row) => row.benchmark,
    cell: ({ row }) => percent(row.original.benchmark),
    meta: { align: "right" },
  },
  {
    id: "lead",
    header: "Lead",
    accessorFn: (row) => (row.benchmark === null ? null : row.playbook - row.benchmark),
    cell: ({ row }) =>
      points(
        row.original.benchmark === null ? null : row.original.playbook - row.original.benchmark,
      ),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "max_drawdown",
    header: "Worst fall",
    accessorFn: (row) => row.max_drawdown ?? null,
    cell: ({ row }) => percent(row.original.max_drawdown),
    meta: { align: "right" },
  },
  {
    id: "holdings",
    header: "Companies held",
    accessorFn: (row) => row.holdings?.average ?? null,
    cell: ({ row }) => {
      const held = row.original.holdings;
      return held === null || held === undefined
        ? ABSENT
        : `${held.average.toFixed(1)} (${String(held.fewest)}-${String(held.most)})`;
    },
    meta: { align: "right" },
  },
  {
    id: "trades",
    header: "Trades",
    accessorFn: (row) => row.trades ?? null,
    cell: ({ row }) =>
      row.original.trades === null || row.original.trades === undefined
        ? ABSENT
        : String(row.original.trades),
    meta: { align: "right" },
  },
  {
    id: "breadth",
    header: "Large companies above 200-day",
    accessorFn: (row) => row.breadth,
    cell: ({ row }) => share(row.original.breadth),
    meta: { align: "right" },
  },
];

/**
 * The slots the playbook is written with, when every play holds the same number.
 *
 * @param plays - Its plays.
 * @returns The number, or null when they differ.
 */
function writtenSlots(plays: BacktestPlay[]): number | null {
  const slots = new Set(plays.map((play) => play.rules.slots));
  const [only] = [...slots];
  return slots.size === 1 && typeof only === "number" ? only : null;
}

/**
 * Render the page for the backtest the address names.
 *
 * @returns The page.
 */
export function Backtest(): React.JSX.Element {
  const { id = "" } = useParams();
  const load = useCallback(() => fetchBacktest(Number(id)), [id]);
  const backtest = useResource(load);
  const lines = useMemo(() => growthLines(backtest.data?.equity ?? []), [backtest.data]);

  if (backtest.error !== null) {
    return <Failed message={backtest.error} />;
  }
  if (backtest.data === null) {
    return backtest.loading ? (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
      </div>
    ) : (
      <Empty title={`No backtest ${id}`} reason="It may have been kept on another machine." />
    );
  }

  const shown = backtest.data;
  const index = benchmarkName(shown.benchmark);
  const verdict = verdictPeriod(shown.periods);
  const series: Series[] = [
    {
      kind: "line",
      label: shown.name,
      colour: PRICE_LINE,
      points: lines.playbook,
      width: PRICE_WIDTH,
    },
    { kind: "line", label: index, colour: BENCHMARK, points: lines.benchmark, width: 1 },
  ];
  const whole = shown.periods.find((period) => period.name === "whole");
  const breadth = new Map((shown.market ?? []).map((year) => [year.year, year.breadth]));
  const years = shown.years.map((year) => ({ ...year, breadth: breadth.get(year.year) ?? null }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={shown.name}
        description={shown.description}
        identifiers={`Run ${formatDayInIndia(shown.run_at)} · history to ${formatDay(shown.data_to)}`}
        badges={<Badge variant="outline">against the {index}</Badge>}
      />
      <Callout tone="caution">{shown.note}</Callout>

      {verdict !== undefined && (
        <section aria-label="Verdict" className="space-y-3">
          <SectionHeader
            title={periodName(verdict)}
            description={`${formatDay(verdict.first_session)} - ${formatDay(verdict.last_session)}`}
          />
          <VerdictTiles period={verdict} index={index} />
        </section>
      )}

      {shown.picks !== null && (
        <section aria-label="Picks today" className="space-y-3">
          <SectionHeader
            title="Picks today"
            description="The companies the strategy would hold on the last session of its history."
          />
          <BacktestPicksPanel picks={shown.picks} />
        </section>
      )}

      <section aria-label="Growth" className="space-y-3">
        <SectionHeader
          title="Growth"
          description={`The strategy against the ${index}, from its first session.`}
        />
        <Chart series={series} scale="percent" empty="No closes to draw" />
      </section>

      <section aria-label="Periods" className="space-y-3">
        <SectionHeader
          title="Periods"
          description="Each run from cash. The median calendar is the strategy rebalanced on every day of its cycle; the edge is that less the median of random picks under the same rules."
        />
        <BacktestPeriodsTable periods={shown.periods} />
      </section>

      {shown.periods.some((period) => period.detail) && (
        <section aria-label="Risk and streaks" className="space-y-3">
          <SectionHeader
            title="Risk and streaks"
            description="How deep and how long its worst fall was, its longest runs up and down, what its trades won and lost, and how many companies it held."
          />
          <BacktestMeasures periods={shown.periods} />
        </section>
      )}

      {(shown.baskets ?? []).length > 0 && (
        <section aria-label="Basket size" className="space-y-3">
          <SectionHeader
            title="Basket size"
            description="The same rules holding at most 10, 20, 30, 40 or 50 companies, over the whole stretch; in- and out-of-sample are that run's two parts."
          />
          <BacktestBaskets baskets={shown.baskets ?? []} written={writtenSlots(shown.plays)} />
        </section>
      )}

      <section aria-label="Years" className="space-y-3">
        <SectionHeader title="Year by year" />
        <DataTable columns={YEAR_COLUMNS} rows={years} label="Years" />
      </section>

      <section aria-label="Rules" className="space-y-3">
        <SectionHeader title="Rules" />
        {shown.explanation && (
          <section aria-label="In plain words" className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="text-base font-semibold">In plain words</h3>
            <StrategyExplanationPanel explanation={shown.explanation} />
          </section>
        )}
        <BacktestPlays
          plays={shown.plays}
          switchCadence={shown.switch}
          // Unreachable fallback: the platform always sends the whole stretch.
          played={whole?.played ?? {}}
        />
      </section>

      <section aria-label="Trades" className="space-y-3">
        <SectionHeader
          title="Trades"
          description={`${String(shown.trades.length)} sales, newest first.`}
        />
        <BacktestTradesTable trades={shown.trades} />
      </section>
    </div>
  );
}
