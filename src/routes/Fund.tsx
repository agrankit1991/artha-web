/**
 * One mutual fund scheme: what it is, what it has returned, and its record.
 *
 * A fund has no price chart in the sense the rest of this site means one.
 * There are no sessions, no high and low, no volume -- a fund publishes
 * one value a day and that is the whole of its record. So the page reads
 * that one series four ways: as ten thousand rupees growing, as the value
 * itself, as how far it sat below its own peak, and as the one-year return
 * on every day it could be measured. The last is the one that says what
 * kind of holding it has been: a single trailing return is one draw, the
 * rolling series is the distribution.
 */

import { useCallback, useMemo, useState } from "react";

import type { RollingReturn, Scheme } from "@/api/client";
import { fetchFund, fetchFunds } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { FactList } from "@/components/FactList";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { CANDLE_DOWN, OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";
import {
  STAKE,
  type Reading,
  drawdown,
  extremes,
  growthOfStake,
  readings,
  summariseRolling,
} from "@/lib/funds";
import { fundPath } from "@/lib/paths";
import { shortCategory } from "@/routes/Funds";

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

/** The four readings of one series. */
type View = "growth" | "nav" | "drawdown" | "rolling";

const VIEWS: Tab<View>[] = [
  { key: "growth", label: "Growth of ₹10,000" },
  { key: "nav", label: "NAV" },
  { key: "drawdown", label: "Drawdown" },
  { key: "rolling", label: "Rolling 1-year return" },
];

/** What each reading answers, said under the section title. */
const DESCRIPTIONS: Record<View, string> = {
  growth: `What ₹${STAKE.toLocaleString("en-IN")} put in on the first day of the window would be worth since.`,
  nav: "One value a day, as published. A fund has no sessions, no high and low and no volume — this is the whole of its record.",
  drawdown:
    "How far the value sat below its highest point to date. Nought is a new high; the deepest point is the worst a holder who bought at the wrong moment sat through.",
  rolling:
    "The one-year return as it stood on each day. Where the line spends its time says more than where it ends.",
};

/** How many similar schemes to show. */
const SIMILAR = 10;

/**
 * Render the page.
 *
 * @param props - Which scheme to show.
 * @returns The page.
 */
export function Fund({ schemeCode }: FundProps): React.JSX.Element {
  const [span, setSpan] = useState(DEFAULT_SPAN);
  // Ten thousand rupees growing is the reading anybody opens a fund page
  // with; the others are one tab away.
  const [view, setView] = useState<View>("growth");

  const load = useCallback(() => fetchFund(schemeCode, Number(span)), [schemeCode, span]);
  const fund = useResource(load);
  const scheme = fund.data?.scheme ?? null;
  const category = scheme?.category ?? null;

  const loadSimilar = useCallback(
    () =>
      category === null ? Promise.resolve(null) : fetchFunds({ category, limit: SIMILAR + 1 }),
    [category],
  );
  const similar = useResource(loadSimilar);

  const held = useMemo(() => readings(fund.data?.values ?? []), [fund.data]);
  const rolling = useMemo(() => fund.data?.rolling ?? [], [fund.data]);
  const series = useMemo<Series[]>(() => drawn(view, rolling, held), [view, rolling, held]);
  const range = useMemo(() => extremes(held), [held]);
  const rolled = useMemo(() => summariseRolling(fund.data?.rolling ?? []), [fund.data]);

  if (fund.error !== null) {
    return <Failed message={fund.error} />;
  }

  const found = fund.data;

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

      <section className="space-y-3" aria-labelledby="record-heading">
        <SectionHeader
          id="record-heading"
          icon={ENTITIES.index.icon}
          title="NAV History"
          description={DESCRIPTIONS[view]}
          actions={<Chooser options={SPANS} chosen={span} onChange={setSpan} label="History" />}
        />
        <Tabs tabs={VIEWS} active={view} onChange={setView} label="Reading">
          <Chart
            series={series}
            scale={view === "growth" || view === "nav" ? "price" : "percent"}
            loading={fund.loading}
            empty="No values published for this scheme"
          />
        </Tabs>
      </section>

      {range !== null && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Highest in window"
            value={formatPrice(String(range.high.value))}
            hint={formatDay(range.high.day)}
          />
          <StatTile
            label="Lowest in window"
            value={formatPrice(String(range.low.value))}
            hint={formatDay(range.low.day)}
          />
          <StatTile
            label="Deepest fall from a peak"
            value={formatPercent(String(range.deepest.value))}
            hint={`Bottomed ${formatDay(range.deepest.day)}`}
            className="text-loss"
          />
          <StatTile
            label="Years positive"
            value={rolled === null ? ABSENT : `${rolled.positive.toFixed(0)}%`}
            hint={
              rolled === null
                ? "Less than a year of values"
                : `of days, rolling one year; median ${formatPercent(String(rolled.median))}`
            }
          />
        </div>
      )}

      {rolled !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rolling One-Year Returns</CardTitle>
            <CardDescription>
              The one-year return on every day it could be measured. A trailing figure is one draw;
              this is the distribution it was drawn from, and it says what kind of holding the fund
              has been.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FactList
              columns={2}
              facts={[
                {
                  label: "Best year",
                  value: (
                    <span>
                      <Delta value={String(rolled.best.value)} />{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        to {formatDay(rolled.best.day)}
                      </span>
                    </span>
                  ),
                },
                {
                  label: "Worst year",
                  value: (
                    <span>
                      <Delta value={String(rolled.worst.value)} />{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        to {formatDay(rolled.worst.day)}
                      </span>
                    </span>
                  ),
                },
                { label: "Median year", value: <Delta value={String(rolled.median)} /> },
                { label: "Share of years positive", value: `${rolled.positive.toFixed(0)}%` },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {category !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MARKS.peers aria-hidden="true" className="h-4 w-4 text-primary" />
              Similar Schemes
            </CardTitle>
            <CardDescription>
              Other schemes in {shortCategory(category)}, with what they have returned. The direct
              and regular plans of one fund sit side by side here, which is the cleanest view of
              what a distributor&rsquo;s commission costs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Similar
              schemes={(similar.data?.items ?? []).filter((one) => one.scheme_code !== schemeCode)}
              loading={similar.loading}
            />
          </CardContent>
        </Card>
      )}

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
              { label: "Category", value: scheme?.category ?? null },
              { label: "Plan", value: scheme?.plan ?? null },
              { label: "Option", value: scheme?.option ?? null },
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
 * Build the series for one reading.
 *
 * @param view - Which reading.
 * @param rolling - Its rolling one-year returns.
 * @param held - Its values, parsed.
 * @returns The series to draw.
 */
function drawn(view: View, rolling: RollingReturn[], held: Reading[]): Series[] {
  if (held.length === 0) {
    return [];
  }
  switch (view) {
    case "growth":
      return [
        {
          kind: "area",
          label: "Value of ₹10,000",
          colour: PRICE_LINE,
          points: growthOfStake(held).map((one) => ({ time: one.day, value: one.value })),
        },
      ];
    case "nav":
      return [
        {
          kind: "line",
          label: "NAV",
          colour: PRICE_LINE,
          width: PRICE_WIDTH,
          points: held.map((one) => ({ time: one.day, value: one.value })),
        },
      ];
    case "drawdown":
      return [
        {
          kind: "area",
          label: "Below peak",
          colour: CANDLE_DOWN,
          points: drawdown(held).map((one) => ({ time: one.day, value: one.value })),
        },
      ];
    case "rolling": {
      const points = rolling.flatMap((one) => {
        const value = toNumber(one.percent);
        return value === null ? [] : [{ time: one.nav_date, value }];
      });
      return points.length === 0
        ? []
        : [
            {
              kind: "line",
              label: "One-year return",
              colour: OSCILLATOR,
              width: PRICE_WIDTH,
              thresholds: [{ value: 0 }],
              points,
            },
          ];
    }
  }
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

/** Other schemes in the same category, each leading to its own page. */
function Similar({ schemes, loading }: { schemes: Scheme[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Scheme>[]>(
    () => [
      {
        id: "name",
        header: "Scheme",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.amc ?? ABSENT}
            </div>
          </div>
        ),
      },
      returnColumn("one_year", "1Y"),
      returnColumn("three_years", "3Y p.a."),
      returnColumn("five_years", "5Y p.a."),
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      rows={schemes}
      loading={loading}
      empty="No other scheme in this category has a value on record"
      placeholderRows={4}
      label="Similar schemes"
      linkTo={(row) => fundPath(row.scheme_code)}
    />
  );
}

/** A column of one window's returns, coloured, unpublished last. */
function returnColumn(field: keyof Scheme["returns"], header: string): Column<Scheme> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row.returns[field]) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) =>
      row.original.returns[field] === null ? (
        <span className="text-muted-foreground">{ABSENT}</span>
      ) : (
        <Delta value={row.original.returns[field]} />
      ),
    meta: { align: "right" },
  };
}
