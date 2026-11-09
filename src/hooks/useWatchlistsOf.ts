/**
 * The reader's watchlists as they stand for one instrument: which hold it,
 * and the ways to put it on one, take it off one, or make a new one with it.
 *
 * One reading for every place a company is put on a list -- the star on its
 * page, a right-click on it in the list beside the charts or on its chart
 * (the owner, 2026-11-08), and the shortcut in a chart's corner
 * (2026-11-10) -- so they cannot disagree about which lists hold it. A
 * change refreshes the counts beside the company in every table on screen.
 *
 * **Quick on purpose** (the owner found the lists slow to appear and adding
 * slow, 2026-11-10): the lists are read from `/api/watchlists/choices`, which
 * screens no source, and the ticks from the membership the page already
 * holds. A change shows the moment the platform takes it (about 30 ms) and
 * is read again behind it, where reading again took about a second, every
 * list kept updated being worked out afresh.
 */

import { useCallback, useState } from "react";

import {
  type WatchlistChoice,
  addWatchlistItem,
  createWatchlist,
  fetchWatchlistChoices,
  fetchWatchlistsHolding,
  removeWatchlistItem,
} from "@/api/client";
import { useResource } from "@/hooks/useResource";
import { writePreferences } from "@/lib/preferences";
import { useWatchlistMembership } from "@/lib/watchlistMembership";

/** One instrument's place on the reader's watchlists, and how to change it. */
export interface WatchlistsOf {
  /** The reader's lists, or null while they are on their way. */
  lists: WatchlistChoice[] | null;
  /** Why the lists or the lists holding it could not be read, or null. */
  error: string | null;
  /** The lists holding it, those kept updated too. */
  held: ReadonlySet<number>;
  /** Put it on a list it is not on, or take it off one it is. */
  toggle: (watchlistId: number) => Promise<void>;
  /** Make a list of this name holding it; whether that worked. */
  makeWith: (name: string) => Promise<boolean>;
  /** Whether a change is on its way. */
  busy: boolean;
  /** Why the last change failed, or null. */
  problem: string | null;
  forgetProblem: () => void;
}

/**
 * Read an instrument's watchlists.
 *
 * @param instrumentKey - The instrument.
 * @returns Where it stands and the ways to change it.
 */
export function useWatchlistsOf(instrumentKey: string): WatchlistsOf {
  const loadLists = useCallback(() => fetchWatchlistChoices(), []);
  const loadHolding = useCallback(() => fetchWatchlistsHolding(instrumentKey), [instrumentKey]);
  const lists = useResource(loadLists);
  // Still read: it carries the item a removal takes off, which the page's
  // membership does not, and the ticks where there is no membership to read.
  const holding = useResource(loadHolding);
  const membership = useWatchlistMembership();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const holds = holding.data ?? [];
  const held = membership.heldBy(instrumentKey) ?? new Set(holds.map((one) => one.watchlist_id));
  const items = new Map(
    holds.flatMap((one) =>
      one.item_id === null ? [] : [[one.watchlist_id, one.item_id] as const],
    ),
  );

  const readAgain = (): void => {
    holding.reload();
    lists.reload();
    // The count beside this company in every table on screen follows.
    membership.refresh();
  };

  const toggle = async (watchlistId: number): Promise<void> => {
    // Decided by the tick, not by whether an item is known: a tick drawn from
    // the page's membership can come before this instrument's own reading.
    const onIt = held.has(watchlistId);
    setBusy(true);
    setProblem(null);
    try {
      if (onIt) {
        const itemId =
          items.get(watchlistId) ??
          (await fetchWatchlistsHolding(instrumentKey)).find(
            (one) => one.watchlist_id === watchlistId,
          )?.item_id;
        // A list kept updated holds it with no item: nothing to take off.
        if (itemId === undefined || itemId === null) {
          return;
        }
        await removeWatchlistItem(watchlistId, itemId);
      } else {
        await addWatchlistItem(watchlistId, { instrument_key: instrumentKey });
        writePreferences({ lastWatchlist: watchlistId });
      }
      membership.mark(instrumentKey, watchlistId, !onIt);
      readAgain();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not change the list");
    } finally {
      setBusy(false);
    }
  };

  const makeWith = async (name: string): Promise<boolean> => {
    setBusy(true);
    setProblem(null);
    try {
      // One request, so a refused add cannot leave an empty list behind.
      const made = await createWatchlist({ name, instrument_keys: [instrumentKey] });
      writePreferences({ lastWatchlist: made.watchlist_id });
      membership.mark(instrumentKey, made.watchlist_id, true);
      readAgain();
      return true;
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not make the list");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    lists: lists.data,
    error: lists.error ?? holding.error,
    held,
    toggle,
    makeWith,
    busy,
    problem,
    forgetProblem: () => {
      setProblem(null);
    },
  };
}
