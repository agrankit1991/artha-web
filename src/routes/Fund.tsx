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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FactList } from "@/components/FactList";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { ENTITIES } from "@/lib/entities";
import { useResource } from "@/hooks/useResource";
import { PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";

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
    return <Failed message={fund.error} />;
  }

  const found = fund.data;
  const scheme = found?.scheme;

  return (
    <div className="space-y-6">
      <PageHeader
        kind="fund"
        title={scheme?.name ?? schemeCode}
        badges={
          <>
            {scheme?.amc != null && <Badge variant="secondary">{scheme.amc}</Badge>}
            {scheme?.plan != null && <Badge variant="outline">{scheme.plan}</Badge>}
            {scheme?.option != null && <Badge variant="outline">{scheme.option}</Badge>}
          </>
        }
        identifiers={scheme?.category != null && <span>{scheme.category}</span>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Net Asset Value"
          value={formatPrice(scheme?.nav ?? null)}
          hint={`As of ${formatDay(scheme?.nav_date ?? null)}`}
        />
        <Window label="1 month" value={found?.returns.one_month ?? null} />
        <Window label="3 months" value={found?.returns.three_months ?? null} />
        <Window label="1 year" value={found?.returns.one_year ?? null} />
        <Window label="3 years" value={found?.returns.three_years ?? null} annualised />
        <Window label="5 years" value={found?.returns.five_years ?? null} annualised />
      </div>

      <section className="space-y-3" aria-labelledby="value-heading">
        <SectionHeader
          id="value-heading"
          icon={ENTITIES.index.icon}
          title="NAV History"
          description="One value a day, as published. A fund has no sessions, no high and low and no volume — this is the whole of its record."
          actions={<Chooser options={SPANS} chosen={span} onChange={setSpan} label="History" />}
        />
        <Chart series={series} loading={fund.loading} empty="No values published for this scheme" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheme Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FactList
            columns={2}
            facts={[
              { label: "AMFI scheme code", value: scheme?.scheme_code ?? null },
              { label: "Fund house", value: scheme?.amc ?? null },
              { label: "Growth ISIN", value: scheme?.isin_growth ?? null },
              { label: "Reinvestment ISIN", value: scheme?.isin_reinvestment ?? null },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One window's return, as a tile.
 *
 * The long windows are yearly rates, which is how funds are compared, and
 * the tile says so rather than leaving a three-year figure to be read as a
 * total. A window the scheme has no history for is blank, with the reason.
 */
function Window({
  label,
  value,
  annualised = false,
}: {
  label: string;
  value: string | null;
  annualised?: boolean;
}): React.JSX.Element {
  return (
    <StatTile
      label={label}
      value={value === null ? ABSENT : formatPercent(value)}
      {...(value === null
        ? { hint: "No history that far back" }
        : annualised
          ? { hint: "Yearly rate" }
          : {})}
      className={value === null ? "" : Number(value) < 0 ? "text-loss" : "text-gain"}
    />
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
