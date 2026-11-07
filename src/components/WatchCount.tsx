/**
 * How many of the reader's watchlists hold a company: a small star and a
 * number beside its symbol, wherever the company is a row.
 *
 * Nothing at all when it is on none, so a table of the whole market is not
 * a column of noughts. The star is the watchlist's mark and its brand
 * colour, the same as the favourite star on the watchlist page, and the
 * number is said in words for a screen reader rather than left to the icon.
 */

import { Star } from "lucide-react";

import { useWatchlistMembership } from "@/lib/watchlistMembership";

interface WatchCountProps {
  instrumentKey: string;
  /** What to call it when the count is read aloud. */
  symbol: string;
}

/**
 * Render the count, or nothing.
 *
 * @param props - The instrument.
 * @returns The mark, or null when no list holds it.
 */
export function WatchCount({ instrumentKey, symbol }: WatchCountProps): React.JSX.Element | null {
  const count = useWatchlistMembership().listsHolding(instrumentKey);
  if (count === 0) {
    return null;
  }
  const said = `${symbol} is on ${String(count)} of your watchlists`;
  return (
    <span
      role="img"
      aria-label={count === 1 ? `${symbol} is on one of your watchlists` : said}
      title={count === 1 ? "On one of your watchlists" : `On ${String(count)} of your watchlists`}
      className="inline-flex shrink-0 items-center gap-0.5 text-xs tabular text-brand"
    >
      <Star aria-hidden="true" className="h-3 w-3 fill-current" />
      {count}
    </span>
  );
}
