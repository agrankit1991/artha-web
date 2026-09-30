/**
 * One mutual fund scheme: what it is, what it has returned, and its record.
 *
 * A fund has no price chart in the sense the rest of this site means one.
 * There are no sessions, no high and low, no volume -- a fund publishes
 * one value a day and that is the whole of its record. So the page reads
 * that one series several ways: as ten thousand rupees growing (or the
 * value itself) with how far it sat below its own peak drawn underneath,
 * since the two are read together; as the return in each calendar year;
 * and as the one-year return on every day it could be measured. The last
 * says what kind of holding it has been: a single trailing return is one
 * draw, the rolling series is the distribution. The calendar years say
 * what the rolling line can hide: the year a fund lost money.
 */

import { useCallback, useMemo, useState } from "react";

import type { NavRescale, RollingReturn, Scheme } from "@/api/client";
import { fetchFund, fetchFunds } from "@/api/client";
import { Callout } from "@/components/Callout";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { DivergingBars } from "@/components/DivergingBars";
import { FactList } from "@/components/FactList";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SchemePlan } from "@/components/SchemePlan";
import { ShareButton } from "@/components/ShareButton";
import { SectionHeader } from "@/components/SectionHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { DRAWDOWN, OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { drawdown } from "@/lib/drawdown";
import { MARKS } from "@/lib/entities";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";
import {
  STAKE,
  type Reading,
  calendarYears,
  extremes,
  growthOfStake,
  readings,
  shortCategory,
  summariseRolling,
} from "@/lib/funds";
import { fundPath } from "@/lib/paths";

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

/** A month of published values: about as many as trading sessions in one. */
const MONTH_OF_VALUES = 22;

/** The readings of one series; the drawdown is a pane under the first two, not one of them. */
type View = "growth" | "nav" | "rolling";

const VIEWS: Tab<View>[] = [
  { key: "growth", label: "Growth of ₹10,000" },
  { key: "nav", label: "NAV" },
  { key: "rolling", label: "Rolling 1-year return" },
];

/** What falling below the peak means, said under both readings that draw it. */
const BELOW_PEAK =
  "Underneath, how far the value sat below its highest point to date: nought is a new high, and the deepest point is the worst a holder who bought at the wrong moment sat through.";

/** What each reading answers, said under the section title. */
const DESCRIPTIONS: Record<View, string> = {
  growth: `What ₹${STAKE.toLocaleString("en-IN")} put in on the first day of the window would be worth since. ${BELOW_PEAK}`,
  nav: `One value a day, as published: a fund has no sessions, no high and low and no volume. ${BELOW_PEAK}`,
  rolling:
    "The one-year return as it stood on each day. Where the line spends its time says more than where it ends.",
};

