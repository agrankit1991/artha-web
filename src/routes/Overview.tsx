/**
 * The overview: what the market did, at a glance.
 *
 * In the order a reader asks: where the headline indices closed, how many
 * instruments took part, which of them moved most, and what was published
 * about them. One request brings all seven mover lists, so that section
 * arrives whole rather than in pieces.
 */

import { Activity, ChevronRight, LineChart, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";

import type {
  BreadthSession,
  InstrumentOverview,
  MoverPanel,
  MoverRow,
  ScopeOptions,
} from "@/api/client";
import {
  fetchBreadth,
  fetchExternalSymbols,
  fetchFigures,
  fetchMovers,
  fetchNews,
  fetchOverviews,
  fetchScopes,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { Tabs } from "@/components/Tabs";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { IndexCard } from "@/components/IndexCard";
import { MoverPanelCard } from "@/components/MoverPanel";
import { NewsFeed } from "@/components/NewsFeed";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { Button } from "@/components/ui/button";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { SectionHeader } from "@/components/SectionHeader";
import { ENTITIES, MARKS } from "@/lib/entities";
import { useResource } from "@/hooks/useResource";
import { readPreferences, writePreferences } from "@/lib/preferences";
import { formatDay, formatPrice } from "@/lib/format";
import { companyPath, moversPath, populationPath } from "@/lib/paths";
import { BENCHMARK, FEATURED_INDICES, GOLD } from "@/lib/indices";

interface OverviewProps {
  /** What to do when an instrument is chosen from a list. */
  onSelect?: (row: MoverRow) => void;
  /** Where to send a reader who chooses one of the index cards. */
  onOpenIndex?: (instrumentKey: string) => void;
  /** Where to send a reader who wants the chosen population's own page. */
  onOpenPopulation?: (kind: "index" | "sector", key: string) => void;
  /** Where to send a reader who wants breadth in full. */
  onOpenBreadth?: () => void;
  /** Where to send a reader who wants the whole news feed. */
  onOpenNews?: () => void;
}

/**
 * How many headlines the overview carries.
 *
 * Enough to be worth glancing at and few enough that the page below them
 * is still reachable; the rest are a click away on their own page.
 */
const HEADLINES = 6;

/** How much history the chart opens on -- a year. */
/**
 * What the chart section can show.
 *
 * The comparison first and by default: what the index has done against
 * gold is the question somebody opens this page with, and its own price
 * is already on the card above.
 */
const VIEWS = [
  { key: "gold", label: `${BENCHMARK.name} vs Gold` },
  { key: "price", label: BENCHMARK.name },
];

/** The two lines of the comparison, and the colours they are drawn in. */
const COMPARISON: ChartLine[] = [
  { instrumentKey: BENCHMARK.key, label: BENCHMARK.name, colour: "#2563eb" },
  { instrumentKey: GOLD.key, label: GOLD.name, colour: "#d97706" },
];

/**
 * Render the overview.
 *
 * @param props - What to do when something is chosen.
 * @returns The page.
 */
export function Overview({
  onSelect,
  onOpenIndex,
  onOpenPopulation,
  onOpenBreadth,
  onOpenNews,
}: OverviewProps): React.JSX.Element {
  // Where the reader left the overview last time; where they put it now is kept.
  const [scope, setScopeOnly] = useState<Scope>(() => readPreferences().scope);
  const setScope = (next: Scope): void => {
    setScopeOnly(next);
    writePreferences({ scope: next });
  };
  const [view, setView] = useState<"price" | "gold">("gold");
  // One range for both views. Switching between them to find the span
  // reset is the kind of thing that makes a chart feel like two charts.
  const [sessions, setSessionsOnly] = useState(() => readPreferences().range);
  const setSessions = (next: number): void => {
    setSessionsOnly(next);
    writePreferences({ range: next });
  };

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadIndices = useCallback(
    () => fetchOverviews(FEATURED_INDICES.map((index) => index.key)),
    [],
  );
  const loadMovers = useCallback(() => fetchMovers(scope.kind, scope.key), [scope]);
  const loadBreadth = useCallback(() => fetchBreadth(scope.kind, scope.key), [scope]);
  const loadNews = useCallback(() => fetchNews({ limit: HEADLINES }), []);
  // Every instrument this page draws, asked about once: eight cards and
  // two chart lines is ten round trips otherwise, to render ten links.
  const loadSymbols = useCallback(
    () => fetchExternalSymbols([...FEATURED_INDICES.map((index) => index.key), GOLD.key]),
    [],
  );
  const loadComparison = useCallback(
    () => fetchSeries([BENCHMARK.key, GOLD.key], sessions),
    [sessions],
  );
  const loadChart = useCallback(() => fetchFigures(BENCHMARK.key, sessions), [sessions]);

  const scopes = useResource(loadScopes);
  const indices = useResource(loadIndices);
  const movers = useResource(loadMovers);
  const breadth = useResource(loadBreadth);
  const news = useResource(loadNews);
  const comparison = useResource(loadComparison);
  const chart = useResource(loadChart);
  const symbols = useResource(loadSymbols);

  // Every row leads somewhere now: a list of indices to each index's own
  // page, a list of companies to each company's.
  const opens = (row: MoverRow): string =>
    scope.kind === "indices"
      ? populationPath("index", row.instrument_key)
      : companyPath(row.instrument_key, row.symbol);

  const cards = useMemo(() => {
    const found = new Map(indices.data?.map((overview) => [overview.instrument_key, overview]));
    return FEATURED_INDICES.map((index) => ({ ...index, overview: found.get(index.key) }));
  }, [indices.data]);

  return (
    <div className="space-y-8">
      {/* The previous project's title: centred, with the accent fading in
          and out beneath it. */}
      <header className="pb-2 text-center">
        <h1 className="relative inline-block text-4xl font-bold">
          Market Overview
          <span
            aria-hidden="true"
            className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
          />
        </h1>
      </header>

      <MarketBand
        benchmark={indices.data?.find((one) => one.instrument_key === BENCHMARK.key) ?? null}
        breadth={breadth.data?.latest ?? null}
        panels={movers.data?.panels ?? []}
        scope={scope}
      />

      <section className="space-y-3" aria-labelledby="indices-heading">
        <SectionHeader id="indices-heading" icon={ENTITIES.index.icon} title="Market Indices" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((index) => (
            <IndexCard
              key={index.key}
              name={index.name}
              overview={index.overview}
              symbol={symbols.data?.[index.key]}
              {...(onOpenIndex ? { onSelect: onOpenIndex } : {})}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="heatmap-heading">
        <SectionHeader id="heatmap-heading" icon={PieChart} title="Market Heatmap" />
        <TradingViewWidget
          widget="stock-heatmap"
          label="Sector heatmap"
          height={400}
          settings={{
            exchanges: ["BSE"],
            dataSource: "SENSEX",
            grouping: "sector",
            blockSize: "market_cap_basic",
            blockColor: "change",
            locale: "en",
            hasTopBar: false,
            isDataSetEnabled: false,
            isZoomEnabled: false,
            hasSymbolTooltip: true,
            isMonoSize: false,
          }}
        />
      </section>

      <section className="space-y-3" aria-labelledby="comparison-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="comparison-heading" className="flex items-center gap-2 text-2xl font-semibold">
              <LineChart aria-hidden="true" className="h-6 w-6 text-primary" />
              Index vs Gold
            </h2>
            <p className="text-sm text-muted-foreground">
              {view === "price"
                ? "Sessions as candles, with this platform's own moving averages over them."
                : "Both rebased to the first session they share, so two different scales compare."}
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
          onChange={(key) => {
            setView(key === "price" ? "price" : "gold");
          }}
          label="Chart"
        >
          {view === "price" ? (
            <PriceChart
              points={chart.data?.points ?? null}
              loading={chart.loading}
              instrument={{
                label: BENCHMARK.name,
                symbol: symbols.data?.[BENCHMARK.key]?.symbol,
                derived: symbols.data?.[BENCHMARK.key]?.derived,
              }}
            />
          ) : (
            <ComparisonChart
              series={comparison.data}
              lines={COMPARISON}
              symbols={symbols.data ?? {}}
              loading={comparison.loading}
            />
          )}
        </Tabs>
      </section>

      <section className="space-y-4" aria-labelledby="movers-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="movers-heading" className="flex items-center gap-2 text-2xl font-semibold">
            <Activity aria-hidden="true" className="h-6 w-6 text-primary" />
            Market Movers
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <ScopePicker scope={scope} options={scopes.data} onChange={setScope} />
            {scope.key !== null && onOpenPopulation && (
              <OpenPopulation
                kind={scope.kind === "index" ? "index" : "sector"}
                scopeKey={scope.key}
                label={nameOf(scope.key, scopes.data)}
                onOpen={onOpenPopulation}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <BreadthPanel breadth={breadth.data} loading={breadth.loading} />
          {onOpenBreadth && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={onOpenBreadth}
            >
              See breadth in full →
            </button>
          )}
        </div>

        {movers.error !== null ? (
          <Failed message={movers.error} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {(movers.data?.panels ?? []).map((panel) => (
              <MoverPanelCard
                href={moversPath(panel.name, scope.kind, scope.key)}
                key={panel.name}
                panel={panel}
                loading={movers.loading}
                {...(onSelect ? { onSelect } : {})}
                linkTo={opens}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="news-heading">
        <SectionHeader id="news-heading" icon={MARKS.news} title="Market News" />
        <NewsFeed items={news.data?.items ?? null} loading={news.loading} />
        {onOpenNews && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={onOpenNews}>
              View all news
              {news.data !== null && (
                <span className="text-muted-foreground">({news.data.total})</span>
              )}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * The way through to the chosen population's own page.
 *
 * Its own component so the key it carries is a value rather than
 * something read out of state inside a handler, where it is nullable
 * again however it was checked.
 *
 * @param props - Which population, what it is called, and where to go.
 * @returns The button.
 */
function OpenPopulation({
  kind,
  scopeKey,
  label,
  onOpen,
}: {
  kind: "index" | "sector";
  scopeKey: string;
  label: string;
  onOpen: (kind: "index" | "sector", key: string) => void;
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        onOpen(kind, scopeKey);
      }}
    >
      Open {label}
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}

/**
 * What a chosen population is called.
 *
 * @param key - The population's key.
 * @param options - What the platform offered, which carries the labels.
 * @returns Its name, or its key when nothing named it -- a sector the
 *   platform no longer ranks can still be chosen, and "Open" alone says
 *   nothing.
 */
function nameOf(key: string, options: ScopeOptions | null): string {
  const offered = [...(options?.indices ?? []), ...(options?.sectors ?? [])];
  return offered.find((one) => one.key === key)?.label ?? key;
}

/**
 * What moved today, in one line: the benchmark, how many took part, and
 * who led each way. The overview's first sentence, before its sections.
 */
function MarketBand({
  benchmark,
  breadth,
  panels,
  scope,
}: {
  benchmark: InstrumentOverview | null;
  breadth: BreadthSession | null;
  panels: MoverPanel[];
  scope: Scope;
}): React.JSX.Element {
  const gainer = panels.find((one) => one.name === "top-gainers")?.rows[0];
  const loser = panels.find((one) => one.name === "top-losers")?.rows[0];
  const counted = breadth === null ? 0 : breadth.advancing + breadth.declining + breadth.unchanged;
  return (
    <section
      aria-label="What moved today"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm"
    >
      <span className="flex items-baseline gap-2">
        <span className="text-muted-foreground">{BENCHMARK.name}</span>
        <span className="tabular font-semibold">{formatPrice(benchmark?.day.close)}</span>
        <Delta value={benchmark?.day.change_percent ?? null} />
      </span>
      {breadth !== null && counted > 0 && (
        <span className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Breadth</span>
          <span className="tabular text-gain">{breadth.advancing} up</span>
          <span className="tabular text-loss">{breadth.declining} down</span>
          <span className="text-xs text-muted-foreground">
            of {counted} on {formatDay(breadth.as_of)}
          </span>
        </span>
      )}
      {gainer !== undefined && (
        <span className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Led by</span>
          <Link
            to={companyPath(gainer.instrument_key, gainer.symbol)}
            className="font-medium hover:underline"
          >
            {gainer.symbol}
          </Link>
          <Delta value={gainer.value} />
        </span>
      )}
      {loser !== undefined && (
        <span className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Dragged by</span>
          <Link
            to={companyPath(loser.instrument_key, loser.symbol)}
            className="font-medium hover:underline"
          >
            {loser.symbol}
          </Link>
          <Delta value={loser.value} />
        </span>
      )}
      <Link
        to={moversPath("top-gainers", scope.kind, scope.key)}
        className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        All movers →
      </Link>
    </section>
  );
}
