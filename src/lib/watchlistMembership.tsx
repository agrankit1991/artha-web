/**
 * How many of the reader's watchlists hold each instrument, for the count
 * shown beside a company wherever it appears.
 *
 * The whole account's membership is fetched once for the signed-in
 * application and shared, so a page of six tables asks once rather than six
 * times; anything that changes a list calls `refresh` and every count on
 * screen follows. Outside the provider -- a component rendered on its own,
 * in a test -- every instrument is on no list and `refresh` does nothing, so
 * a screen that does not care about counts needs nothing set up.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { fetchWatchlistMembership } from "@/api/client";
import { useResource } from "@/hooks/useResource";

/** What a component can ask about the reader's watchlists. */
export interface WatchlistMembership {
  /**
   * How many of the reader's lists hold an instrument; nought while the
   * answer is loading or could not be read, since a missing count is a
   * smaller mistake than a page that fails over one.
   */
  listsHolding: (instrumentKey: string) => number;
  /**
   * Which of the reader's lists hold an instrument, those kept updated too,
   * with any change `mark`ed since; null outside the provider or before the
   * first answer, when only the instrument's own reading can say.
   */
  heldBy: (instrumentKey: string) => ReadonlySet<number> | null;
  /**
   * Show a change at once, before the membership is read again: a menu's
   * tick turns the moment the platform takes the change, rather than a
   * second later, when every list kept updated has been worked out afresh
   * (the owner found adding to a list slow, 2026-11-10).
   */
  mark: (instrumentKey: string, watchlistId: number, held: boolean) => void;
  /** Read the membership again, after a list has changed. */
  refresh: () => void;
}

const NONE: WatchlistMembership = {
  listsHolding: () => 0,
  heldBy: () => null,
  mark: () => undefined,
  refresh: () => undefined,
};

/** Changes marked on one reading, by instrument then list; a fresh reading supersedes them. */
interface Marks {
  reading: unknown;
  changes: ReadonlyMap<string, ReadonlyMap<number, boolean>>;
}

const MembershipContext = createContext<WatchlistMembership>(NONE);

/**
 * Fetch the reader's membership and share it with everything inside.
 *
 * @param props - What is drawn inside.
 * @returns The children, with the membership available to them.
 */
export function WatchlistMembershipProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const load = useCallback(() => fetchWatchlistMembership(), []);
  const membership = useResource(load);
  const { data, reload } = membership;
  const [marks, setMarks] = useState<Marks>({ reading: null, changes: new Map() });
  const value = useMemo<WatchlistMembership>(() => {
    // Marks belong to the reading they were made on: once the platform has
    // been asked again, its answer already holds them.
    const changes =
      marks.reading === data ? marks.changes : new Map<string, ReadonlyMap<number, boolean>>();
    const heldBy = (instrumentKey: string): ReadonlySet<number> | null => {
      if (data === null) {
        return null;
      }
      const held = new Set(data[instrumentKey] ?? []);
      for (const [watchlistId, holds] of changes.get(instrumentKey) ?? []) {
        if (holds) {
          held.add(watchlistId);
        } else {
          held.delete(watchlistId);
        }
      }
      return held;
    };
    return {
      listsHolding: (instrumentKey) => heldBy(instrumentKey)?.size ?? 0,
      heldBy,
      mark: (instrumentKey, watchlistId, held) => {
        setMarks((before) => {
          const kept =
            before.reading === data
              ? before.changes
              : new Map<string, ReadonlyMap<number, boolean>>();
          const next = new Map(kept);
          next.set(
            instrumentKey,
            new Map([...(kept.get(instrumentKey) ?? []), [watchlistId, held]]),
          );
          return { reading: data, changes: next };
        });
      },
      refresh: reload,
    };
  }, [data, marks, reload]);
  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

/**
 * Read the reader's watchlist membership.
 *
 * @returns The counts and the way to refresh them.
 */
export function useWatchlistMembership(): WatchlistMembership {
  return useContext(MembershipContext);
}
