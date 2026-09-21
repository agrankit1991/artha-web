/**
 * One company: what it is, how it is doing, and what it has reported.
 *
 * The sibling of the index and sector page, and deliberately the same
 * shape: what the thing is, how it reads against what it should be
 * measured by, then the detail. A reader who has learnt one has learnt
 * the other.
 *
 * What a company has that a population does not is a filing history --
 * statements, a shareholding pattern, corporate events -- and those are
 * fetched separately from its identity. Identity is a few hundred bytes
 * and is wanted at once; a decade of statements is not.
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Comparison, KnownSymbol, Member } from "@/api/client";
import {
  fetchCompany,
  fetchCorporateActions,
  fetchExternalSymbols,
  fetchFigures,
  fetchFundamentals,
  fetchNews,
  fetchOverviews,
  fetchSeries,
} from "@/api/client";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { coloured } from "@/lib/chartPalette";
import { CorporateActions } from "@/components/CorporateActions";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Financials } from "@/components/Financials";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { NewsFeed } from "@/components/NewsFeed";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { StatementTable } from "@/components/StatementTable";
import { Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { companyPath, newsPath, populationPath } from "@/lib/paths";
import { ABSENT, formatPrice, formatVolume, toNumber } from "@/lib/format";

interface CompanyProps {
  /** The company's listing on either exchange. Both reach this page. */
  instrumentKey: string;
}

const DEFAULT_RANGE = 250;

/** How many articles the page shows before sending a reader to the feed. */
const HEADLINES = 6;

/** What the chart section can show. */
const VIEWS = [
  { key: "compare", label: "Relative strength" },
  { key: "price", label: "Price" },
];

/**
 * Render the page.
 *
 * @param props - Which company to show.
 * @returns The page.
 */
export function Company({ instrumentKey }: CompanyProps): React.JSX.Element {
  const [sessions, setSessions] = useState(DEFAULT_RANGE);
  // How it reads against its sector and the market is the question this
  // page is opened with; its own price is one tab away.
  const [view, setView] = useState<"price" | "compare">("compare");

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
  const chart = useResource(loadChart);
  const statements = useResource(loadStatements);
  const actions = useResource(loadActions);
  const news = useResource(loadNews);

  // The company and every benchmark that trades. Its sector is measured
  // against below but cannot be drawn: a sector is a grouping of companies
  // rather than something with a price of its own.
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
    // Everything after the company is there to be read against rather
    // than read, so it is drawn thin.
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
    return (
      <p role="alert" className="text-sm text-destructive">
        {company.error}
      </p>
    );
  }

  const found = company.data;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{found?.name ?? instrumentKey}</h1>
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
        </div>
        {found !== null && <p className="text-xs text-muted-foreground">ISIN {found.isin}</p>}
        {found?.description != null && (
          <p className="max-w-3xl text-sm text-muted-foreground">{found.description}</p>
        )}
      </header>

      <InstrumentFigures overview={overview.data?.[0] ?? null} loading={overview.loading} />

      {found !== null && key !== null && (
        <section className="space-y-3" aria-labelledby="price-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="price-heading" className="text-lg font-semibold">
                How it is doing
              </h2>
              <p className="text-sm text-muted-foreground">
                {view === "compare"
                  ? "Against the market and the size bands, all rebased to the first session they share."
                  : "Its own sessions, with this platform's moving averages over them."}
              </p>
            </div>
            <RangeSelector
              ranges={PRICE_RANGES}
              sessions={sessions}
              onChange={setSessions}
              label="History"
            />
          </div>
          <Tabs
            tabs={VIEWS}
            active={view}
            onChange={(chosen) => {
              setView(chosen === "compare" ? "compare" : "price");
            }}
            label="Chart"
          >
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
            <CardTitle className="text-base">How far ahead, and of what</CardTitle>
            <CardDescription>
              In percentage points. Its own trade first: a company beating the market while trailing
              every rival in its sector is doing worse than the market comparison alone suggests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Against comparisons={found.performance.against} loading={company.loading} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reported figures</CardTitle>
        </CardHeader>
        <CardContent>
          <Financials statements={statements.data} loading={statements.loading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who owns it</CardTitle>
          <CardDescription>
            The shareholding pattern as filed each quarter, in per cent of the company.
          </CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Corporate actions</CardTitle>
          <CardDescription>
            Dividends, bonuses and splits. A price chart that looks broken on a date is usually
            explained here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CorporateActions actions={actions.data} loading={actions.loading} />
        </CardContent>
      </Card>

      {found !== null && found.indices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In these indices</CardTitle>
            <CardDescription>
              {found.indices.length} {found.indices.length === 1 ? "index" : "indices"} currently
              hold it, which says what size band it is in as plainly as any label would.
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

      {found !== null && found.peers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who it competes with</CardTitle>
          </CardHeader>
          <CardContent>
            <Peers peers={found.peers} loading={company.loading} />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3" aria-labelledby="news-heading">
        <h2 id="news-heading" className="text-lg font-semibold">
          What is being written about it
        </h2>
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
    </div>
  );
}

/**
 * The populations the company was measured against.
 *
 * A table rather than the chart above it, because the nearest comparison
 * -- its own sector -- has no price and cannot be drawn. Leaving the
 * sector out of both would drop the one benchmark a company is most
 * usefully read against.
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

/**
 * A column of gaps, in percentage points.
 *
 * @param window - Which trailing window it reads.
 * @param header - What to call it.
 * @returns The column.
 */
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

/**
 * A column of percentage moves, coloured by direction.
 *
 * @param field - Which figure it reads.
 * @param header - What to call it.
 * @returns The column.
 */
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
