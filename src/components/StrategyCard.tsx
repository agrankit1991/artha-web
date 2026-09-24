/**
 * One backtested strategy: what it does, how it did, how it works, what to
 * hold against it, and how many candidates its scan finds today.
 *
 * The figures are the strategy lab's, over the years its rules were not
 * chosen on, beside the market's over the same years. The last whole year
 * and the running one are shown as well, because "is it working now" is
 * the question a reader brings to the card.
 */

import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import type { ScreenField } from "@/api/client";
import { ConditionBadges } from "@/components/ConditionBadges";
import { Delta } from "@/components/Delta";
import { HowItWorks } from "@/components/HowItWorks";
import { ScanCount } from "@/components/ScanCount";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDayMonth,
  formatPercentTenths,
  formatPercentagePoints,
  formatMonth,
} from "@/lib/format";
import { RECENT_YEARS, RUNNING_YEAR, returnIn } from "@/lib/returnsByYear";
import { NIFTY_500_YEARS, STRATEGIES_DATA_THROUGH, type StrategyScan, scanPath } from "@/lib/scans";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  scan: StrategyScan;
  /** The screener's registry, to name the scan's conditions; empty while it loads. */
  fields: ScreenField[];
  className?: string | undefined;
}

/**
 * Render the card.
 *
 * @param props - The strategy's scan and the registry.
 * @returns The card.
 */
export function StrategyCard({ scan, fields, className }: StrategyCardProps): React.JSX.Element {
  const { strategy } = scan;
  const { tested } = strategy;
  return (
    <Card aria-label={scan.label} role="article" className={cn("flex flex-col", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{scan.label}</CardTitle>
            <Badge variant="outline" className="font-mono">
              {strategy.id}
            </Badge>
          </div>
          <ScanCount scan={scan} noun="candidates" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{strategy.headline}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <StatGrid className="lg:grid-cols-3">
          <StatTile
            label="Return a year"
            value={<Delta value={String(tested.cagr)} format={formatPercentTenths} arrow={false} />}
            hint={`${String(tested.unseenFrom)} on; Nifty 500 ${formatPercentTenths(String(tested.nifty500))}`}
          />
          <StatTile
            label="Edge over random picks"
            value={
              <Delta value={String(tested.edge)} format={formatPercentagePoints} arrow={false} />
            }
            hint="a year, same rules"
          />
          <StatTile
            label="Edge without 2020-21"
            value={
              <Delta
                value={String(tested.edgeWithout2020To2021)}
                format={formatPercentagePoints}
                arrow={false}
              />
            }
            hint={
              // The lab counts whole unseen years only, leaving 2020 and
              // 2021 out. A strategy whose unseen years start later never
              // had them, and differs from its edge only by the part-year.
              tested.unseenFrom > 2021
                ? "whole unseen years; 2020-21 not among them"
                : "whole unseen years, 2020-21 left out"
            }
          />
          <StatTile
            label="Deepest fall"
            value={
              <Delta
                value={String(tested.maxDrawdown)}
                format={formatPercentTenths}
                arrow={false}
              />
            }
            hint={`${String(tested.unseenFrom)} on`}
          />
          {[...RECENT_YEARS].reverse().map((year) => (
            <StatTile
              key={year}
              label={
                year === RUNNING_YEAR
                  ? `${String(year)} to ${formatDayMonth(STRATEGIES_DATA_THROUGH)}`
                  : String(year)
              }
              value={
                <Delta
                  value={returnIn(strategy.years, year)}
                  format={formatPercentTenths}
                  arrow={false}
                />
              }
              hint={`Nifty 500 ${formatPercentTenths(returnIn(NIFTY_500_YEARS, year))}`}
            />
          ))}
        </StatGrid>
        <p className="text-xs text-muted-foreground">
          Tested from {formatMonth(tested.from)}. The first four figures cover the unseen years,{" "}
          {tested.unseenFrom} on, which were held back while the rules were set; the edge without
          2020-21 counts whole years only.
        </p>

        <section aria-label="How it works" className="space-y-2">
          <h3 className="text-sm font-semibold">How it works</h3>
          <HowItWorks rules={strategy.howItWorks} />
        </section>

        <section aria-label="Caveats" className="space-y-2">
          <h3 className="text-sm font-semibold">Caveats</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {strategy.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </section>

        <div className="mt-auto space-y-3">
          <ConditionBadges conditions={scan.conditions} fields={fields} />
          <Link
            to={scanPath(scan)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open in the screener
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
