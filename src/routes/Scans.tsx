/**
 * The named scans, each with how many companies it finds today.
 *
 * StockEdge's scan catalogue, grouped the same way. Every scan is a set of
 * screener conditions, run through the screener for its count and opened
 * in it to see the companies, so a scan and a screen never disagree.
 *
 * The strategies come first: scans behind a strategy the strategy lab
 * backtested, shown with how each did year by year against the market,
 * how it works and what to hold against its figures.
 */

import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type ScreenField, fetchScreenFields } from "@/api/client";
import { ConditionBadges } from "@/components/ConditionBadges";
import { Failed } from "@/components/Failed";
import { MarketSwitch } from "@/components/MarketSwitch";
import { PageHeader } from "@/components/PageHeader";
import { ReturnsByYear } from "@/components/ReturnsByYear";
import { ScanCount } from "@/components/ScanCount";
import { SectionHeader } from "@/components/SectionHeader";
import { StrategyCard } from "@/components/StrategyCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { formatDay } from "@/lib/format";
import {
  SCANS,
  SCAN_CATEGORIES,
  STRATEGIES_DATA_THROUGH,
  STRATEGIES_EVALUATED,
  STRATEGY_SCANS,
  type Scan,
  type ScanCategory,
  scanPath,
} from "@/lib/scans";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Scans(): React.JSX.Element {
  const loadFields = useCallback(() => fetchScreenFields(), []);
  const fields = useResource(loadFields);

  if (fields.error !== null) {
    return <Failed message={fields.error} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scans"
        count={`${String(SCANS.length)} scans`}
        description="Questions asked of the whole market often enough to name, each with how many companies answer it on the latest session. Open one to see them in the screener, where its conditions can be changed."
      />
      {SCAN_CATEGORIES.map((category) =>
        category === "Strategies" ? (
          <StrategiesSection key={category} fields={fields.data} />
        ) : (
          <ScanSection key={category} category={category} fields={fields.data ?? []} />
        ),
      )}
    </div>
  );
}

/**
 * The backtested strategies: when they were tested, where the market
 * switch stands, how each did year by year, and a card for each.
 */
function StrategiesSection({ fields }: { fields: ScreenField[] | null }): React.JSX.Element {
  return (
    <section className="space-y-4" aria-label="Strategies">
      <SectionHeader
        title="Strategies"
        description="Rules backtested in the strategy lab, each with a scan that lists today's candidates."
      />
      <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          Backtested in the strategy lab on {formatDay(STRATEGIES_EVALUATED)}, on prices to{" "}
          {formatDay(STRATEGIES_DATA_THROUGH)}. The scan lists today&apos;s candidates; the strategy
          holds the top 20 by the scan&apos;s order (the surge strategy buys each day&apos;s rows
          into 20 slots). The figures stop at the evaluation and do not update with the market.
        </p>
        <p>
          Every figure comes from companies still listed today, which flatters them all. Random
          picks under the same rules share that flattery, so each card&apos;s edge over them is the
          figure to trust.
        </p>
      </div>
      <MarketSwitch fields={fields} />
      <ReturnsByYear scans={STRATEGY_SCANS} />
      <div className="grid gap-4 lg:grid-cols-2">
        {STRATEGY_SCANS.map((scan) => (
          <StrategyCard
            key={scan.key}
            scan={scan}
            fields={fields ?? []}
            // The featured strategy spans the row, which also leaves the
            // other four filling two rows of two.
            className={scan.featured === true ? "lg:col-span-2" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/** One category of plain scans, as a grid of cards. */
function ScanSection({
  category,
  fields,
}: {
  category: ScanCategory;
  fields: ScreenField[];
}): React.JSX.Element {
  return (
    <section className="space-y-3" aria-label={category}>
      <SectionHeader title={category} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCANS.filter((scan) => scan.category === category).map((scan) => (
          <ScanCard key={scan.key} scan={scan} fields={fields} />
        ))}
      </div>
    </section>
  );
}

/** One scan: what it asks, how many answer, and the way into the screener. */
function ScanCard({ scan, fields }: { scan: Scan; fields: ScreenField[] }): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{scan.label}</CardTitle>
          <ScanCount scan={scan} noun="stocks" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{scan.description}</p>
        <ConditionBadges conditions={scan.conditions} fields={fields} />
        <Link
          to={scanPath(scan)}
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
        >
          Run in the screener
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
