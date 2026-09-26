/**
 * A strategy's latest finished backtest: its verdict, and the companies it
 * would hold today.
 *
 * The verdict comes with the strategy; the picks are read from the kept
 * backtest itself, the same record the Backtests page shows whole, so what
 * this page lists and what that page lists cannot differ.
 */

import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type StrategyResult, fetchBacktest } from "@/api/client";
import { BacktestPicksPanel } from "@/components/BacktestPicks";
import { SectionHeader } from "@/components/SectionHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { percent, points } from "@/lib/backtestFigures";
import { formatSince } from "@/lib/format";
import { backtestPath } from "@/lib/paths";

interface StrategyResultProps {
  result: StrategyResult;
}

/**
 * Draw the verdict and the picks.
 *
 * @param props - The latest finished backtest's headline.
 * @returns The panel.
 */
export function StrategyResultPanel({ result }: StrategyResultProps): React.JSX.Element {
  const load = useCallback(() => fetchBacktest(result.backtest_id), [result.backtest_id]);
  const backtest = useResource(load);
  const picks = backtest.data?.picks ?? null;

  return (
    <div className="space-y-6">
      <section aria-label="Verdict" className="space-y-3">
        <SectionHeader
          title="Latest backtest"
          description={`Run ${formatSince(result.run_at)}. Out of sample is from 2018, after the years the settings could have been chosen on.`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={backtestPath(result.backtest_id)}>
                The whole record <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
        <StatGrid>
          <StatTile label="CAGR, out of sample" value={percent(result.out_of_sample_cagr)} />
          <StatTile
            label="Edge over random picks"
            value={points(result.out_of_sample_edge)}
            hint="out of sample"
          />
          <StatTile label="CAGR, whole stretch" value={percent(result.cagr)} />
          <StatTile label="Max drawdown" value={percent(result.max_drawdown)} />
        </StatGrid>
      </section>
      <section aria-label="Picks today" className="space-y-3">
        <SectionHeader
          title="Picks today"
          description="The companies it would hold on the last session of its history."
        />
        {backtest.error !== null ? (
          <p className="text-sm text-loss">{backtest.error}</p>
        ) : picks !== null ? (
          <BacktestPicksPanel picks={picks} />
        ) : (
          !backtest.loading && (
            <p className="text-sm text-muted-foreground">This backtest kept no picks.</p>
          )
        )}
      </section>
    </div>
  );
}
