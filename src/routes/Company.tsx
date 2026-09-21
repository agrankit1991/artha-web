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

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type {
  Comparison,
  CorporateAction,
  CorporateActionKind,
  KnownSymbol,
  Member,
} from "@/api/client";
import {
  fetchCompany,
  fetchCorporateActions,
  fetchExternalSymbols,
  fetchFigures,
  fetchFundamentals,
  fetchNews,
  fetchOverviews,
  fetchSeries,
  fetchValuation,
} from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { CorporateActions } from "@/components/CorporateActions";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { Financials } from "@/components/Financials";
import { GrowthChart, ShareholdingChart } from "@/components/FundamentalsChart";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { NewsFeed } from "@/components/NewsFeed";
import { PageHeader } from "@/components/PageHeader";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { SectionHeader } from "@/components/SectionHeader";
import { StatementTable } from "@/components/StatementTable";
import { type Tab, Tabs } from "@/components/Tabs";
import { ValuationPanel } from "@/components/ValuationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { coloured } from "@/lib/chartPalette";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatPrice, formatVolume, toNumber } from "@/lib/format";
import { companyPath, newsPath, populationPath } from "@/lib/paths";

interface CompanyProps {
  /** The company's listing on either exchange. Both reach this page. */
  instrumentKey: string;
}

const DEFAULT_RANGE = 250;

/** How many articles the page shows before sending a reader to the feed. */
const HEADLINES = 6;

/** Which view of the chart is showing. */
type View = "compare" | "price";

const VIEWS: Tab<View>[] = [
  { key: "compare", label: "Relative strength" },
  { key: "price", label: "Price" },
];

/** The parts of the page. */
type Part = "overview" | "financials" | "shareholding" | "actions" | "news";

const PARTS: Tab<Part>[] = [
  { key: "overview", label: "Overview" },
  { key: "financials", label: "Financials" },
  { key: "shareholding", label: "Shareholding" },
  { key: "actions", label: "Corporate Actions" },
  { key: "news", label: "News" },
];

/**
 * Render the page.
 *
 * @param props - Which company to show.
 * @returns The page.
 */
