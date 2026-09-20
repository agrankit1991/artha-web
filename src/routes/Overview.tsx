/**
 * The overview: what the market did, at a glance.
 *
 * In the order a reader asks: where the headline indices closed, how many
 * instruments took part, which of them moved most, and what was published
 * about them. One request brings all seven mover lists, so that section
 * arrives whole rather than in pieces.
 */

import { useCallback, useMemo, useState } from "react";

import type { MoverRow } from "@/api/client";
import {
  fetchBreadth,
  fetchMovers,
  fetchNews,
  fetchOverviews,
  fetchScopes,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { IndexCard } from "@/components/IndexCard";
import { MoverPanelCard } from "@/components/MoverPanel";
import { NewsFeed } from "@/components/NewsFeed";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { useResource } from "@/hooks/useResource";
import { BENCHMARK, FEATURED_INDICES, GOLD } from "@/lib/indices";

interface OverviewProps {
  /** What to do when an instrument is chosen from a list. */
  onSelect?: (row: MoverRow) => void;
  /** Where to send a reader who wants breadth in full. */
  onOpenBreadth?: () => void;
}

/** Sessions of the gold comparison -- about six months. */
const COMPARISON_SESSIONS = 125;

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
export function Overview({ onSelect, onOpenBreadth }: OverviewProps): React.JSX.Element {
  const [scope, setScope] = useState<Scope>({ kind: "companies", key: null });

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadIndices = useCallback(
    () => fetchOverviews(FEATURED_INDICES.map((index) => index.key)),
    [],
  );
  const loadMovers = useCallback(() => fetchMovers(scope.kind, scope.key), [scope]);
  const loadBreadth = useCallback(() => fetchBreadth(scope.kind, scope.key), [scope]);
  const loadNews = useCallback(() => fetchNews(), []);
  const loadComparison = useCallback(
    () => fetchSeries([BENCHMARK.key, GOLD.key], COMPARISON_SESSIONS),
    [],
  );

  const scopes = useResource(loadScopes);
  const indices = useResource(loadIndices);
  const movers = useResource(loadMovers);
  const breadth = useResource(loadBreadth);
  const news = useResource(loadNews);
  const comparison = useResource(loadComparison);

  const cards = useMemo(() => {
    const found = new Map(indices.data?.map((overview) => [overview.instrument_key, overview]));
    return FEATURED_INDICES.map((index) => ({ ...index, overview: found.get(index.key) }));
  }, [indices.data]);

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="indices-heading">
        <h2 id="indices-heading" className="text-lg font-semibold">
          Market indices
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((index) => (
            <IndexCard key={index.key} name={index.name} overview={index.overview} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="comparison-heading">
        <div>
          <h2 id="comparison-heading" className="text-lg font-semibold">
            {BENCHMARK.name} against gold
          </h2>
          <p className="text-sm text-muted-foreground">
            Six months, both rebased to their first shared session.
          </p>
        </div>
        <ComparisonChart series={comparison.data} lines={COMPARISON} loading={comparison.loading} />
      </section>

      <section className="space-y-4" aria-labelledby="movers-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="movers-heading" className="text-lg font-semibold">
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
        <h2 id="news-heading" className="text-lg font-semibold">
          Market news
        </h2>
        <NewsFeed items={news.data} loading={news.loading} />
      </section>
    </div>
  );
}
