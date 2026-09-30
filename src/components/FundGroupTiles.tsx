/**
 * The groups of funds as tiles to choose from: each one's name, how many
 * funds it holds, and its middle fund's one-year and three-year returns.
 *
 * A choice before it is a summary: pressing a tile narrows the list below
 * to that group, and pressing it again widens it back. Two, three or six
 * across, so twelve groups always fill their rows.
 */

import type { FundGroup, FundGroupStanding } from "@/api/client";
import { CardsLoading } from "@/components/CardsLoading";
import { Delta } from "@/components/Delta";
import { formatCount } from "@/lib/format";
import { FUND_GROUPS } from "@/lib/funds";
import { cn } from "@/lib/utils";

interface FundGroupTilesProps {
  /** Every group's standing; null while it is fetched. */
  standings: FundGroupStanding[] | null;
  /** The group the list is narrowed to, if any. */
  chosen: FundGroup | null;
  /** Narrow to a group, or to none. */
  onChoose: (group: FundGroup | null) => void;
}

/**
 * Draw the tiles.
 *
 * @param props - The standings, the group chosen, and what to call on a choice.
 * @returns The grid of tiles, or placeholders in its shape while loading.
 */
export function FundGroupTiles({
  standings,
  chosen,
  onChoose,
}: FundGroupTilesProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Groups of funds"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
    >
      {standings === null ? (
        <CardsLoading count={12} />
      ) : (
        standings.map((one) => {
          const pressed = one.group === chosen;
          return (
            <button
              key={one.group}
              type="button"
              aria-pressed={pressed}
              // A group with no fund among those shown has nothing to narrow to.
              disabled={one.funds === 0}
              onClick={() => {
                onChoose(pressed ? null : one.group);
              }}
              className={cn(
                "rounded-xl border bg-card p-3 text-left shadow-sm transition-colors duration-200 ease-brand",
                "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                pressed && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <span className="block truncate text-sm font-medium">{FUND_GROUPS[one.group]}</span>
              <span className="block text-xs text-muted-foreground">
                {formatCount(one.funds)} funds
              </span>
              <span className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <span>
                  <span className="block text-muted-foreground">1Y median</span>
                  <Delta value={one.one_year} arrow={false} />
                </span>
                <span>
                  <span className="block text-muted-foreground">3Y p.a.</span>
                  <Delta value={one.three_years} arrow={false} />
                </span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
