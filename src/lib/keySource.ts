/**
 * Where a list's instruments come from, for anything that takes a whole
 * list off a page: saving it as a watchlist, adding it to one, exporting it
 * to TradingView.
 *
 * Most lists are held whole by their page, and hand over their rows' keys.
 * A list grown a page at a time -- the screener shows fifty and loads more
 * -- holds only the start of what matched, and a list taken from its rows
 * would silently stop short; it hands over a function that fetches the rest.
 */

/** A list's instrument keys in its order, or how to fetch up to `most` of them. */
export type KeySource = readonly string[] | ((most: number) => Promise<string[]>);

/** A list's instruments, as many as were wanted. */
export interface CollectedKeys {
  /** Each instrument once, in the list's order. */
  keys: string[];
  /** Whether the list held more than were wanted, so the rest were left out. */
  over: boolean;
}

/** Where collecting a list has got to, for a dialog waiting on it. */
export type KeyCollection =
  | { phase: "collecting" }
  | { phase: "ready"; collected: CollectedKeys }
  | { phase: "failed"; message: string };

/**
 * Collect a list's instruments.
 *
 * @param source - The keys, or the function fetching them.
 * @param most - How many are wanted at most.
 * @returns The first `most` distinct keys, and whether there were more.
 * @throws Whatever the fetching function throws.
 */
export async function collectKeys(source: KeySource, most: number): Promise<CollectedKeys> {
  // One more than is taken, so that a list which overruns is known to.
  const found = typeof source === "function" ? await source(most + 1) : source;
  const unique = [...new Set(found)];
  return { keys: unique.slice(0, most), over: unique.length > most };
}

/**
 * The keys of a list's rows that have one: a company no longer listed (in
 * a deal, an index change, a results season) has none, and nothing to save.
 *
 * @param keys - Each row's key, or null.
 * @returns The keys there are, in order.
 */
export function presentKeys(keys: readonly (string | null)[]): string[] {
  return keys.filter((key): key is string => key !== null);
}

/**
 * Whether a source certainly holds nothing: an empty list of keys. A
 * function might still find some, so it is never empty.
 *
 * @param source - The keys, or the function fetching them.
 * @returns True for an empty array only.
 */
export function holdsNothing(source: KeySource): boolean {
  return typeof source !== "function" && source.length === 0;
}
