/**
 * Every strategy written here, with how its latest backtest went, and which to start today.
 *
 * A strategy is written as rules on its own page and backtested there by
 * the platform's backtester; a combination plays saved strategies, each in
 * the market conditions it names. The column to read is the edge over
 * random picks out of sample: survivor-only history flatters every return.
 *
 * Above the list, `StartToday` ranks them by how starting in a market
 * phase went. Both are filtered by the same categories (2026-10-16, the
 * owner's choice of two): the style, which the platform reads from each
 * strategy's rank, and the risk, banded by its deepest fall. The filters
 * live in the address (`?style=`, `?risk=`).
 */

import { CalendarRange, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { fetchStrategies } from "@/api/client";
import type { StrategySummary } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { Chooser } from "@/components/Chooser";
import { RunState, runStateLabel } from "@/components/RunState";
import { StartToday } from "@/components/StartToday";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { percent, ratio } from "@/lib/backtestFigures";
import { BALANCE_MEANING, byBalance } from "@/lib/balance";
import { ABSENT, formatPercentTenths, formatPercentagePoints, formatSince } from "@/lib/format";
import { RISK_BANDS, STYLES, riskBand, riskLabel } from "@/lib/marketPhases";
import { PATHS, strategyPath } from "@/lib/paths";

/**
 * A return from the backtest, as a move to one decimal.
 *
 * @param value - The return, per cent; null before a backtest.
 * @returns The move, or a dash.
 */
function growth(value: number | null | undefined): React.ReactNode {
  return value === null || value === undefined ? (
    ABSENT
  ) : (
    <Delta value={String(value)} format={formatPercentTenths} />
  );
}

const COLUMNS: Column<StrategySummary>[] = [
  {
    id: "name",
    header: "Strategy",
    accessorFn: (row) => row.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "style",
    header: "Style",
    accessorFn: (row) => STYLES[row.style],
    cell: ({ row }) => (
      <Badge variant={row.original.combines ? "secondary" : "outline"}>
        {STYLES[row.original.style]}
      </Badge>
    ),
  },
  {
    id: "risk",
    header: "Risk",
    accessorFn: (row) => Math.abs(row.result?.max_drawdown ?? 0),
    cell: ({ row }) =>
      row.original.result === null ? (
        ABSENT
      ) : (
        <Badge variant="outline">{riskLabel(riskBand(row.original.result.max_drawdown))}</Badge>
      ),
  },
  {
    id: "balance",
    header: "Balance",
    accessorFn: (row) => row.result?.balance ?? null,
    cell: ({ row }) => (
      <span title={BALANCE_MEANING} className="tabular">
        {ratio(row.original.result?.balance)}
      </span>
    ),
    meta: { align: "right" },
  },
  {
    id: "benchmark_lead",
    header: "vs Nifty 500",
    accessorFn: (row) => row.result?.benchmark_lead ?? null,
    cell: ({ row }) => {
      const lead = row.original.result?.benchmark_lead;
      return lead === null || lead === undefined ? (
        ABSENT
      ) : (
        <Delta value={String(lead)} format={formatPercentagePoints} />
      );
    },
    meta: { align: "right" },
  },
  {
    id: "status",
    header: "Latest run",
    accessorFn: (row) => runStateLabel(row.latest),
    cell: ({ row }) => <RunState latest={row.original.latest} />,
  },
  {
    id: "out_of_sample_cagr",
    header: "Out of sample",
    accessorFn: (row) => row.result?.out_of_sample_cagr ?? null,
    cell: ({ row }) => growth(row.original.result?.out_of_sample_cagr),
    meta: { align: "right" },
  },
  {
    id: "out_of_sample_edge",
    header: "Edge vs random",
    accessorFn: (row) => row.result?.out_of_sample_edge ?? null,
    cell: ({ row }) =>
      row.original.result === null ? (
        ABSENT
      ) : (
        <Delta
          value={String(row.original.result.out_of_sample_edge)}
          format={formatPercentagePoints}
        />
      ),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "cagr",
    header: "CAGR",
    accessorFn: (row) => row.result?.cagr ?? null,
    cell: ({ row }) => growth(row.original.result?.cagr),
    meta: { align: "right" },
  },
  {
    id: "max_drawdown",
    header: "Max drawdown",
    accessorFn: (row) => row.result?.max_drawdown ?? null,
    // A distance below a peak, written plainly: not a move up or down.
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
  const [style, setStyle] = useSearchParam("style", "all");
  const [risk, setRisk] = useSearchParam("risk", "all");
  const [beats, setBeats] = useSearchParam("beats", "any");

  const all = useMemo(() => strategies.data ?? [], [strategies.data]);
  const styles = useMemo(
    () =>
      (Object.keys(STYLES) as StrategySummary["style"][]).filter((key) =>
        all.some((one) => one.style === key),
      ),
    [all],
  );
  const listed = useMemo(
    () =>
      byBalance(
        all.filter(
          (one) =>
            (style === "all" || one.style === style) &&
            (risk === "all" || riskBand(one.result?.max_drawdown) === risk) &&
            (beats === "any" || (one.result?.benchmark_lead ?? 0) > 0),
        ),
        (one) => one.result?.balance,
      ),
    [all, style, risk, beats],
  );
  const shown = useMemo(
    () =>
      style === "all" && risk === "all" && beats === "any"
        ? null
        : new Set(listed.map((one) => one.strategy_id)),
    [listed, style, risk, beats],
  );

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
        description="Write a strategy as rules, or combine saved ones by the market's conditions, and backtest it on the stored history. Each shows the companies it would hold today. They open best balanced first: the CAGR per point of the deepest fall, in whichever of the two periods (to 2017, from 2018) was weaker. History before September 2026 holds only the companies that survived, so every return is optimistic: the edge over random picks is the figure to trust."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={PATHS.strategyYears}>
                <CalendarRange aria-hidden /> By year
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={strategyPath("new")}>
                <Plus aria-hidden /> New strategy
              </Link>
            </Button>
          </div>
        }
      />
      {strategies.data?.length === 0 ? (
        <Empty
          title="No strategies yet"
          reason="Write one with New strategy: it starts from a commented example."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chooser
              label="Style"
              options={[
                { key: "all", label: "Every style" },
                ...styles.map((key) => ({ key, label: STYLES[key] })),
              ]}
              chosen={style}
              onChange={setStyle}
            />
            <Chooser
              label="Risk"
              options={[
                { key: "all", label: "Any fall" },
                ...RISK_BANDS.map(({ key, label }) => ({ key, label })),
              ]}
              chosen={risk}
              onChange={setRisk}
            />
            <Chooser
              label="Index"
              options={[
                { key: "any", label: "Any" },
                { key: "nifty500", label: "Beats the Nifty 500" },
              ]}
              chosen={beats}
              onChange={setBeats}
            />
          </div>
          <StartToday shown={shown} />
          <section aria-label="Every strategy" className="space-y-3">
            <DataTable
              columns={COLUMNS}
              rows={listed}
              loading={strategies.loading}
              linkTo={(row) => strategyPath(row.strategy_id)}
              label="Strategies"
              empty="No strategy in these categories"
            />
          </section>
        </>
      )}
    </div>
  );
}