export function Company({ instrumentKey }: CompanyProps): React.JSX.Element {
  const [sessions, setSessions] = useState(DEFAULT_RANGE);
  const [view, setView] = useState<View>("compare");
  const [part, setPart] = useState<Part>("overview");

  const load = useCallback(() => fetchCompany(instrumentKey), [instrumentKey]);
  const company = useResource(load);

  // Everything below keys off the company's preferred listing rather than
  // the key in the address bar, so a page reached by its BSE listing still
  // charts and reports the one series the rest of the platform uses.
  const key = company.data?.instrument_key ?? null;

  const loadOverview = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchOverviews([key])),
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
  const loadStatements = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchFundamentals(key)),
    [key],
  );
  const loadActions = useCallback(
    () => (key === null ? Promise.resolve([]) : fetchCorporateActions(key)),
    [key],
  );
  const loadNews = useCallback(
    () =>
      key === null ? Promise.resolve(null) : fetchNews({ instrumentKey: key, limit: HEADLINES }),
    [key],
  );
  const overview = useResource(loadOverview);
  const valuation = useResource(loadValuation);
  const chart = useResource(loadChart);
  const statements = useResource(loadStatements);
  const actions = useResource(loadActions);
  const news = useResource(loadNews);

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

  return (
    <div className="space-y-6">
      <PageHeader
        kind="company"
        title={found?.name ?? instrumentKey}
        badges={
          <>
            {found?.listings.map((listing) => (
              <Badge key={listing.instrument_key} variant="outline">
                {listing.exchange}: {listing.symbol}
              </Badge>
            ))}
            {found?.sector != null && (
              <Link to={populationPath("sector", found.sector)}>
                <Badge variant="secondary" className="hover:bg-secondary/70">
                  {found.sector}
                </Badge>
              </Link>
            )}
          </>
        }
        identifiers={found !== null && <span>ISIN {found.isin}</span>}
        description={found?.description}
      />

      <Tabs tabs={PARTS} active={part} onChange={setPart} label="Company">
        {part === "overview" && (
          <div className="space-y-6">
            <InstrumentFigures overview={overview.data?.[0] ?? null} loading={overview.loading} />

            <section className="space-y-3" aria-labelledby="valuation-heading">
              <SectionHeader
                id="valuation-heading"
                icon={ENTITIES.company.icon}
                title="Valuation"
                description="What the company is worth against what it earns, owns and pays — worked out from the stored price, statements and dividends when the page is read."
              />
              <ValuationPanel valuation={valuation.data} loading={valuation.loading} />
            </section>

            {found !== null && key !== null && (
              <section className="space-y-3" aria-labelledby="price-heading">
                <SectionHeader
                  id="price-heading"
                  icon={ENTITIES.index.icon}
                  title="Price & Performance"
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
                    <PriceChart
                      points={chart.data?.points ?? null}
                      loading={chart.loading}
                      instrument={{
                        label: found.symbol,
                        symbol: symbols.data?.[key]?.symbol,
                        derived: symbols.data?.[key]?.derived,
                      }}
                    />
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

            {found?.performance != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Relative Performance</CardTitle>
                  <CardDescription>
                    In percentage points. Its own trade first: a company beating the market while
                    trailing every rival in its sector is doing worse than the market comparison
                    alone suggests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Against comparisons={found.performance.against} loading={company.loading} />
                </CardContent>
              </Card>
            )}

            {found !== null && found.peers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MARKS.peers aria-hidden="true" className="h-4 w-4 text-primary" />
                    Peer Companies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Peers peers={found.peers} loading={company.loading} />
                </CardContent>
              </Card>
            )}

            {found !== null && found.indices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ENTITIES.index.icon aria-hidden="true" className="h-4 w-4 text-primary" />
                    Index Membership
                  </CardTitle>
                  <CardDescription>
                    {found.indices.length} {found.indices.length === 1 ? "index" : "indices"}{" "}
                    currently hold it, which says what size band it is in as plainly as any label
                    would.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {found.indices.map((one) => (
                    <Link key={one.instrument_key} to={populationPath("index", one.instrument_key)}>
                      <Badge variant="outline" className="hover:bg-accent">
                        {one.name}
                      </Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {part === "financials" && (
          <div className="space-y-6">
            <section className="space-y-3" aria-labelledby="growth-heading">
              <SectionHeader
                id="growth-heading"
                icon={ENTITIES.index.icon}
                title="Revenue & Profit"
                description="Every year reported. A table says what each year was; the line says whether the years are going anywhere."
              />
              <GrowthChart statements={statements.data} loading={statements.loading} />
            </section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <Financials statements={statements.data} loading={statements.loading} />
              </CardContent>
            </Card>
          </div>
        )}

        {part === "shareholding" && (
          <div className="space-y-6">
            <section className="space-y-3" aria-labelledby="holders-heading">
              <SectionHeader
                id="holders-heading"
                icon={MARKS.peers}
                title="Shareholding Pattern"
                description="Who has owned the company, quarter by quarter, in per cent. Promoters selling down and institutions building are the movements worth watching."
              />
              <ShareholdingChart statements={statements.data} loading={statements.loading} />
            </section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">As Filed</CardTitle>
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
          </div>
        )}

        {part === "actions" && <ActionsByKind actions={actions.data} loading={actions.loading} />}

        {part === "news" && (
          <section className="space-y-3" aria-labelledby="news-heading">
            <SectionHeader id="news-heading" icon={MARKS.news} title="Company News" />
            <NewsFeed items={news.data?.items ?? null} loading={news.loading} />
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
  const shown = useMemo(
    () => (actions ?? []).filter((one) => kind === "ALL" || one.kind === kind),
    [actions, kind],
  );
  return (
    <div className="space-y-3">
      <SectionHeader
        icon={MARKS.dates}
        title="Corporate Actions"
        description="Dividends, bonuses, splits and rights. A price chart that looks broken on a date is usually explained here."
        actions={<Chooser options={KINDS} chosen={kind} onChange={setKind} label="Kind" />}
      />
      <CorporateActions actions={shown} loading={loading} />
    </div>
  );
}

/**
 * The populations the company was measured against.
 *
 * A table rather than the chart above it, because the nearest comparison
 * -- its own sector -- has no price and cannot be drawn.
 */
function Against({
  comparisons,
  loading,
}: {
  comparisons: Comparison[];
  loading: boolean;
}): React.JSX.Element {
  const columns = useMemo<Column<Comparison>[]>(
    () => [
      {
        id: "label",
        header: "Measured against",
        accessorFn: (row) => row.label,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.label}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.role}</div>
          </div>
        ),
      },
      gap("one_week", "1W"),
      gap("one_month", "1M"),
      gap("three_months", "3M"),
      gap("six_months", "6M"),
      gap("one_year", "1Y"),
      gap("year_to_date", "This year"),
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={comparisons}
      loading={loading}
      empty="Nothing to measure it against yet"
      placeholderRows={4}
      label="Relative strength"
      linkTo={(row) =>
        populationPath(row.scope_kind === "sector" ? "sector" : "index", row.scope_key)
      }
    />
  );
}

/** A column of gaps, in percentage points. */
function gap(window: keyof Comparison["relative"], header: string): Column<Comparison> {
  return {
    id: window,
    header,
    accessorFn: (row) => toNumber(row.relative[window]) ?? 0,
    cell: ({ row }) => <Delta value={row.original.relative[window]} />,
    meta: { align: "right" },
  };
}

/** The competitors, as a list of companies each leading to its own page. */
function Peers({ peers, loading }: { peers: Member[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Member>[]>(
    () => [
      {
        id: "symbol",
        header: "Company",
        accessorFn: (row) => row.symbol,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.symbol}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.name}</div>
          </div>
        ),
      },
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
      move("from_high_percent", "From high"),
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
      empty="No competitors recorded for this company"
      placeholderRows={5}
      label="Competitors"
      linkTo={(row) => companyPath(row.instrument_key)}
    />
  );
}

/** A column of percentage moves, coloured by direction. */
function move(
  field: "change_percent" | "one_month" | "three_months" | "one_year" | "from_high_percent",
  header: string,
): Column<Member> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row[field]) ?? 0,
    cell: ({ row }) =>
      row.original[field] === null ? ABSENT : <Delta value={row.original[field]} />,
    meta: { align: "right" },
  };
}
