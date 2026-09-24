/**
 * The indices this application puts in front of a reader by default.
 *
 * A display choice rather than data, and one place for it: the overview
 * draws these as cards and the breadth page offers them as filters, and two
 * copies of the list is how those two screens start disagreeing about which
 * indices matter.
 *
 * The order is the one carried over from the previous incarnation of this
 * project -- the broad market first, then the size tiers, then a sector and
 * finally volatility -- because it is a decision already made rather than
 * one worth making again.
 */

/** An index offered by name rather than by key. */
export interface FeaturedIndex {
  /** The instrument key, as the platform stores it. */
  key: string;
  /** What to call it, which is shorter than what the exchange calls it. */
  name: string;
}

/** The Nifty 50, which the strategies' market switch also watches. */
export const NIFTY_50: FeaturedIndex = { key: "NSE_INDEX|Nifty 50", name: "Nifty 50" };

/** The Nifty 500, which the strategies' returns are measured against. */
export const NIFTY_500: FeaturedIndex = { key: "NSE_INDEX|Nifty 500", name: "Nifty 500" };

/** The headline indices, in the order they are shown. */
export const FEATURED_INDICES: readonly FeaturedIndex[] = [
  NIFTY_50,
  { key: "BSE_INDEX|SENSEX", name: "Sensex" },
  { key: "NSE_INDEX|Nifty Next 50", name: "Nifty Next 50" },
  { key: "NSE_INDEX|NIFTY MID SELECT", name: "Nifty Midcap Select" },
  { key: "NSE_INDEX|NIFTY SMLCAP 100", name: "Nifty Smallcap 100" },
  NIFTY_500,
  { key: "NSE_INDEX|Nifty Bank", name: "Bank Nifty" },
  { key: "NSE_INDEX|India VIX", name: "India VIX" },
];

/**
 * The index a comparison is drawn against by default.
 *
 * The broadest of the headline indices that is also the most recognised.
 */
export const BENCHMARK = NIFTY_50;

/**
 * Gold, as a price series this platform actually holds continuously.
 *
 * Not an MCX futures contract, deliberately. A contract expires: the
 * longest single gold contract stored here covers 226 sessions, and
 * stitching several into one series needs a declared roll rule that does
 * not exist yet. The exchange-traded fund has traded since 2007 without a
 * roll, is priced in rupees, and tracks the domestic gold price -- which is
 * what a "gold against the index" comparison is asking about. It carries a
 * fund's expense ratio, so over years it drifts slightly below spot; over
 * the months this comparison covers, that is invisible.
 */
export const GOLD: FeaturedIndex = { key: "NSE_EQ|INF204KB17I5", name: "Gold (GOLDBEES)" };

/** What each category an exchange files an index under is called on a page. */
const CATEGORY_LABELS: Record<string, string> = {
  BROAD_MARKET: "Broad market",
  SECTORAL: "Sectoral",
  THEMATIC: "Thematic",
  STRATEGY: "Strategy",
  FIXED_INCOME: "Fixed income",
};

/**
 * Name an index's category for a reader.
 *
 * @param category - The platform's code, such as `BROAD_MARKET`.
 * @returns Its label, or the code itself when it is one not yet named.
 */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
