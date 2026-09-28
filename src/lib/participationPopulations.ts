/**
 * The populations the participation heatmap lays side by side: which ones
 * by default, what each population is called, and where its name leads.
 */

import type { Participation, ScopeOptions } from "@/api/client";
import type { BreadthMeasure, HeatmapRow } from "@/components/BreadthHeatmap";
import { type Scope, WHOLE_POPULATIONS } from "@/components/ScopeSelector";
import { toNumber } from "@/lib/format";
import { countedHeadlines, FEATURED_INDICES } from "@/lib/indices";
import { populationPath } from "@/lib/paths";

/**
 * The most populations one heatmap carries.
 *
 * The platform's own bound on one request (`MAX_POPULATIONS` in its
 * participation route); asking for more is refused whole.
 */
export const MOST_POPULATIONS = 24;

/**
 * The populations a reader who has chosen none sees: the headline indices.
 *
 * @param options - What the platform counts, or null before it has said.
 * @returns The headline indices it counts, as populations; none until it has said.
 */
export function headlinePopulations(options: ScopeOptions | null): Scope[] {
  return countedHeadlines(options).map((index) => ({ kind: "index", key: index.key }));
}

/**
 * What a population is called.
 *
 * A headline index by its short name ("Bank Nifty" rather than the
 * exchange's "Nifty Bank"), any other by what the platform calls it, and
 * the two whole populations as the selector names them, so what a reader
 * picked is what its row says.
 *
 * @param scope - The population.
 * @param options - What the platform counts, for the names of the rest.
 * @returns The name.
 */
export function populationLabel(scope: Scope, options: ScopeOptions | null): string {
  if (scope.key === null) {
    // Unreachable fallback: only the two whole populations have no key.
    return WHOLE_POPULATIONS.find((whole) => whole.value === scope.kind)?.label ?? scope.kind;
  }
  const featured = FEATURED_INDICES.find((index) => index.key === scope.key);
  if (scope.kind === "index" && featured !== undefined) {
    return featured.name;
  }
  const listed = scope.kind === "index" ? options?.indices : options?.sectors;
  return listed?.find((option) => option.key === scope.key)?.label ?? scope.key;
}

/**
 * Where a population's name leads.
 *
 * @param scope - The population.
 * @returns Its page, or null for the whole market, which has none but this one.
 */
export function populationHref(scope: Scope): string | null {
  return (scope.kind === "index" || scope.kind === "sector") && scope.key !== null
    ? populationPath(scope.kind, scope.key)
    : null;
}

/**
 * Lay a participation reading out as the heatmap's rows.
 *
 * Named from the answer rather than from what was asked, so a row's name
 * always sits beside its own figures, even while a changed set is still
 * being fetched.
 *
 * @param participation - What the platform answered, or null before it has.
 * @param measure - Which average's share each cell shows.
 * @param options - What the platform counts, for the names of the populations.
 * @returns One row per population, in the order answered; none before an answer.
 */
export function heatmapRows(
  participation: Participation | null,
  measure: BreadthMeasure,
  options: ScopeOptions | null,
): HeatmapRow[] {
  return (participation?.populations ?? []).map((population) => {
    const scope: Scope = { kind: population.scope_kind, key: population.scope_key };
    return {
      key: `${scope.kind}:${scope.key ?? ""}`,
      label: populationLabel(scope, options),
      href: populationHref(scope),
      shares: population[measure].map((share) => toNumber(share)),
    };
  });
}
