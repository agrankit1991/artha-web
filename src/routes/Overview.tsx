/**
 * The overview: what the market did, at a glance.
 *
 * In the order a reader asks: where the headline indices closed, how many
 * instruments took part, which of them moved most, and what was published
 * about them. One request brings all seven mover lists, so that section
 * arrives whole rather than in pieces.
 */

import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";

import type {
  BreadthSession,
  InstitutionalFlow,
  InstrumentOverview,
  MoverListName,
  MoverPanel,
  MoverRow,
  ScopeOptions,
  SectorSummary,
} from "@/api/client";
import {
  fetchBreadth,
  fetchExternalSymbols,
  fetchFigures,
  fetchMovers,
  fetchFlows,
  fetchNews,
  fetchOverviews,
  fetchScopes,
  fetchHeatmap,
  fetchSectors,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { DivergingBars } from "@/components/DivergingBars";
import { Empty } from "@/components/Empty";
import { PageHeader } from "@/components/PageHeader";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { Tabs } from "@/components/Tabs";
import { IndexCard } from "@/components/IndexCard";
import { MoverPanelCard } from "@/components/MoverPanel";
import { NewsFeed } from "@/components/NewsFeed";
import { ScopePicker } from "@/components/ScopePicker";
import { type Scope, WHOLE_POPULATIONS } from "@/components/ScopeSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { Heatmap } from "@/components/Heatmap";
import { FlowsGlance } from "@/components/FlowsGlance";
import { SectionHeader } from "@/components/SectionHeader";
import { ENTITIES, MARKS } from "@/lib/entities";
import { coloured } from "@/lib/chartPalette";
import { useChartRange } from "@/hooks/useChartRange";
import { useResource } from "@/hooks/useResource";
import { readPreferences, writePreferences } from "@/lib/preferences";
import { formatCroreSigned, formatDay, formatPrice, toNumber } from "@/lib/format";
import { companyPath, moversPath, PATHS, populationPath } from "@/lib/paths";
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

/** The two lines of the comparison: the logo's teal and orange, first and second. */
const COMPARISON: ChartLine[] = coloured([
  { instrumentKey: BENCHMARK.key, label: BENCHMARK.name },
  { instrumentKey: GOLD.key, label: GOLD.name },
]);

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
  const [sessions, setSessions] = useChartRange();

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadIndices = useCallback(
    () => fetchOverviews(FEATURED_INDICES.map((index) => index.key)),
    [],
  );
  const loadMovers = useCallback(() => fetchMovers(scope.kind, scope.key), [scope]);
  const loadBreadth = useCallback(() => fetchBreadth(scope.kind, scope.key), [scope]);
  const loadNews = useCallback(() => fetchNews({ limit: HEADLINES }), []);
  const loadFlows = useCallback(() => fetchFlows("DAY", FLOW_SESSIONS), []);
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
  const loadSectors = useCallback(() => fetchSectors(), []);
  // All the indices are not companies, so their map is the whole market's.
  const mappedScope = useMemo<Scope>(
    () => (scope.kind === "indices" ? { kind: "companies", key: null } : scope),
    [scope],
  );
  const loadHeatmap = useCallback(
    () => fetchHeatmap(mappedScope.kind, mappedScope.key),
    [mappedScope],
  );

  const scopes = useResource(loadScopes);
  const indices = useResource(loadIndices);
  const movers = useResource(loadMovers);
  const breadth = useResource(loadBreadth);
  const news = useResource(loadNews);
  const flows = useResource(loadFlows);
  const comparison = useResource(loadComparison);
  const chart = useResource(loadChart);
  const symbols = useResource(loadSymbols);
  const sectors = useResource(loadSectors);
  const heatmap = useResource(loadHeatmap);
  // The lists beyond gainers and losers share one panel, chosen from its title.
  const [otherList, setOtherList] = useState<MoverListName>("most-active");

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

  const population = scope.key === null ? populationLabel(scope) : nameOf(scope.key, scopes.data);
  const mapped = {
    name: mappedScope.key === null ? populationLabel(mappedScope) : population,
  };
  const panels = movers.data?.panels ?? [];
  const panelOf = (name: MoverListName): MoverPanel | undefined =>
    panels.find((one) => one.name === name);
  const others = OTHER_LISTS.filter((name) => panelOf(name) !== undefined);
  const benchmark = indices.data?.find((one) => one.instrument_key === BENCHMARK.key) ?? null;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Market Overview"
        identifiers={
          benchmark === null ? undefined : <span>Session of {formatDay(benchmark.as_of)}</span>
        }
        // The population the band, the breadth and the movers are about,
        // chosen at the top where it governs them, and named in each.
        actions={
          <>
            <ScopePicker scope={scope} options={scopes.data} onChange={setScope} />
            {scope.key !== null && onOpenPopulation && (
              <OpenPopulation
                kind={scope.kind === "index" ? "index" : "sector"}
                scopeKey={scope.key}
                label={population}
                onOpen={onOpenPopulation}
              />
            )}
          </>
        }
      />

      <MarketBand
        benchmark={benchmark}
        breadth={breadth.data?.latest ?? null}
        population={population}
        flows={flows.data}
      />

      <section className="space-y-4" aria-labelledby="indices-heading">
        <SectionHeader id="indices-heading" icon={ENTITIES.index.icon} title="Market indices" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <BreadthPanel
            breadth={breadth.data}
            loading={breadth.loading}
            title={`Breadth: ${population}`}
          />
          {onOpenBreadth && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              onClick={onOpenBreadth}
            >
              See breadth in full →
            </button>
          )}
        </div>
        {/* A failure here is the flows' own: the rest of the page stands. */}
        {flows.error === null ? (
          <FlowsGlance flows={flows.data} loading={flows.loading} />
        ) : (
          <Failed message={flows.error} />
        )}
      </div>

      <SectorsToday sectors={sectors.data} failure={sectors.error} />

      <section className="space-y-4" aria-labelledby="movers-heading">
        <SectionHeader
          id="movers-heading"
          icon={MARKS.movers}
          title="Movers"
          description={`Ranked within ${population}.`}
        />
        {movers.error !== null ? (
          <Failed message={movers.error} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {(["top-gainers", "top-losers"] as const).map((name) => {
              const panel = panelOf(name);
              return panel === undefined ? null : (
                <MoverPanelCard
                  href={moversPath(panel.name, scope.kind, scope.key)}
                  key={panel.name}
                  panel={panel}
                  loading={movers.loading}
                  {...(onSelect ? { onSelect } : {})}
                  linkTo={opens}
                />
              );
            })}
            {(() => {
              // The other five lists share the third place, chosen from
              // its title: seven panels always left a row half empty.
              const panel = panelOf(otherList) ?? panelOf(others[0] ?? otherList);
              return panel === undefined ? null : (
                <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
                  <MoverPanelCard
                    href={moversPath(panel.name, scope.kind, scope.key)}
                    panel={panel}
                    loading={movers.loading}
                    {...(onSelect ? { onSelect } : {})}
                    linkTo={opens}
                    choice={{ lists: others, onChoose: setOtherList }}
                  />
                </div>
              );
            })()}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="comparison-heading">
        <SectionHeader
          id="comparison-heading"
          icon={MARKS.performance}
          title={view === "price" ? BENCHMARK.name : `${BENCHMARK.name} against gold`}
          description={
            view === "price"
              ? "Sessions as candles, with this platform's own moving averages over them."
              : "Both rebased to the first session they share, so two different scales compare."
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

      <section className="space-y-4" aria-labelledby="heatmap-heading">
        <SectionHeader
          id="heatmap-heading"
          icon={MARKS.heatmap}
          title="Heatmap"
          description={`${mapped.name}: every company sized by what it is worth and coloured by how it moved, grouped by sector. Choose a sector's name to see it alone.`}
        />
        {heatmap.error !== null ? (
          <Failed message={heatmap.error} />
        ) : (
          <Heatmap
            tiles={heatmap.data?.tiles ?? null}
            label={mapped.name}
            linkTo={(tile) => companyPath(tile.instrument_key, tile.symbol)}
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="news-heading">
        <SectionHeader id="news-heading" icon={MARKS.news} title="News" />
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
 * What moved today, in one line: the benchmark, how many of the chosen
 * population took part, and which way the institutions traded. The
 * overview's first sentence, before its sections.
 */
function MarketBand({
  benchmark,
  breadth,
  population,
  flows,
}: {
  benchmark: InstrumentOverview | null;
  breadth: BreadthSession | null;
  population: string;
  flows: InstitutionalFlow[] | null;
}): React.JSX.Element {
  const counted = breadth === null ? 0 : breadth.advancing + breadth.declining + breadth.unchanged;
  // Newest first from the platform.
  const netOf = (participant: "FII" | "DII"): InstitutionalFlow | undefined =>
    (flows ?? []).find(
      (one) => one.participant === participant && one.segment === "CASH" && one.period === "DAY",
    );
  const institutions = (["FII", "DII"] as const)
    .map((participant) => ({ participant, flow: netOf(participant) }))
    .filter((one) => one.flow !== undefined);
  return (
    <section
      aria-label="What moved today"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-xs"
    >
      <span className="flex items-baseline gap-2">
        <span className="text-muted-foreground">{BENCHMARK.name}</span>
        <span className="tabular font-semibold">{formatPrice(benchmark?.day.close)}</span>
        <Delta value={benchmark?.day.change_percent ?? null} />
      </span>
      {breadth !== null && counted > 0 && (
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-muted-foreground">{population}</span>
          <span className="tabular whitespace-nowrap text-gain">{breadth.advancing} up</span>
          <span className="tabular whitespace-nowrap text-loss">{breadth.declining} down</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">of {counted}</span>
        </span>
      )}
      {institutions.map(({ participant, flow }) => (
        <span key={participant} className="flex items-baseline gap-2">
          <span className="text-muted-foreground">{participant} net</span>
          <Delta value={flow?.net_amount ?? null} format={formatCroreSigned} />
        </span>
      ))}
    </section>
  );
}

/** The lists beyond gainers and losers, which share one panel. */
const OTHER_LISTS: readonly MoverListName[] = [
  "most-active",
  "most-volatile",
  "unusual-volume",
  "near-52wk-high",
  "near-52wk-low",
];

/**
 * What a whole-market choice is called: all companies, all indices.
 *
 * @param scope - A scope with no key.
 * @returns Its name.
 */
function populationLabel(scope: Scope): string {
  return WHOLE_POPULATIONS.find((one) => one.scope.kind === scope.kind)?.label ?? "the market";
}

/** How many companies a sector must have measured to be ranked: fewer is one company's day. */
const SECTOR_SAMPLE = 5;

/** How many sectors are shown from each end. */
const SECTORS_EACH_WAY = 6;

/**
 * Where the money went today: the sectors whose median company rose most
 * and fell most.
 *
 * A median, not a weighted index: a sector whose largest company rose
 * while most fell shows as falling. Only sectors with enough companies to
 * mean something are ranked.
 *
 * @param props - Every sector's summary, and what went wrong, if anything.
 * @returns The section.
 */
function SectorsToday({
  sectors,
  failure,
}: {
  sectors: SectorSummary[] | null;
  failure: string | null;
}): React.JSX.Element {
  const ranked = (sectors ?? [])
    .filter((one) => one.measured >= SECTOR_SAMPLE && toNumber(one.median_change_percent) !== null)
    .map((one) => ({
      label: one.sector,
      value: toNumber(one.median_change_percent) ?? 0,
      href: populationPath("sector", one.sector),
      as_of: one.as_of,
    }))
    .sort((one, other) => other.value - one.value);
  const shown =
    ranked.length <= SECTORS_EACH_WAY * 2
      ? ranked
      : [...ranked.slice(0, SECTORS_EACH_WAY), ...ranked.slice(-SECTORS_EACH_WAY)];
  const day = ranked[0]?.as_of ?? null;

  return (
    <section className="space-y-4" aria-labelledby="sectors-heading">
      <SectionHeader
        id="sectors-heading"
        icon={ENTITIES.sector.icon}
        title="Sectors today"
        description={
          ranked.length === 0
            ? "The median company's move in each sector."
            : `The median company's move in each sector${day === null ? "" : ` on ${formatDay(day)}`}: the ${String(Math.min(SECTORS_EACH_WAY, ranked.length))} strongest and weakest of ${String(ranked.length)} with ${String(SECTOR_SAMPLE)} or more companies.`
        }
        actions={
          <Link
            to={PATHS.sectors}
            viewTransition
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            All sectors →
          </Link>
        }
      />
      {failure !== null ? (
        <Failed message={failure} />
      ) : sectors === null ? (
        <Skeleton className="h-64 w-full" />
      ) : shown.length === 0 ? (
        <Empty
          title="No sector ranked yet"
          reason="Sectors are ranked once their companies have a session."
        />
      ) : (
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <DivergingBars rows={shown} label="Sectors by today's median move" />
        </div>
      )}
    </section>
  );
}

/** How many sessions of flows the overview asks for: the glance's month, with room. */
const FLOW_SESSIONS = 25;
