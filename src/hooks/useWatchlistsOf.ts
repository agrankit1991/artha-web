/**
 * The reader's watchlists as they stand for one instrument: which hold it,
 * and the ways to put it on one, take it off one, or make a new one with it.
 *
 * One reading for every place a company is put on a list -- the star on its
 * page, and a right-click on it in the list beside the charts or on its
 * chart (the owner, 2026-11-08) -- so they cannot disagree about which lists
 * hold it. A change refreshes the counts beside the company in every table
 * on screen.
 */

import { useCallback, useState } from "react";

import {
  type WatchlistSummary,
  addWatchlistItem,
  createWatchlist,
  fetchWatchlists,
  fetchWatchlistsHolding,
  removeWatchlistItem,
} from "@/api/client";
import { useResource } from "@/hooks/useResource";
import { useWatchlistMembership } from "@/lib/watchlistMembership";

/** One instrument's place on the reader's watchlists, and how to change it. */
export interface WatchlistsOf {
  /** The reader's lists, or null while they are on their way. */
  lists: WatchlistSummary[] | null;
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
  const loadLists = useCallback(() => fetchWatchlists(), []);
  const loadHolding = useCallback(() => fetchWatchlistsHolding(instrumentKey), [instrumentKey]);
  const lists = useResource(loadLists);
  const holding = useResource(loadHolding);
  const membership = useWatchlistMembership();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const holds = holding.data ?? [];
  // Every list holding it counts, those kept updated too; only a list's own
  // items can be taken off, so only those are toggled.
  const held = new Set(holds.map((one) => one.watchlist_id));
  const items = new Map(
    holds.flatMap((one) =>
      one.item_id === null ? [] : [[one.watchlist_id, one.item_id] as const],
    ),
  );

  const refresh = (): void => {
    holding.reload();
    lists.reload();
    // The count beside this company in every table on screen follows.
    membership.refresh();
  };

  const toggle = async (watchlistId: number): Promise<void> => {
    const itemId = items.get(watchlistId);
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

  const makeWith = async (name: string): Promise<boolean> => {
    setBusy(true);
    setProblem(null);
    try {
      // One request, so a refused add cannot leave an empty list behind.
      await createWatchlist({ name, instrument_keys: [instrumentKey] });
      refresh();
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
