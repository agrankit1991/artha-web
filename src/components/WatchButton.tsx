/**
 * A star that puts an instrument on a watchlist, or takes it off one.
 *
 * Filled when the instrument is on any of the account's lists. Opening it
 * lists every watchlist with a tick by the ones that hold the instrument;
 * a click toggles. "New list…" makes one and puts the instrument on it in
 * the same breath, because the reader who wants a new list wants it for
 * the company in front of them.
 *
 * On every entity page rather than only on the watchlist page, so a list
 * is built without leaving the pages being read.
 */

import { Star } from "lucide-react";
import { useState } from "react";

import { Menu } from "@/components/Menu";
import { NewListDialog, WatchlistMenuItems } from "@/components/WatchlistMenu";
import { useWatchlistsOf } from "@/hooks/useWatchlistsOf";
import { cn } from "@/lib/utils";

interface WatchButtonProps {
  instrumentKey: string;
  /** What to call the instrument in the menu and the new-list dialog. */
  symbol: string;
  className?: string;
}

/**
 * Render the star and, while open, the lists.
 *
 * @param props - The instrument.
 * @returns The button.
 */
export function WatchButton({
  instrumentKey,
  symbol,
  className,
}: WatchButtonProps): React.JSX.Element {
  const of = useWatchlistsOf(instrumentKey);
  const [naming, setNaming] = useState(false);
  const watched = of.held.size > 0;
  const onLists = `${String(of.held.size)} ${of.held.size === 1 ? "list" : "lists"}`;

  return (
    <>
      <Menu
        label={watched ? `${symbol} is on ${onLists} of yours` : `Watch ${symbol}`}
        align="end"
        {...(className === undefined ? {} : { className })}
        triggerClassName={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent",
          watched && "border-caution/40 text-caution",
        )}
        trigger={
          <>
            <Star aria-hidden="true" className={cn("h-4 w-4", watched && "fill-current")} />
            {watched ? `On ${onLists}` : "Watch"}
          </>
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
    </>
  );
}
