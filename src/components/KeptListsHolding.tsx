/**
 * The lists the platform keeps that hold a company today, named apart from
 * the reader's own lists (which the watch button counts), as the owner chose
 * (WATCHLIST-PLAN.md section 9): a large company would otherwise score high
 * merely for sitting in many indices.
 *
 * Only what changes from day to day is named here, the rankings it places in
 * and the strategies picking it, each leading to that list on the watchlist
 * page. Its sector and its indices are the header's badges already, and an
 * entity page says each thing once.
 */

import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type KeptHolding, type KeptKind, fetchKeptListsHolding } from "@/api/client";
import { keptTitle } from "@/components/KeptListView";
import { Badge } from "@/components/ui/badge";
import { useResource } from "@/hooks/useResource";
import { keptListPath } from "@/lib/paths";
import { usePreferences } from "@/lib/preferences";

/** The kinds of kept list that change daily, and so are not in the header. */
const DAILY: ReadonlySet<KeptKind> = new Set(["movers", "strategy"]);

/**
 * A kept list as it is heard: the badges show the place as "#2", which reads
 * run into the name.
 */
function spoken(one: KeptHolding): string {
  const title = keptTitle(one, one.name);
  const named = one.kind === "strategy" ? `${title}'s picks` : title;
  const place = one.rank === null ? "" : `, place ${String(one.rank)}`;
  return `${named}${place}${one.held ? ", held today" : ""}`;
}

/**
 * Render the line, or nothing while the company is in none of them.
 *
 * @param props.instrumentKey - The company.
 * @returns The line.
 */
export function KeptListsHolding({
  instrumentKey,
}: {
  instrumentKey: string;
}): React.JSX.Element | null {
  // The rankings in the universe the kept lists show them in, so a link
  // opens a list that holds the company.
  const { movers: universe } = usePreferences();
  const load = useCallback(
    () => fetchKeptListsHolding(instrumentKey, universe),
    [instrumentKey, universe],
  );
  const found = useResource(load);
  if (found.error !== null) {
    return <p className="text-sm text-muted-foreground">The lists kept today could not be read.</p>;
  }
  const shown = (found.data ?? []).filter((one) => DAILY.has(one.kind));
  if (shown.length === 0) {
    return null;
  }
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Also in today:</span>
      {shown.map((one) => (
        <Link
          key={`${one.kind}:${one.key}`}
          to={keptListPath(one)}
          aria-label={spoken(one)}
          viewTransition
          className="inline-flex items-center gap-1"
        >
          <Badge variant="outline" className="hover:bg-muted">
            {keptTitle(one, one.name)}
            {one.rank !== null && (
              <span className="tabular text-muted-foreground">#{one.rank}</span>
            )}
          </Badge>
          {one.held && <Badge variant="secondary">Held</Badge>}
        </Link>
      ))}
    </p>
  );
}
