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

import { Plus, Star } from "lucide-react";
import { useCallback, useState } from "react";

import {
  addWatchlistItem,
  createWatchlist,
  fetchWatchlists,
  fetchWatchlistsHolding,
  removeWatchlistItem,
} from "@/api/client";
import { Dialog } from "@/components/Dialog";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
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
  const loadLists = useCallback(() => fetchWatchlists(), []);
  const loadHolding = useCallback(() => fetchWatchlistsHolding(instrumentKey), [instrumentKey]);
  const lists = useResource(loadLists);
  const holding = useResource(loadHolding);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const held = new Map((holding.data ?? []).map((one) => [one.watchlist_id, one.item_id]));
  const watched = held.size > 0;

  const refresh = (): void => {
    holding.reload();
    lists.reload();
  };

  const toggle = async (watchlistId: number): Promise<void> => {
    const itemId = held.get(watchlistId);
    setBusy(true);
    setProblem(null);
    try {
      if (itemId === undefined) {
        await addWatchlistItem(watchlistId, { instrument_key: instrumentKey });
      } else {
        await removeWatchlistItem(watchlistId, itemId);
      }
      refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not change the list");
    } finally {
      setBusy(false);
    }
  };

  const makeAndAdd = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const made = await createWatchlist({ name });
      await addWatchlistItem(made.watchlist_id, { instrument_key: instrumentKey });
      setNaming(false);
      setName("");
      refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not make the list");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Menu
        label={watched ? `On a watchlist: ${symbol}` : `Watch ${symbol}`}
        align="end"
        {...(className === undefined ? {} : { className })}
        triggerClassName={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent",
          watched && "border-amber-500/40 text-amber-600 dark:text-amber-400",
        )}
        trigger={
          <>
            <Star aria-hidden="true" className={cn("h-4 w-4", watched && "fill-current")} />
            {watched ? "Watching" : "Watch"}
          </>
        }
      >
        {(close) => (
          <>
            <MenuLabel>Watchlists</MenuLabel>
            {lists.error !== null || holding.error !== null ? (
              <div className="px-2 py-1.5 text-xs text-loss">{lists.error ?? holding.error}</div>
            ) : (lists.data ?? []).length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {lists.data === null ? "Loading…" : "No lists yet."}
              </div>
            ) : (
              (lists.data ?? []).map((list) => (
                <MenuItem
                  key={list.watchlist_id}
                  selected={held.has(list.watchlist_id)}
                  onSelect={() => {
                    void toggle(list.watchlist_id);
                  }}
                >
                  <span className="flex-1 truncate">{list.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{list.items}</span>
                </MenuItem>
              ))
            )}
            {problem !== null && <div className="px-2 py-1 text-xs text-loss">{problem}</div>}
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                close();
                setNaming(true);
              }}
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
              New list…
            </MenuItem>
          </>
        )}
      </Menu>

      <Dialog
        open={naming}
        onClose={() => {
          setNaming(false);
          setProblem(null);
        }}
        title="New watchlist"
        description={`${symbol} goes on it as soon as it is made.`}
      >
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && name.trim() !== "") {
              void makeAndAdd();
            }
          }}
        >
          <label className="block text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Long term"
              maxLength={60}
              aria-label="Name"
              className="mt-1"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNaming(false);
                setProblem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || name.trim() === ""}>
              Make and add
            </Button>
          </div>
          {problem !== null && <p className="text-sm text-loss">{problem}</p>}
        </form>
      </Dialog>
    </>
  );
}
