/**
 * A strategy's latest finished backtest: its verdict, and the companies it
 * would hold today.
 *
 * Both are read from the kept backtest itself, the same record the
 * Backtests page shows whole, and drawn by the same verdict tiles, so what
 * this page says and what that page says cannot differ: the period judged
 * on and its dates come from the record, not from copy.
 */

import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type StrategyResult, fetchBacktest } from "@/api/client";
import { BacktestPicksPanel } from "@/components/BacktestPicks";
import { VerdictTiles, periodName, verdictPeriod } from "@/components/BacktestVerdict";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { benchmarkName } from "@/lib/backtestFigures";
import { formatDay, formatSince, sentence } from "@/lib/format";
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
  const verdict = backtest.data === null ? undefined : verdictPeriod(backtest.data.periods);
  const judged =
    verdict === undefined
      ? ""
      : ` ${periodName(verdict)}: ${formatDay(verdict.first_session)} - ${formatDay(verdict.last_session)}.`;

  return (
    <div className="space-y-6">
      <section aria-label="Verdict" className="space-y-3">
        <SectionHeader
          title="Latest backtest"
          description={`Run ${formatSince(result.run_at)}.${judged}`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={backtestPath(result.backtest_id)}>
                The whole record <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
        {backtest.error !== null ? (
          <p className="text-sm text-destructive">{sentence(backtest.error)}</p>
        ) : (
          <VerdictTiles
            period={verdict}
            index={backtest.data === null ? "" : benchmarkName(backtest.data.benchmark)}
          />
        )}
      </section>
      <section aria-label="Picks today" className="space-y-3">
        <SectionHeader
          title="Picks today"
          description="The companies it would hold on the last session of its history."
        />
        {backtest.error !== null ? null : picks !== null ? (
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
