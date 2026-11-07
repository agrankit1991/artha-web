/**
 * The lists the platform keeps that hold a company today, named apart from
 * the reader's own lists (which the watch button counts), as the owner chose
 * (WATCHLIST-PLAN.md section 9): a large company would otherwise score high
 * merely for sitting in many indices.
 *
 * Only what changes from day to day is named here, the rankings it places in
 * and the strategies picking it, each leading to that list on the watchlist
 * page. Its sector and its indices are the header's badges already, and an
 * entity page says each thing once. The strategies are one chip opening a
 * menu, as the header's indices are: on production's data a company sat in
 * 146 strategies' picks (2026-11-08), too many to name in a line.
 */

import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

import { type KeptHolding, fetchKeptListsHolding } from "@/api/client";
import { keptTitle } from "@/components/KeptListView";
import { Menu, MenuItem } from "@/components/Menu";
import { Badge } from "@/components/ui/badge";
import { useResource } from "@/hooks/useResource";
import { keptListPath } from "@/lib/paths";
import { usePreferences } from "@/lib/preferences";

/**
 * How many strategies pick the company, and how many would buy it today.
 *
 * @param strategies - The strategies picking it.
 * @returns The chip's words.
 */
function pickedBy(strategies: KeptHolding[]): string {
  const count = strategies.length;
  const held = strategies.filter((one) => one.held).length;
  const named = `In ${String(count)} ${count === 1 ? "strategy's" : "strategies'"} picks`;
  return held === 0 ? named : `${named}, held by ${String(held)}`;
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
  const navigate = useNavigate();
  if (found.error !== null) {
    return <p className="text-sm text-muted-foreground">The lists kept today could not be read.</p>;
  }
  const rankings = (found.data ?? []).filter((one) => one.kind === "movers");
  // Held first, then by place: the platform's order.
  const strategies = (found.data ?? []).filter((one) => one.kind === "strategy");
  if (rankings.length === 0 && strategies.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Also in today:</span>
      {rankings.map((one) => (
        <Link
          key={one.key}
          to={keptListPath(one)}
          // The badge shows the place as "#2", which would be heard run into the name.
          aria-label={`${keptTitle(one, null)}, place ${String(one.rank)}`}
          viewTransition
        >
          <Badge variant="outline" className="hover:bg-muted">
            {keptTitle(one, null)}
            <span className="tabular text-muted-foreground">#{one.rank}</span>
          </Badge>
        </Link>
      ))}
      {strategies.length > 0 && (
        <Menu
          label={pickedBy(strategies)}
          align="start"
          trigger={
            <Badge variant="secondary" className="hover:bg-secondary/70">
              {pickedBy(strategies)}
            </Badge>
          }
        >
          {(close) =>
            strategies.map((one) => (
              <MenuItem
                key={one.key}
                onSelect={() => {
                  close();
                  void navigate(keptListPath(one));
                }}
              >
                {one.name} - {one.held ? "held" : "waiting"}, #{one.rank}
              </MenuItem>
            ))
          }
        </Menu>
      )}
    </div>
  );
}