/** The main plot's height: the record is the page's centre, so it is drawn larger than the default. */
const RECORD_HEIGHT = 420;

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
      category === null
        ? Promise.resolve(null)
        : // The category's best over three years, the horizon funds are
          // compared on; the first ten by name said nothing about the fund.
          fetchFunds({ category, sort: "three_years", descending: true, limit: SIMILAR + 1 }),
    [category],
  );
  const similar = useResource(loadSimilar);

  const held = useMemo(() => readings(fund.data?.values ?? []), [fund.data]);
  const rolling = useMemo(() => fund.data?.rolling ?? [], [fund.data]);
  const series = useMemo<Series[]>(() => drawn(view, rolling, held), [view, rolling, held]);
  const range = useMemo(() => extremes(held), [held]);
  const rolled = useMemo(() => summariseRolling(fund.data?.rolling ?? []), [fund.data]);
  const years = useMemo(() => calendarYears(held), [held]);
  const rescaled = useMemo(() => rescalesDrawn(fund.data?.rescales ?? [], held), [fund.data, held]);

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
          scheme !== null && (
            <>
              {scheme.amc !== null && <Badge variant="secondary">{scheme.amc}</Badge>}
              <SchemePlan scheme={scheme} />
              {scheme.category !== null && (
                <Badge variant="outline">{shortCategory(scheme.category)}</Badge>
              )}
            </>
          )
        }
        identifiers={<span>AMFI {schemeCode}</span>}
        actions={
          scheme !== null && (
            <ShareButton
              facts={{
                title: scheme.name,
                subtitle: scheme.category ?? scheme.amc ?? "Mutual fund",
                price: formatPrice(scheme.nav),
                changePercent: toNumber(found?.returns.one_month ?? null),
                changeText: `${formatPercent(found?.returns.one_month ?? null)} over a month`,
                asOf: `NAV as of ${formatDay(scheme.nav_date)}`,
              }}
              loadPoints={() =>
                Promise.resolve(held.slice(-MONTH_OF_VALUES).map((one) => one.value))
              }
              filename={`fund-${scheme.scheme_code}`}
            />
          )
        }
      />

      <StatGrid className="sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Net asset value"
          value={formatPrice(scheme?.nav ?? null)}
          loading={found === null}
          {...(scheme === null ? {} : { hint: `As of ${formatDay(scheme.nav_date)}` })}
        />
        <Window label="1 month" value={found?.returns.one_month} />
        <Window label="3 months" value={found?.returns.three_months} />
        <Window label="1 year" value={found?.returns.one_year} />
        <Window label="3 years" value={found?.returns.three_years} annualised />
        <Window label="5 years" value={found?.returns.five_years} annualised />
      </StatGrid>

      <section className="space-y-3" aria-labelledby="record-heading">
        <SectionHeader
          id="record-heading"
          icon={MARKS.performance}
          title="NAV history"
          description={DESCRIPTIONS[view]}
          actions={<Chooser options={SPANS} chosen={span} onChange={setSpan} label="History" />}
        />
        <Tabs tabs={VIEWS} active={view} onChange={setView} label="Reading">
          <Chart
            series={series}
            scale={view === "rolling" ? "percent" : "price"}
            height={RECORD_HEIGHT}
            loading={fund.loading}
            empty="No values published for this scheme"
          />
        </Tabs>
        {rescaled.length > 0 && (
          <Callout tone="info">
            The value per unit changed scale on{" "}
            {rescaled.map((one) => formatDay(one.nav_date)).join(", ")} (a unit split or a new face
            value, not a gain or a loss). Values before it are drawn in today&apos;s unit, as the
            returns are measured, so they differ from what AMFI published then.
          </Callout>
        )}
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
          />
          {/* Days, not years: the share of days whose trailing year was a gain.
              It was labelled "Years positive", which it never measured. */}
          <StatTile
            label="Positive one-year returns"
            value={rolled === null ? ABSENT : `${rolled.positive.toFixed(0)}% of days`}
            hint={
              rolled === null
                ? "Less than a year of values"
                : `Median one-year return ${formatPercent(String(rolled.median))}`
            }
          />
        </div>
      )}

      {years.length > 0 && (
        <section className="space-y-3" aria-labelledby="years-heading">
          <SectionHeader
            id="years-heading"
            icon={MARKS.returns}
            title="Calendar-year returns"
            description="Each calendar year in the window, from one year-end to the next, and the running year to date. The rolling line can hide the year a fund lost money; this cannot."
          />
          <Card>
            <CardContent>
              <DivergingBars
                label="Return in each calendar year"
                rows={years.map((one) => ({
                  label: one.toDate ? `${String(one.year)} to date` : String(one.year),
                  value: one.value,
                }))}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {rolled !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rolling one-year returns</CardTitle>
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
                  label: "Best one-year return",
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
                  label: "Worst one-year return",
                  value: (
                    <span>
                      <Delta value={String(rolled.worst.value)} />{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        to {formatDay(rolled.worst.day)}
                      </span>
                    </span>
                  ),
                },
                {
                  label: "Median one-year return",
                  value: <Delta value={String(rolled.median)} />,
                },
                { label: "Days it was positive", value: `${rolled.positive.toFixed(0)}%` },
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
              Similar schemes
            </CardTitle>
            <CardDescription>
              The schemes in {shortCategory(category)} that have returned most over three years, a
              year. A fund&rsquo;s direct and regular plans can sit side by side here, which is the
              cleanest view of what a distributor&rsquo;s commission costs.
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
          <CardTitle className="text-base">Scheme details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* The fund house, plan, option and short category are the header's badges. */}
          <FactList
            columns={2}
            facts={[
              { label: "AMFI category", value: scheme?.category ?? null },
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
        belowPeak(held),
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
        belowPeak(held),
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
 * How far below its peak the value sat, as a pane under the main plot.
 *
 * @param held - The values, oldest first.
 * @returns The series, in per cent, in the first pane under the plot.
 */
function belowPeak(held: Reading[]): Series {
  return {
    kind: "area",
    label: "Below peak",
    colour: DRAWDOWN,
    pane: 1,
    scale: "percent",
    points: drawdown(held).map((one) => ({ time: one.day, value: one.value })),
  };
}

/**
 * One window's return, as a tile.
 *
 * The long windows are yearly rates, which is how funds are compared, and
 * the tile says so rather than leaving a three-year figure to be read as a
 * total. A window the scheme has no history for is blank, with the reason;
 * one still on its way is a placeholder, not that reason.
 */
function Window({
  label,
  value,
  annualised = false,
}: {
  label: string;
  /** The return; null when the scheme has no history that far back, undefined while it loads. */
  value: string | null | undefined;
  annualised?: boolean;
}): React.JSX.Element {
  const hint =
    value === undefined
      ? {}
      : value === null
        ? { hint: "No history that far back" }
        : annualised
          ? { hint: "Yearly rate" }
          : {};
  return (
    <StatTile
      label={label}
      value={value == null ? ABSENT : <Delta value={value} />}
      loading={value === undefined}
      {...hint}
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
      {
        id: "plan",
        header: "Plan",
        enableSorting: false,
        cell: ({ row }) => <SchemePlan scheme={row.original} />,
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

/**
 * The rescales that fall inside the window drawn, which the chart's
 * earlier values were redrawn across.
 *
 * @param rescales - Every day the scheme's value changed unit.
 * @param held - The values drawn, oldest first.
 * @returns Those after the first value drawn, oldest first.
 */
function rescalesDrawn(rescales: NavRescale[], held: Reading[]): NavRescale[] {
  const first = held[0];
  return first === undefined ? [] : rescales.filter((one) => one.nav_date > first.day);
}
