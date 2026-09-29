/**
 * One company: what it is, how it is doing, and what it has reported.
 *
 * The sibling of the index and sector page, and deliberately the same
 * shape: what the thing is, how it reads against what it should be
 * measured by, then the detail. A reader who has learnt one has learnt
 * the other.
 *
 * The detail sits behind tabs -- Overview, Financials, Shareholding,
 * Corporate Actions, News -- because a company page that answers every
 * question at once answers none of them above the fold. The overview
 * carries the price, the valuation and the comparison; everything a
 * reader scrolls for is one click away instead.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type {
  Company as CompanyDetail,
  Comparison,
  CorporateAction,
  CorporateActionKind,
  InstrumentOverview,
  KnownSymbol,
  Member,
} from "@/api/client";
import {
  fetchCompany,
  fetchCorporateActions,
  fetchDeals,
  fetchDelivery,
  fetchExternalSymbols,
  fetchFigures,
  fetchPriceBands,
  fetchFundamentals,
  fetchNews,
  fetchOverviewHistory,
  fetchOverviews,
  fetchSeries,
  fetchValuation,
  fetchValuationHistory,
} from "@/api/client";
import { Callout } from "@/components/Callout";
import { Chooser } from "@/components/Chooser";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { CorporateActions } from "@/components/CorporateActions";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { DivergingBars } from "@/components/DivergingBars";
import { Menu, MenuItem } from "@/components/Menu";
import { Failed } from "@/components/Failed";
import { Financials } from "@/components/Financials";
import { GrowthChart, ShareholdingChart } from "@/components/FundamentalsChart";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { NewsFeed } from "@/components/NewsFeed";
import { DealsTable } from "@/components/DealsTable";
import { DeliveryCard } from "@/components/DeliveryCard";
import { InstrumentHeader } from "@/components/InstrumentHeader";
import { MomentumChip, SizeBadge } from "@/components/Standing";
import { PriceChart } from "@/components/PriceChart";
import { RangeSelector } from "@/components/RangeSelector";
import { PRICE_RANGES } from "@/lib/priceRanges";
import { SectionHeader } from "@/components/SectionHeader";
import { StatementTable } from "@/components/StatementTable";
import { type Tab, Tabs } from "@/components/Tabs";
import { ValuationHistoryChart } from "@/components/ValuationHistoryChart";
import { ValuationPanel } from "@/components/ValuationPanel";
import { SessionPicker } from "@/components/SessionPicker";
import { ShareButton } from "@/components/ShareButton";
import { WatchButton } from "@/components/WatchButton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartRange } from "@/hooks/useChartRange";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { coloured } from "@/lib/chartPalette";
import { MARKS } from "@/lib/entities";
import {
  ABSENT,
  formatDay,
  formatPercent,
  formatPercentagePoints,
  formatPrice,
  formatVolume,
  toNumber,
  todayInIndia,
} from "@/lib/format";
import { monthOfCloses } from "@/lib/sharing";
import { companyPath, comparePath, newsPath, populationPath } from "@/lib/paths";

interface CompanyProps {
  /** The company's listing on either exchange. Both reach this page. */
  instrumentKey: string;
}

/** Three years: the annual statements are broadly held for four, and the run starts when the first became public. */
const DEFAULT_SPAN = 3;

/** How many articles the page shows before sending a reader to the feed. */
const HEADLINES = 6;

/** Which view of the chart is showing. */
type View = "compare" | "price";

const VIEWS: Tab<View>[] = [
  { key: "price", label: "Price" },
  { key: "compare", label: "Relative strength" },
];

/** The parts of the page. */
type Part = "overview" | "financials" | "shareholding" | "actions" | "news";

const PARTS: Tab<Part>[] = [
  { key: "overview", label: "Overview" },
  { key: "financials", label: "Financials" },
  { key: "shareholding", label: "Shareholding" },
  { key: "actions", label: "Corporate actions" },
  { key: "news", label: "News" },
];

/**
 * Render the page.
 *
 * @param props - Which company to show.
 * @returns The page.
 */
