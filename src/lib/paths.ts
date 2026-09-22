/**
 * Where every screen lives.
 *
 * One module, so no path is spelled out twice and nothing has to import
 * the application shell to link to a page -- which would make every page
 * that links anywhere depend on the thing that renders all of them.
 *
 * Keys carry bars and spaces (`NSE_INDEX|Nifty 50`, `NSE_EQ|INE002A01018`),
 * so they are encoded into a path rather than laid into it raw.
 */

/** The screens reachable from the navigation. */
export const PATHS = {
  overview: "/",
  breadth: "/breadth",
  news: "/news",
  earnings: "/earnings",
  flows: "/flows",
  indices: "/indices",
  screen: "/screen",
  compare: "/compare",
  futures: "/futures",
  movers: "/movers/top-gainers",
  watchlists: "/watchlists",
  sectors: "/sectors",
  ipos: "/ipos",
  funds: "/funds",
  profile: "/profile",
} as const;

/**
 * Where a population's own page is: a slug of its name, as in the
 * previous project, never the provider's key.
 *
 * @param kind - Whether it is an index or a sector.
 * @param key - The index's instrument key, or the sector's name.
 * @returns Something like `/index/nifty-50` or `/sector/it-software`.
 */
export function populationPath(kind: "index" | "sector", key: string): string {
  // An index's key carries its name after the segment (`NSE_INDEX|Nifty 50`);
  // a sector's key is its name.
  const name = kind === "index" ? key.slice(key.lastIndexOf("|") + 1) : key;
  return `/${kind}/${slug(name)}`;
}

/**
 * Where a company's own page is: its trading symbol, as in the previous
 * project, never the provider's key.
 *
 * @param instrumentKey - Either exchange's listing; both reach one page.
 * @param symbol - The listing's trading symbol.
 * @returns Something like `/company/RELIANCE`, or `/company/INE…` for a
 *   company that trades only on the BSE.
 */
export function companyPath(instrumentKey: string, symbol: string): string {
  // The NSE symbol where the company trades there. A BSE-only company goes by
  // its ISIN, which its key carries, because seven BSE symbols belong to a
  // different company on the NSE and the platform resolves a bare symbol to
  // the NSE one.
  const reference = instrumentKey.startsWith("NSE_EQ|")
    ? symbol
    : instrumentKey.slice(instrumentKey.lastIndexOf("|") + 1);
  return `/company/${encodeURIComponent(reference)}`;
}

/**
 * Write a name as an address segment: lower case, words joined by hyphens.
 *
 * The platform matches only the letters and digits, in order, so this can
 * change its punctuation without breaking an address already shared.
 *
 * @param name - An index's or a sector's name.
 * @returns Something like `nifty-50` or `it-software`.
 */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Where the news feed is, filtered to one company when asked.
 *
 * The symbol travels with the key because the feed shows what it is
 * filtered to, and a page arriving with only a key would either print the
 * key at a reader or fetch a whole list of companies to name one.
 *
 * @param instrumentKey - The company to filter to, if any.
 * @param symbol - What that company is called.
 * @returns The path.
 */
export function newsPath(instrumentKey?: string, symbol?: string): string {
  if (instrumentKey === undefined) {
    return PATHS.news;
  }
  const query = new URLSearchParams({ instrument: instrumentKey });
  if (symbol !== undefined) {
    query.set("symbol", symbol);
  }
  return `${PATHS.news}?${query.toString()}`;
}

/**
 * Where a mutual fund scheme's own page is.
 *
 * @param schemeCode - AMFI's identifier for the scheme.
 * @returns The path.
 */
export function fundPath(schemeCode: string): string {
  return `/fund/${encodeURIComponent(schemeCode)}`;
}

/**
 * Where a thing a search found lives.
 *
 * Stated once beside the other paths so a search result and a table row
 * lead to the same page for the same thing.
 *
 * @param hit - What was found: its kind, its key, and its label, which
 *   for a company is its symbol.
 * @returns The path.
 */
export function hitPath(hit: {
  kind: "company" | "index" | "sector" | "fund";
  key: string;
  label: string;
}): string {
  switch (hit.kind) {
    case "company":
      // A company hit is labelled with its symbol.
      return companyPath(hit.key, hit.label);
    case "index":
      return populationPath("index", hit.key);
    case "sector":
      return populationPath("sector", hit.key);
    case "fund":
      return fundPath(hit.key);
  }
}

/**
 * Where a public offering's own page is.
 *
 * @param ipoId - The provider's identifier for the offering.
 * @returns The path.
 */
export function ipoPath(ipoId: string): string {
  return `/ipo/${encodeURIComponent(ipoId)}`;
}

/**
 * The page of one watchlist.
 *
 * @param watchlistId - Which list.
 * @returns The path, with the list chosen in the query.
 */
export function watchlistPath(watchlistId: number): string {
  return `${PATHS.watchlists}?list=${String(watchlistId)}`;
}

/**
 * A comparison with these instruments already on it.
 *
 * @param keys - The instrument keys, in the order to draw them.
 * @returns The path.
 */
export function comparePath(keys: string[]): string {
  const parameters = new URLSearchParams();
  for (const key of keys) {
    parameters.append("keys", key);
  }
  return `${PATHS.compare}?${parameters.toString()}`;
}

/**
 * The page of one futures contract.
 *
 * @param instrumentKey - The contract.
 * @returns The path.
 */
export function futurePath(instrumentKey: string): string {
  return `/future/${encodeURIComponent(instrumentKey)}`;
}

/**
 * The full ranking of one mover list within a population.
 *
 * @param list - Which list.
 * @param kind - The whole market, an index or a sector.
 * @param key - Which index or sector, or null for the whole market.
 * @returns The path, with the population in the query.
 */
export function moversPath(list: string, kind = "companies", key: string | null = null): string {
  const parameters = new URLSearchParams({ scope_kind: kind });
  if (key !== null) {
    parameters.set("scope_key", key);
  }
  return `/movers/${list}?${parameters.toString()}`;
}
