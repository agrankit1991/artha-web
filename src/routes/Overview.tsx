/**
 * The overview: what the market did, at a glance.
 *
 * Index cards across the top, then every mover list for whichever
 * population is chosen. One request brings all seven lists, so the page
 * arrives whole rather than in pieces.
 */

import { useCallback, useMemo, useState } from "react";

import type { MoverRow } from "@/api/client";
import { fetchBreadth, fetchMovers, fetchOverviews, fetchScopes } from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { IndexCard } from "@/components/IndexCard";
import { MoverPanelCard } from "@/components/MoverPanel";
import { type Scope, ScopeSelector } from "@/components/ScopeSelector";
import { useResource } from "@/hooks/useResource";

/**
 * The indices shown as cards.
 *
 * A display choice rather than data: which three a person wants at the top
 * of their own dashboard is up to them, and this is the obvious starting
 * set for an Indian market. It moves into a saved preference once accounts
 * carry preferences.
 */
const HEADLINE_INDICES: { key: string; name: string }[] = [
  { key: "NSE_INDEX|Nifty 50", name: "Nifty 50" },
  { key: "BSE_INDEX|SENSEX", name: "Sensex" },
  { key: "NSE_INDEX|Nifty Bank", name: "Bank Nifty" },
];

/**
 * Render the overview.
 *
 * @param props - What to do when an instrument is chosen.
 * @returns The page.
 */
export function Overview({ onSelect }: { onSelect?: (row: MoverRow) => void }): React.JSX.Element {
  const [scope, setScope] = useState<Scope>({ kind: "companies", key: null });

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadIndices = useCallback(
    () => fetchOverviews(HEADLINE_INDICES.map((index) => index.key)),
    [],
  );
  const loadMovers = useCallback(() => fetchMovers(scope.kind, scope.key), [scope]);
  const loadBreadth = useCallback(() => fetchBreadth(scope.kind, scope.key), [scope]);

  const scopes = useResource(loadScopes);
  const indices = useResource(loadIndices);
  const movers = useResource(loadMovers);
  const breadth = useResource(loadBreadth);

  const bySymbol = useMemo(() => {
    const found = new Map(indices.data?.map((overview) => [overview.instrument_key, overview]));
    return HEADLINE_INDICES.map((index) => ({ ...index, overview: found.get(index.key) }));
  }, [indices.data]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bySymbol.map((index) => (
          <IndexCard key={index.key} name={index.name} overview={index.overview} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Market movers</h2>
          <ScopeSelector scope={scope} options={scopes.data} onChange={setScope} />
        </div>

        <BreadthPanel breadth={breadth.data} loading={breadth.loading} />

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
    </div>
  );
}
