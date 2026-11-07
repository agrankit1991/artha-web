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

import { createContext, useCallback, useContext, useMemo } from "react";

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
  /** Read the membership again, after a list has changed. */
  refresh: () => void;
}

const NONE: WatchlistMembership = {
  listsHolding: () => 0,
  refresh: () => undefined,
};

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
  const value = useMemo<WatchlistMembership>(
    () => ({
      listsHolding: (instrumentKey) => data?.[instrumentKey]?.length ?? 0,
      refresh: reload,
    }),
    [data, reload],
  );
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
