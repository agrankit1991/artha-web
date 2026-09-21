/**
 * One mutual fund scheme: what it is, what it has returned, and its value
 * over time.
 *
 * A fund has no price chart in the sense the rest of this site means one.
 * There are no sessions, no high and low, no volume -- a fund publishes
 * one value a day and that is the whole of its record. So the chart is a
 * single line and the figures beside it are returns, which is what a fund
 * is actually judged on.
 */

import { useCallback, useMemo, useState } from "react";

import type { SchemeValue } from "@/api/client";
import { fetchFund } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { Delta } from "@/components/Delta";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ABSENT, formatDay, formatPrice, toNumber } from "@/lib/format";

interface FundProps {
  /** AMFI's identifier for the scheme. */
  schemeCode: string;
}

/** The spans of history on offer, in years. */
const SPANS = [
  { key: "1", label: "1Y" },
  { key: "3", label: "3Y" },
  { key: "5", label: "5Y" },
  { key: "10", label: "10Y" },
  { key: "25", label: "Max" },
];

const DEFAULT_SPAN = "5";

/**
 * Render the page.
 *
 * @param props - Which scheme to show.
 * @returns The page.
 */
export function Fund({ schemeCode }: FundProps): React.JSX.Element {
  const [span, setSpan] = useState(DEFAULT_SPAN);

  const load = useCallback(() => fetchFund(schemeCode, Number(span)), [schemeCode, span]);
  const fund = useResource(load);

  const series = useMemo<Series[]>(() => {
    const values = fund.data?.values ?? [];
    if (values.length === 0) {
      return [];
    }
    return [
      {
        kind: "line",
        label: "Net Asset Value",
        colour: PRICE_LINE,
        width: PRICE_WIDTH,
        points: points(values),
      },
    ];
  }, [fund.data]);

  if (fund.error !== null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {fund.error}
      </p>
    );
  }

  const found = fund.data;
  const scheme = found?.scheme;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">{scheme?.name ?? schemeCode}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {scheme?.amc != null && <Badge variant="secondary">{scheme.amc}</Badge>}
          {scheme?.plan != null && <Badge variant="outline">{scheme.plan}</Badge>}
          {scheme?.option != null && <Badge variant="outline">{scheme.option}</Badge>}
        </div>
        {scheme?.category != null && (
          <p className="text-sm text-muted-foreground">{scheme.category}</p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 py-4">
            <div className="text-xs text-muted-foreground">Net Asset Value</div>
            <div className="tabular text-2xl font-semibold">{formatPrice(scheme?.nav ?? null)}</div>
            <div className="text-xs text-muted-foreground">
              As published for {formatDay(scheme?.nav_date ?? null)}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trailing Returns</CardTitle>
            <CardDescription>
              Three and five years are yearly rates, which is how funds are compared. A window the
              scheme has no history for is left blank rather than shown as nought.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Window label="1 month" value={found?.returns.one_month ?? null} />
            <Window label="3 months" value={found?.returns.three_months ?? null} />
            <Window label="1 year" value={found?.returns.one_year ?? null} />
            <Window label="3 years p.a." value={found?.returns.three_years ?? null} />
            <Window label="5 years p.a." value={found?.returns.five_years ?? null} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3" aria-labelledby="value-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="value-heading" className="text-lg font-semibold">
              NAV History
            </h2>
            <p className="text-sm text-muted-foreground">
              One value a day, as published. A fund has no sessions, no high and low and no volume —
              this is the whole of its record.
            </p>
          </div>
          <Chooser options={SPANS} chosen={span} onChange={setSpan} label="History" />
        </div>
        <Chart series={series} loading={fund.loading} empty="No values published for this scheme" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheme Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <Fact label="AMFI scheme code" value={scheme?.scheme_code ?? null} />
            <Fact label="Fund house" value={scheme?.amc ?? null} />
            <Fact label="Growth ISIN" value={scheme?.isin_growth ?? null} />
            <Fact label="Reinvestment ISIN" value={scheme?.isin_reinvestment ?? null} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

/** One window's return. */
function Window({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular text-lg font-semibold">
        {value === null ? (
          <span className="text-muted-foreground">{ABSENT}</span>
        ) : (
          <Delta value={value} />
        )}
      </div>
    </div>
  );
}

/** One stated fact about the scheme. */
function Fact({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value ?? ABSENT}</dd>
    </div>
  );
}

/**
 * Turn published values into points, dropping any that will not parse.
 *
 * @param values - The published values, oldest first.
 * @returns The points.
 */
function points(values: SchemeValue[]): { time: string; value: number }[] {
  return values.flatMap((one) => {
    const parsed = toNumber(one.nav);
    return parsed === null ? [] : [{ time: one.nav_date, value: parsed }];
  });
}
