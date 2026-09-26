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

import { type BacktestYear, fetchBacktest } from "@/api/client";
import { BacktestPeriodsTable } from "@/components/BacktestPeriodsTable";
import { BacktestPlays } from "@/components/BacktestPlays";
import { BacktestTradesTable } from "@/components/BacktestTradesTable";
import { Chart, type Series } from "@/components/Chart";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Badge } from "@/components/ui/badge";
import { useResource } from "@/hooks/useResource";
import { percent, points, ratio } from "@/lib/backtestFigures";
import { growthLines } from "@/lib/backtestReadings";
import { PRICE_LINE, THRESHOLD } from "@/lib/chartPalette";
import { formatDay } from "@/lib/format";

/** How the benchmarks are named on the page. */
const BENCHMARKS: Record<string, string> = {
  nifty50: "Nifty 50",
  nifty500: "Nifty 500",
  vix: "India VIX",
  gold: "Gold",
};

const YEAR_COLUMNS: Column<BacktestYear>[] = [
  {
    id: "year",
    header: "Year",
    accessorFn: (row) => row.year,
    cell: ({ row }) => String(row.original.year),
  },
  {
    id: "playbook",
    header: "Playbook",
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
];

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
      <div className="space-y-6" aria-busy="true" />
    ) : (
      <Empty title={`No backtest ${id}`} reason="It may have been kept on another machine." />
    );
  }

  const shown = backtest.data;
  const index = BENCHMARKS[shown.benchmark] ?? shown.benchmark;
  const verdict =
    shown.periods.find((period) => period.name === "out-of-sample") ??
    shown.periods.find((period) => period.name === "whole");
  const series: Series[] = [
    { kind: "line", label: shown.name, colour: PRICE_LINE, points: lines.playbook },
    { kind: "line", label: index, colour: THRESHOLD, points: lines.benchmark, width: 1 },
  ];
  const whole = shown.periods.find((period) => period.name === "whole");

  return (
    <div className="space-y-8">
      <PageHeader
        title={shown.name}
        description={shown.description}
        identifiers={`Run ${formatDay(shown.run_at.slice(0, 10))} · history to ${formatDay(shown.data_to)}`}
        badges={<Badge variant="outline">against the {index}</Badge>}
      />
      <p
        role="note"
        className="rounded-md border border-caution/40 bg-caution/10 px-3 py-2 text-sm"
      >
        {shown.note}
      </p>

      {verdict !== undefined && (
        <section aria-label="Verdict" className="space-y-3">
          <SectionHeader
            title={verdict.name === "out-of-sample" ? "Out of sample" : "The whole stretch"}
            description={`${formatDay(verdict.first_session)} – ${formatDay(verdict.last_session)}`}
          />
          <StatGrid>
            <StatTile
              label="CAGR"
              value={percent(verdict.cagr)}
              hint={`${index}: ${percent(verdict.benchmark_cagr)}`}
            />
            <StatTile
              label="Edge over random picks"
              value={points(verdict.edge)}
              hint={`random picks: ${percent(verdict.random_median)}`}
            />
            <StatTile label="Max drawdown" value={percent(verdict.max_drawdown)} />
            <StatTile label="Sharpe" value={ratio(verdict.sharpe)} />
          </StatGrid>
        </section>
      )}

      <section aria-label="Growth" className="space-y-3">
        <SectionHeader
          title="Growth"
          description={`The playbook against the ${index}, from its first session.`}
        />
        <Chart series={series} scale="percent" empty="No closes to draw" />
      </section>

      <section aria-label="Periods" className="space-y-3">
        <SectionHeader
          title="Periods"
          description="Each run from cash. The median calendar is the playbook rebalanced on every day of its cycle; the edge is that less the median of random picks under the same rules."
        />
        <BacktestPeriodsTable periods={shown.periods} />
      </section>

      <section aria-label="Years" className="space-y-3">
        <SectionHeader title="Year by year" />
        <DataTable columns={YEAR_COLUMNS} rows={shown.years} label="Years" />
      </section>

      <section aria-label="Rules" className="space-y-3">
        <SectionHeader title="Rules" />
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
