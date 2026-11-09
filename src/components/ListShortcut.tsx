/**
 * A chart's corner way onto a list (the owner, 2026-11-10: "an option
 * somewhere near the top right of the chart about adding to a list (last
 * list where I have added something)"). One click puts the company on the
 * list last added to, from anywhere, or takes it off; the arrow opens every
 * list, as the star and a right-click on the chart do.
 */
import { Check, ChevronDown, ListPlus, Plus } from "lucide-react";
import { useState } from "react";

import { Menu } from "@/components/Menu";
import { NewListDialog, WatchlistMenuItems } from "@/components/WatchlistMenu";
import { useWatchlistsOf } from "@/hooks/useWatchlistsOf";
import { usePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface ListShortcutProps {
  instrumentKey: string;
  /** What to call the instrument in its labels and the new-list dialog. */
  symbol: string;
}

/**
 * Render the last list's toggle and the way to every list.
 *
 * @param props - The instrument.
 * @returns The shortcut: before a list has been added to, "Add to list" alone.
 */
export function ListShortcut({ instrumentKey, symbol }: ListShortcutProps): React.JSX.Element {
  const of = useWatchlistsOf(instrumentKey);
  const { lastWatchlist } = usePreferences();
  const [naming, setNaming] = useState(false);
  // A list kept updated takes no adds, so it is never the one offered.
  const last = (of.lists ?? []).find((one) => one.watchlist_id === lastWatchlist && !one.followed);
  const onIt = last !== undefined && of.held.has(last.watchlist_id);

  return (
    <span className="inline-flex items-center rounded-md border text-xs">
      {last !== undefined && (
        <button
          type="button"
          disabled={of.busy}
          aria-pressed={onIt}
          title={onIt ? `Take ${symbol} off ${last.name}` : `Put ${symbol} on ${last.name}`}
          onClick={() => {
            void of.toggle(last.watchlist_id);
          }}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-l-md px-2 font-medium hover:bg-accent disabled:opacity-60",
            onIt && "text-caution",
          )}
        >
          {onIt ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          <span className="max-w-[10rem] truncate">{last.name}</span>
        </button>
      )}
      <Menu
        label={`${symbol}'s lists`}
        align="end"
        triggerClassName={cn(
          "inline-flex h-7 items-center gap-1 px-1.5 hover:bg-accent",
          last === undefined ? "rounded-md px-2 font-medium" : "rounded-r-md border-l",
        )}
        trigger={
          last === undefined ? (
            <>
              <ListPlus aria-hidden="true" className="h-3.5 w-3.5" />
              Add to list
            </>
          ) : (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          )
        }
      >
        {(close) => (
          <WatchlistMenuItems
            of={of}
            onNewList={() => {
              close();
              setNaming(true);
            }}
          />
        )}
      </Menu>
      <NewListDialog
        open={naming}
        symbol={symbol}
        of={of}
        onClose={() => {
          setNaming(false);
        }}
      />
    </span>
  );
}
