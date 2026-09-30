/**
 * The named scans, each with how many companies it finds today.
 *
 * StockEdge's scan catalogue, grouped the same way. Every scan is a set of
 * screener conditions, counted by the screener's own query and opened in
 * it to see the companies, so a scan and a screen never disagree. Every
 * count comes in one request, and each is drawn as a bar against the
 * page's largest, so a category is scanned by size before it is read.
 *
 * The strategies' scans are here as scans: today's candidates. The copy
 * of the strategy lab's tested figures this page once carried never
 * updated itself and was removed (the owner's decision D11, 2026-09-30);
 * what the platform itself has backtested is on the Backtests page.
 */

import { ArrowRight } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { type ScreenField, fetchScreenCounts, fetchScreenFields } from "@/api/client";
import { ConditionBadges } from "@/components/ConditionBadges";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { formatCount } from "@/lib/format";
import { type Icon, MARKS } from "@/lib/entities";
import { PATHS } from "@/lib/paths";
import { SCANS, SCAN_CATEGORIES, type Scan, type ScanCategory, scanPath } from "@/lib/scans";

/** Each category's icon, from the one vocabulary. */
const MARK: Record<ScanCategory, Icon> = {
  Strategies: MARKS.strategies,
  Fundamentals: MARKS.financials,
  Size: MARKS.size,
  Price: MARKS.price,
  Trend: MARKS.trend,
  Momentum: MARKS.momentum,
  Volume: MARKS.volume,
  Volatility: MARKS.volatility,
};

/** What a category is about, said under its name where it needs saying. */
const ABOUT: Partial<Record<ScanCategory, React.ReactNode>> = {
  Strategies: (
    <>
      Today&apos;s candidates for the strategies the strategy lab tested before it was archived.
      What the platform itself has backtested is on{" "}
      <Link to={PATHS.backtests} className="text-primary hover:underline">
        Backtests
      </Link>
      .
    </>
  ),
};

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Scans(): React.JSX.Element {
  const loadFields = useCallback(() => fetchScreenFields(), []);
  const loadCounts = useCallback(
    () => fetchScreenCounts(Object.fromEntries(SCANS.map((scan) => [scan.key, scan.conditions]))),
    [],
  );
  const fields = useResource(loadFields);
  const counts = useResource(loadCounts);
  // Every bar is drawn against the largest count on the page.
  const largest = useMemo(() => Math.max(...Object.values(counts.data ?? {}), 1), [counts.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scans"
        count={`${String(SCANS.length)} scans`}
        description="Questions asked of the whole market often enough to name, each with how many companies answer it on the latest session. Open one to see them in the screener, where its conditions can be changed."
      />
      {fields.error !== null && <Failed message={fields.error} />}
      {counts.error !== null && <Failed message={counts.error} />}
      {SCAN_CATEGORIES.map((category) => (
        <section key={category} className="space-y-3" aria-label={category}>
          <SectionHeader
            title={category}
            icon={MARK[category]}
            {...(ABOUT[category] === undefined ? {} : { description: ABOUT[category] })}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCANS.filter((scan) => scan.category === category).map((scan) => (
              <ScanCard
                key={scan.key}
                scan={scan}
                fields={fields.data ?? []}
                count={counts.data?.[scan.key]}
                counting={counts.loading}
                largest={largest}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** One scan: what it asks, how many answer, and the way into the screener. */
function ScanCard({
  scan,
  fields,
  count,
  counting,
  largest,
}: {
  scan: Scan;
  fields: ScreenField[];
  /** How many companies it finds; undefined when the platform gave no count. */
  count: number | undefined;
  counting: boolean;
  largest: number;
}): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2">
        <CardTitle>{scan.label}</CardTitle>
        <ScanSize count={count} counting={counting} largest={largest} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{scan.description}</p>
        <ConditionBadges conditions={scan.conditions} fields={fields} />
        <Link
          to={scanPath(scan)}
          viewTransition
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
        >
          Run in the screener
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * A scan's count, written and drawn as a bar against the page's largest.
 * A scan with no count says so rather than showing a nought it was never
 * given.
 */
function ScanSize({
  count,
  counting,
  largest,
}: {
  count: number | undefined;
  counting: boolean;
  largest: number;
}): React.JSX.Element {
  if (counting) {
    return <Skeleton className="h-5 w-32" />;
  }
  if (count === undefined) {
    return <span className="text-sm text-muted-foreground">Not counted</span>;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm font-medium tabular">
        {formatCount(count)} {count === 1 ? "company" : "companies"}
      </span>
      <span aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-primary/70"
          style={{ width: `${String((count / largest) * 100)}%` }}
        />
      </span>
    </div>
  );
}