export function Company({ instrumentKey }: CompanyProps): React.JSX.Element {
  const [sessions, setSessions] = useChartRange();
  const [view, setView] = useState<View>("price");
  // The tab and the session are in the address: a company's financials
  // are a link, and Back from a peer returns to the tab it was opened from.
  const [chosenPart, setPart] = useSearchParam("tab", "overview");
  const part = PARTS.find((one) => one.key === chosenPart)?.key ?? "overview";
  const [chosenDay, setChosenDay] = useSearchParam("as_of");
  const asOf = chosenDay === "" ? null : chosenDay;
  const setAsOf = (next: string | null): void => {
    setChosenDay(next ?? "");
  };
  // A tab's data is read when the tab is first opened, and kept: fourteen
  // requests on arrival was most of them for tabs never opened.
  const [opened, setOpened] = useState<ReadonlySet<Part>>(() => new Set([part]));
  useEffect(() => {
    setOpened((held) => (held.has(part) ? held : new Set([...held, part])));
  }, [part]);
  // How far back the valuation ratios are drawn, in years.
  const [span, setSpan] = useState(DEFAULT_SPAN);

  const load = useCallback(() => fetchCompany(instrumentKey), [instrumentKey]);
  const company = useResource(load);

  // Everything below keys off the company's preferred listing rather than
  // the key in the address bar, so a page reached by its BSE listing still
  // charts and reports the one series the rest of the platform uses.
  const key = company.data?.instrument_key ?? null;
  const wantsStatements = opened.has("financials") || opened.has("shareholding");
  const wantsActions = opened.has("actions");
  const wantsNews = opened.has("news");

  const loadOverview = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchOverviews([key], asOf)),
    [key, asOf],
  );
  const loadFigureHistory = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchOverviewHistory(key)),
    [key],
  );
  const loadValuation = useCallback(
    () => (key === null ? Promise.resolve(null) : fetchValuation(key)),
    [key],
  );
  const loadChart = useCallback(
    () => (key === null ? Promise.resolve(null) : fetchFigures(key, sessions)),
    [key, sessions],
  );
  const loadForecast = useCallback(
    () => (key === null ? Promise.resolve(null) : fetchPriceBands(key)),
    [key],
  );
  const loadHistory = useCallback(
    () => (key === null ? Promise.resolve(null) : fetchValuationHistory(key, span)),
    [key, span],
  );
  const loadStatements = useCallback(
    () => (key === null || !wantsStatements ? Promise.resolve(null) : fetchFundamentals(key)),
    [key, wantsStatements],
  );
  const loadActions = useCallback(
    () => (key === null || !wantsActions ? Promise.resolve(null) : fetchCorporateActions(key)),
    [key, wantsActions],
  );
  const loadNews = useCallback(
    () =>
      key === null || !wantsNews
        ? Promise.resolve(null)
        : fetchNews({ instrumentKey: key, limit: HEADLINES }),
    [key, wantsNews],
  );
  const loadDelivery = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchDelivery(key, DELIVERY_SESSIONS)),
    [key],
  );
  const loadDeals = useCallback(
    () =>
      key === null ? Promise.resolve([]) : fetchDeals({ instrumentKey: key, days: DEAL_DAYS }),
    [key],
  );
  const overview = useResource(loadOverview);
  const figureHistory = useResource(loadFigureHistory);
  const valuation = useResource(loadValuation);
  const valuationHistory = useResource(loadHistory);
  const chart = useResource(loadChart);
  const forecast = useResource(loadForecast);
  const statements = useResource(loadStatements);
  const actions = useResource(loadActions);
  const news = useResource(loadNews);
  const delivery = useResource(loadDelivery);
  const deals = useResource(loadDeals);

  const lines = useMemo<ChartLine[]>(() => {
    const found = company.data;
    if (found === null || key === null) {
      return [];
    }
    const drawn = [
      { instrumentKey: key, label: found.symbol },
      ...(found.performance?.against ?? []).flatMap((one) =>
        one.instrument_key === null
          ? []
          : [{ instrumentKey: one.instrument_key, label: one.label }],
      ),
    ];
    return coloured(drawn).map((one, position) => ({ ...one, subdued: position > 0 }));
  }, [company.data, key]);

  const loadSymbols = useCallback(
    () =>
      lines.length === 0
        ? Promise.resolve<Record<string, KnownSymbol>>({})
        : fetchExternalSymbols(lines.map((line) => line.instrumentKey)),
    [lines],
  );
  const loadComparison = useCallback(
    () =>
      lines.length === 0
        ? Promise.resolve(null)
        : fetchSeries(
            lines.map((line) => line.instrumentKey),
            sessions,
          ),
    [lines, sessions],
  );
  const symbols = useResource(loadSymbols);
  const comparison = useResource(loadComparison);

  const shareholding = useMemo(
    () => (statements.data ?? []).find((one) => one.statement === "SHAREHOLDING") ?? null,
    [statements.data],
  );

  if (company.error !== null) {
    return <Failed message={company.error} />;
  }

  const found = company.data;
  const own = overview.data?.[0] ?? null;
  const hasDelivery = (delivery.data ?? []).length > 0;
  const hasDeals = (deals.data ?? []).length > 0;

  return (
    <div className="space-y-6">
      <InstrumentHeader
        name={found?.name ?? null}
        badges={found !== null && <CompanyBadges company={found} overview={own} />}
        {...(found === null
          ? {}
          : { subline: <span className="font-mono">ISIN {found.isin}</span> })}
        overview={own}
        description={found?.description}
        actions={
          found !== null &&
          key !== null && (
            <span className="flex flex-wrap items-center gap-2">
              <ShareButton
                facts={{
                  title: found.name,
                  subtitle: `${found.listings[0]?.exchange ?? "NSE"}: ${found.symbol}`,
                  price: formatPrice(own?.day.close),
                  changePercent: toNumber(own?.day.change_percent),
                  changeText: formatPercent(own?.day.change_percent),
                  asOf: `As of ${formatDay(own?.as_of)}`,
                }}
                loadPoints={() => monthOfCloses(key)}
                filename={found.symbol.toLowerCase()}
              />
              <Button variant="outline" size="sm" asChild>
                <Link to={comparePath([key])}>
                  <MARKS.compare aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  Compare
                </Link>
              </Button>
              <WatchButton instrumentKey={key} symbol={found.symbol} />
            </span>
          )
        }
      />

      <SessionPicker asOf={asOf} onChange={setAsOf} />
      {asOf !== null && (
        // Said plainly, because only part of the page can go back in time.
        <Callout tone="info">
          Read as of {formatDay(asOf)}: the level, its ranges and the key figures. The chart,
          valuation, trading activity and peers show the latest.
        </Callout>
      )}

      <Tabs tabs={PARTS} active={part} onChange={setPart} label="Company">
        {part === "overview" && (
          <div className="space-y-8">
            {found !== null && key !== null && (
              <section className="space-y-3" aria-labelledby="price-heading">
                <SectionHeader
                  id="price-heading"
                  icon={MARKS.price}
                  title="Price & performance"
                  description={
                    view === "compare"
                      ? "Against the market and the size bands, all rebased to the first session they share."
                      : "Its own sessions, with this platform's moving averages over them."
                  }
                  actions={
                    <RangeSelector
                      ranges={PRICE_RANGES}
                      sessions={sessions}
                      onChange={setSessions}
                      label="History"
                    />
                  }
                />
                <Tabs tabs={VIEWS} active={view} onChange={setView} label="Chart">
                  {view === "price" ? (
                    chart.error !== null ? (
                      <Failed message={chart.error} />
                    ) : (
                      <PriceChart
                        points={chart.data?.points ?? null}
                        forecast={forecast.data ?? null}
                        loading={chart.loading}
                        instrument={{
                          label: found.symbol,
                          symbol: symbols.data?.[key]?.symbol,
                          derived: symbols.data?.[key]?.derived,
                        }}
                      />
                    )
                  ) : comparison.error !== null ? (
                    <Failed message={comparison.error} />
                  ) : (
                    <ComparisonChart
                      series={comparison.data}
                      lines={lines}
                      symbols={symbols.data ?? {}}
                      loading={comparison.loading}
                    />
                  )}
                </Tabs>
              </section>
            )}

            <section className="space-y-3" aria-labelledby="figures-heading">
              <SectionHeader
                id="figures-heading"
                icon={MARKS.figures}
                title="Key figures"
                description="What it has returned, where it stands in its year and its trend, and how it is trading. The level and its ranges are in the header."
              />
              {overview.error !== null ? (
                <Failed message={overview.error} />
              ) : (
                <InstrumentFigures
                  overview={own}
                  loading={overview.loading}
                  history={figureHistory.data ?? []}
                />
              )}
            </section>

            <section className="space-y-4" aria-labelledby="valuation-heading">
              <SectionHeader
                id="valuation-heading"
                icon={MARKS.financials}
                title="Valuation"
                description="What the company is worth against what it earns, owns and pays, worked out from the stored price, statements and dividends; and how those multiples have run."
              />
              {valuation.error !== null ? (
                <Failed message={valuation.error} />
              ) : (
                <ValuationPanel valuation={valuation.data} loading={valuation.loading} />
              )}
              {valuationHistory.error !== null ? (
                <Failed message={valuationHistory.error} />
              ) : (
                <ValuationHistoryChart
                  history={valuationHistory.data}
                  loading={valuationHistory.loading}
                  years={span}
                  onYears={setSpan}
                />
              )}
            </section>

            {found !== null && (found.performance != null || found.peers.length > 0) && (
              <section className="space-y-4" aria-labelledby="against-heading">
                <SectionHeader
                  id="against-heading"
                  icon={MARKS.performance}
                  title="Against the market"
                  description="How far ahead or behind it has run the market and its own sector, and the companies it competes with."
                />
                {found.performance != null && found.performance.against.length > 0 && (
                  <AgainstTheMarket comparisons={found.performance.against} />
                )}
                {found.peers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MARKS.peers aria-hidden="true" className="h-4 w-4 text-primary" />
                        Peers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Peers peers={found.peers} loading={company.loading} />
                    </CardContent>
                  </Card>
                )}
              </section>
            )}

            {(hasDelivery || hasDeals || delivery.error !== null || deals.error !== null) && (
              <section className="space-y-4" aria-labelledby="trading-heading">
                <SectionHeader
                  id="trading-heading"
                  icon={MARKS.deals}
                  title="Trading activity"
                  description="How much of what traded was taken for delivery, and the large deals disclosed in the last year."
                />
                {delivery.error !== null ? (
                  <Failed message={delivery.error} />
                ) : (
                  <DeliveryCard days={delivery.data ?? []} />
                )}
                {deals.error !== null ? (
                  <Failed message={deals.error} />
                ) : (
                  hasDeals && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Bulk & block deals</CardTitle>
                        <CardDescription>Disclosed in the last year.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DealsTable deals={deals.data ?? []} forCompany label="Company deals" />
                      </CardContent>
                    </Card>
                  )
                )}
              </section>
            )}
          </div>
        )}

        {part === "financials" && (
          <div className="space-y-6">
            {statements.error !== null ? (
              <Failed message={statements.error} />
            ) : (
              <>
                <section className="space-y-3" aria-labelledby="growth-heading">
                  <SectionHeader
                    id="growth-heading"
                    icon={MARKS.financials}
                    title="Revenue & profit"
                    description="Every year reported, in rupees crore. A table says what each year was; the line says whether the years are going anywhere."
                  />
                  <GrowthChart statements={statements.data} loading={statements.loading} />
                </section>
                <Card>
                  <CardHeader>
                    <CardTitle>Financial statements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Financials statements={statements.data} loading={statements.loading} />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {part === "shareholding" && (
          <div className="space-y-6">
            {statements.error !== null ? (
              <Failed message={statements.error} />
            ) : (
              <>
                <section className="space-y-3" aria-labelledby="holders-heading">
                  <SectionHeader
                    id="holders-heading"
                    icon={MARKS.holders}
                    title="Shareholding pattern"
                    description="Who has owned the company, quarter by quarter, in per cent. Promoters selling down and institutions building are the movements worth watching."
                  />
                  <ShareholdingChart statements={statements.data} loading={statements.loading} />
                </section>
                <Card>
                  <CardHeader>
                    <CardTitle>As filed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatementTable
                      statement={shareholding}
                      loading={statements.loading}
                      empty="No shareholding pattern filed for this company"
                      label="Shareholding pattern"
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {part === "actions" &&
          (actions.error !== null ? (
            <Failed message={actions.error} />
          ) : (
            <ActionsByKind actions={actions.data} loading={actions.loading} />
          ))}

        {part === "news" && (
          <section className="space-y-3" aria-labelledby="news-heading">
            <SectionHeader id="news-heading" icon={MARKS.news} title="News" />
            {news.error !== null ? (
              <Failed message={news.error} />
            ) : (
              <NewsFeed items={news.data?.items ?? null} loading={news.loading} />
            )}
            {found !== null && (news.data?.total ?? 0) > HEADLINES && (
              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <Link to={newsPath(found.instrument_key, found.symbol)}>
                    All news for {found.symbol} ›
                  </Link>
                </Button>
              </div>
            )}
          </section>
        )}
      </Tabs>
    </div>
  );
}

/** What each kind of event is called in the chooser, "all" first. */
const KINDS: { key: "ALL" | CorporateActionKind; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DIVIDEND", label: "Dividends" },
  { key: "BONUS", label: "Bonuses" },
  { key: "SPLIT", label: "Splits" },
  { key: "RIGHTS", label: "Rights" },
  { key: "OTHER", label: "Other" },
];

/**
 * The corporate events, narrowed to one kind when asked.
 *
 * The previous project kept a dividend history, a bonus history and a
 * split history as separate cards. One table with a chooser is the same
 * reading in less room, and keeps the dates of different kinds in one
 * order when nothing is chosen.
 */
function ActionsByKind({
  actions,
  loading,
}: {
  actions: CorporateAction[] | null;
  loading: boolean;
}): React.JSX.Element {
  const [kind, setKind] = useState<"ALL" | CorporateActionKind>("ALL");
  // What is still to come, soonest first -- the part a holder has to act
  // on -- and what has been, each listed once: the upcoming ones used to
  // appear again among a year of history.
  const { upcoming, past } = useMemo(() => {
    const today = todayInIndia();
    const chosen = (actions ?? []).filter((one) => kind === "ALL" || one.kind === kind);
    return {
      upcoming: chosen
        .filter((one) => one.ex_date >= today)
        .sort((first, second) => first.ex_date.localeCompare(second.ex_date)),
      past: chosen.filter((one) => one.ex_date < today),
    };
  }, [actions, kind]);
  return (
    <div className="space-y-3">
      <SectionHeader
        icon={MARKS.dates}
        title="Corporate actions"
        description="Dividends, bonuses, splits and rights. A price chart that looks broken on a date is usually explained here."
        actions={<Chooser options={KINDS} chosen={kind} onChange={setKind} label="Kind" />}
      />
      {upcoming.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MARKS.dates aria-hidden="true" className="h-4 w-4 text-primary" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CorporateActions actions={upcoming} label="Upcoming corporate actions" />
          </CardContent>
        </Card>
      )}
      <CorporateActions actions={past} loading={loading} />
    </div>
  );
}

/** The windows a comparison is read over, in the order they are read. */
const WINDOWS: { key: keyof Comparison["relative"]; label: string }[] = [
  { key: "one_week", label: "1W" },
  { key: "one_month", label: "1M" },
  { key: "three_months", label: "3M" },
  { key: "six_months", label: "6M" },
  { key: "one_year", label: "1Y" },
  { key: "year_to_date", label: "YTD" },
];

/**
 * How far ahead or behind the company has run each population it is
 * measured against, window by window, as bars either side of nought.
 *
 * Bars rather than the table it was, because the question is a shape --
 * ahead over the week and behind over the year, say -- and one scale for
 * every population, so a bar's length means the same beside each.
 */
function AgainstTheMarket({ comparisons }: { comparisons: Comparison[] }): React.JSX.Element {
  const gaps = comparisons.map((one) => ({
    comparison: one,
    rows: WINDOWS.flatMap((window) => {
      const value = toNumber(one.relative[window.key]);
      return value === null ? [] : [{ label: window.label, value }];
    }),
  }));
  const reach = Math.max(
    ...gaps.flatMap((one) => one.rows.map((row) => Math.abs(row.value))),
    Number.EPSILON,
  );
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {gaps.map(({ comparison, rows }) => (
        <Card key={`${comparison.scope_kind}:${comparison.scope_key}`}>
          <CardHeader>
            <CardTitle>
              Against{" "}
              <Link
                to={populationPath(
                  comparison.scope_kind === "sector" ? "sector" : "index",
                  comparison.scope_key,
                )}
                viewTransition
                className="text-primary hover:underline"
              >
                {comparison.label}
              </Link>
            </CardTitle>
            <CardDescription>
              {comparison.role}; in percentage points, ahead above nought.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to measure it against yet</p>
            ) : (
              <DivergingBars
                rows={rows}
                reach={reach}
                format={formatPercentagePoints}
                label={`Ahead of or behind ${comparison.label}`}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** The competitors, as a list of companies each leading to its own page. */
function Peers({ peers, loading }: { peers: Member[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Member>[]>(
    () => [
      symbolColumn((row) => row),
      nameColumn((row) => row),
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.close),
        meta: { align: "right" },
      },
      move("change_percent", "Change"),
      move("one_month", "1M"),
      move("three_months", "3M"),
      move("one_year", "1Y"),
      {
        id: "from_high_percent",
        header: "From high",
        accessorFn: (row) => toNumber(row.from_high_percent) ?? Number.NEGATIVE_INFINITY,
        // A distance, not a fall.
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {formatPercent(row.original.from_high_percent)}
          </span>
        ),
        meta: { align: "right" },
      },
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.volume),
        meta: { align: "right" },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={peers}
      loading={loading}
      empty="No peers recorded for this company"
      placeholderRows={5}
      label="Peers"
      linkTo={(row) => companyPath(row.instrument_key, row.symbol)}
    />
  );
}

/** A column of percentage moves, coloured by direction; none sorts last. */
function move(
  field: "change_percent" | "one_month" | "three_months" | "one_year",
  header: string,
): Column<Member> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row[field]) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) =>
      row.original[field] === null ? ABSENT : <Delta value={row.original[field]} />,
    meta: { align: "right" },
  };
}

/** How close to a 52-week extreme a close must be for the header to say so. */
const NEAR_EXTREME_PERCENT = 2;

/** The previous project's tint for the badges that say where a company trades. */
const TINTED = "bg-primary/10 text-primary";

/**
 * Where a company trades and what it belongs to, as header badges: each
 * listing, its size and momentum, its sector, the indices holding it (one
 * chip that opens the list, where two names and "+N more" used to repeat
 * a card lower down), and whether it sits near a 52-week extreme.
 */
function CompanyBadges({
  company,
  overview,
}: {
  company: CompanyDetail;
  overview: InstrumentOverview | null;
}): React.JSX.Element {
  const navigate = useNavigate();
  const fromHigh = toNumber(overview?.year_range.from_high_percent);
  const fromLow = toNumber(overview?.year_range.from_low_percent);
  return (
    <>
      {company.listings.map((listing) => (
        <Badge key={listing.instrument_key} variant="outline" className={cn(TINTED, "font-mono")}>
          {listing.exchange}: {listing.symbol}
        </Badge>
      ))}
      <SizeBadge bucket={company.size_bucket} rank={company.size_rank} />
      <MomentumChip score={company.momentum_score} />
      {company.sector != null && (
        <Link to={populationPath("sector", company.sector)} viewTransition>
          <Badge variant="outline" className="hover:bg-muted">
            {company.sector}
          </Badge>
        </Link>
      )}
      {company.indices.length > 0 && (
        <Menu
          // Named as it reads, so the words a reader sees are the words heard.
          label={`In ${String(company.indices.length)} ${company.indices.length === 1 ? "index" : "indices"}`}
          align="start"
          trigger={
            <Badge variant="secondary" className="hover:bg-secondary/70">
              In {company.indices.length} {company.indices.length === 1 ? "index" : "indices"}
            </Badge>
          }
        >
          {(close) =>
            company.indices.map((one) => (
              <MenuItem
                key={one.instrument_key}
                onSelect={() => {
                  close();
                  void navigate(populationPath("index", one.instrument_key));
                }}
              >
                {one.name}
              </MenuItem>
            ))
          }
        </Menu>
      )}
      {/* Both extremes are "worth a look", not good news or bad. */}
      {fromHigh !== null && fromHigh >= -NEAR_EXTREME_PERCENT && (
        <Badge variant="outline" className={CAUTION}>
          Near 52W high
        </Badge>
      )}
      {fromLow !== null && fromLow <= NEAR_EXTREME_PERCENT && (
        <Badge variant="outline" className={CAUTION}>
          Near 52W low
        </Badge>
      )}
    </>
  );
}

const CAUTION = "border-caution/40 bg-caution/10 text-caution";

/** How many sessions of delivery the page reads. */
const DELIVERY_SESSIONS = 60;

/** How far back the page lists a company's deals, in days. */
const DEAL_DAYS = 365;
