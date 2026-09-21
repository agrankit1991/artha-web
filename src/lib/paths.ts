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
  indices: "/indices",
  sectors: "/sectors",
  ipos: "/ipos",
  funds: "/funds",
  profile: "/profile",
} as const;

/**
 * Where a population's own page is.
 *
 * @param kind - Whether it is an index or a sector.
 * @param key - Which one.
 * @returns The path.
 */
export function populationPath(kind: "index" | "sector", key: string): string {
  return `/${kind}/${encodeURIComponent(key)}`;
}

/**
 * Where a company's own page is.
 *
 * @param instrumentKey - Either exchange's listing; both reach one page.
 * @returns The path.
 */
export function companyPath(instrumentKey: string): string {
  return `/company/${encodeURIComponent(instrumentKey)}`;
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
 * @param kind - What kind of thing it is.
 * @param key - What its page is reached by.
 * @returns The path.
 */
export function hitPath(kind: "company" | "index" | "sector" | "fund", key: string): string {
  switch (kind) {
    case "company":
      return companyPath(key);
    case "index":
      return populationPath("index", key);
    case "sector":
      return populationPath("sector", key);
    case "fund":
      return fundPath(key);
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
