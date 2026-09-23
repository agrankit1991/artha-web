/**
 * The named scans, each with how many companies it finds today.
 *
 * StockEdge's scan catalogue, grouped the same way. Every scan is a set of
 * screener conditions, run through the screener for its count and opened
 * in it to see the companies, so a scan and a screen never disagree.
 */

import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type ScreenField, fetchScreen, fetchScreenFields } from "@/api/client";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { OPERATORS } from "@/routes/Screener";
import { SCANS, SCAN_CATEGORIES, type Scan, scanPath } from "@/lib/scans";

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
      {SCAN_CATEGORIES.map((category) => (
        <section key={category} className="space-y-3" aria-label={category}>
          <SectionHeader title={category} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCANS.filter((scan) => scan.category === category).map((scan) => (
              <ScanCard key={scan.key} scan={scan} fields={fields.data ?? []} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** One scan: what it asks, how many answer, and the way into the screener. */
function ScanCard({ scan, fields }: { scan: Scan; fields: ScreenField[] }): React.JSX.Element {
  // Only the count is wanted: one row, and the total the screener reports.
  const loadCount = useCallback(
    () =>
      fetchScreen({
        conditions: scan.conditions,
        scope_kind: "companies",
        scope_key: "all",
        sort: null,
        order: "desc",
        limit: 1,
        offset: 0,
      }),
    [scan],
  );
  const found = useResource(loadCount);
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{scan.label}</CardTitle>
          {found.loading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <Badge variant="secondary" className="shrink-0 tabular">
              {found.data === null ? "—" : `${String(found.data.total)} stocks`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{scan.description}</p>
        <div className="flex flex-wrap gap-1">
          {scan.conditions.map((one) => (
            <Badge
              key={`${one.field}:${one.operator}`}
              variant="outline"
              className="font-mono text-xs"
            >
              {describe(one.field, fields)} {operatorLabel(one.operator)} {one.value}
            </Badge>
          ))}
        </div>
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

/** A field's label, or its name before the labels have arrived. */
function describe(field: string, fields: ScreenField[]): string {
  return fields.find((one) => one.name === field)?.label ?? field;
}

/** How an operator is written. */
function operatorLabel(operator: string): string {
  return OPERATORS.find((one) => one.key === operator)?.label ?? operator;
}
