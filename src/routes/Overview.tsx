/**
 * The overview: what the market did, at a glance.
 *
 * In the order a reader asks: where the headline indices closed, how many
 * instruments took part, which of them moved most, and what was published
 * about them. One request brings all seven mover lists, so that section
 * arrives whole rather than in pieces.
 */

import {
  Activity,
  ChevronRight,
  Globe,
  LineChart,
  Newspaper,
  PieChart,
  TrendingUp,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { MoverRow } from "@/api/client";
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
import { useResource } from "@/hooks/useResource";
import { BENCHMARK, FEATURED_INDICES, GOLD } from "@/lib/indices";

interface OverviewProps {
  /** What to do when an instrument is chosen from a list. */
  onSelect?: (row: MoverRow) => void;
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
const DEFAULT_RANGE = 250;

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
  onOpenBreadth,
  onOpenNews,
}: OverviewProps): React.JSX.Element {
  const [scope, setScope] = useState<Scope>({ kind: "companies", key: null });
  const [view, setView] = useState<"price" | "gold">("gold");
  // One range for both views. Switching between them to find the span
  // reset is the kind of thing that makes a chart feel like two charts.
  const [sessions, setSessions] = useState(DEFAULT_RANGE);

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

  const cards = useMemo(() => {
    const found = new Map(indices.data?.map((overview) => [overview.instrument_key, overview]));
    return FEATURED_INDICES.map((index) => ({ ...index, overview: found.get(index.key) }));
  }, [indices.data]);

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="indices-heading">
        <h2 id="indices-heading" className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-primary" />
          Market indices
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((index) => (
            <IndexCard
              key={index.key}
              name={index.name}
              overview={index.overview}
              symbol={symbols.data?.[index.key]}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="world-heading">
        <h2 id="world-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Globe className="h-5 w-5 text-primary" />
          Global market overview
        </h2>
        <TradingViewWidget
          widget="market-overview"
          label="Global markets"
          height={450}
          settings={{
            dateRange: "1D",
            showChart: true,
            locale: "en",
            showSymbolLogo: true,
            showFloatingTooltip: false,
            // The symbols the previous project settled on. Which markets a
            // free widget will actually draw is not documented anywhere,
            // and this set is the one already known to work.
            tabs: [
              {
                title: "Indices",
                symbols: [
                  { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
                  { s: "NASDAQ:NDX", d: "Nasdaq" },
                  { s: "INDEX:N100", d: "Euronext 100 (Europe)" },
                  { s: "SPREADEX:FTSE", d: "FTSE 100 (UK)" },
                  { s: "XETR:DAX", d: "DAX (Germany)" },
                  { s: "BLACKBULL:JPN225", d: "JPN225 (Japan)" },
                  { s: "SSE:000001", d: "SSE Composite (China)" },
                  { s: "HSI:HSI", d: "HSI (Hong Kong)" },
                ],
              },
            ],
          }}
        />
      </section>

      <section className="space-y-3" aria-labelledby="heatmap-heading">
        <h2 id="heatmap-heading" className="flex items-center gap-2 text-lg font-semibold">
          <PieChart className="h-5 w-5 text-primary" />
          Market heatmap
        </h2>
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
            <h2 id="comparison-heading" className="flex items-center gap-2 text-lg font-semibold">
              <LineChart className="h-5 w-5 text-primary" />
              Charts
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
          <h2 id="movers-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            Market movers
          </h2>
          <ScopePicker scope={scope} options={scopes.data} onChange={setScope} />
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
          <p role="alert" className="text-sm text-destructive">
            {movers.error}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {(movers.data?.panels ?? []).map((panel) => (
              <MoverPanelCard
                key={panel.name}
                panel={panel}
                loading={movers.loading}
                {...(onSelect ? { onSelect } : {})}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="news-heading">
        <h2 id="news-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Newspaper className="h-5 w-5 text-primary" />
          Market news
        </h2>
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
