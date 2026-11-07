/**
 * A list of instruments, as the text a TradingView watchlist takes.
 *
 * TradingView's own "Add symbol" box and its list import -- and the
 * platforms built on it, such as Upstox's tv.upstox.com -- take symbols
 * written `EXCHANGE:TICKER` and separated by commas. The symbols are the
 * ones the weekly job recorded that TradingView calls each instrument, not
 * a ticker with an exchange put in front of it: TradingView rewrites some
 * (`BAJAJ-AUTO` is `BAJAJ_AUTO` there), and an invented one imports as a
 * dead entry.
 *
 * A watchlist holds only so many symbols and refuses a paste that overruns
 * it, so a long list is cut into parts of whatever size the reader's own
 * plan allows rather than at one limit that is right for nobody.
 */

import { fetchExternalSymbols } from "@/api/client";
import type { ExportSize } from "@/lib/preferences";

/** How many instruments the platform answers about in one request. */
const LOOKUP = 50;

/**
 * The most instruments one export takes.
 *
 * What it costs to look up rather than a limit of any watchlist: a
 * thousand symbols is twenty requests, and a list longer than that is not
 * one anybody is going to paste into a dozen watchlists.
 */
export const MOST_EXPORTED = 1000;

/** What TradingView calls a list of instruments, and what could not be matched. */
export interface Symbols {
  /** The symbols, in the list's order, each once. */
  symbols: string[];
  /** How many of them were worked out from a ticker rather than confirmed. */
  unconfirmed: number;
  /** How many instruments TradingView has no symbol for, and so are left out. */
  missing: number;
}

/**
 * Find what TradingView calls each instrument.
 *
 * @param keys - The instruments, in the order the list shows them.
 * @returns Their symbols in that order. An instrument TradingView does not
 *   carry is counted and left out rather than guessed at: a wrong symbol
 *   in a pasted list looks like a right one until it is opened.
 */
export async function symbolsFor(keys: readonly string[]): Promise<Symbols> {
  const wanted = [...new Set(keys)];
  const batches: string[][] = [];
  for (let at = 0; at < wanted.length; at += LOOKUP) {
    batches.push(wanted.slice(at, at + LOOKUP));
  }
  const answers = await Promise.all(batches.map((batch) => fetchExternalSymbols(batch)));
  const known = new Map(answers.flatMap((answer) => Object.entries(answer)));

  const symbols: string[] = [];
  const seen = new Set<string>();
  let unconfirmed = 0;
  let missing = 0;
  for (const key of wanted) {
    const one = known.get(key);
    if (one === undefined) {
      missing += 1;
    } else if (!seen.has(one.symbol)) {
      // Two instruments can share a symbol; a list names it once.
      seen.add(one.symbol);
      symbols.push(one.symbol);
      unconfirmed += one.derived ? 1 : 0;
    }
  }
  return { symbols, unconfirmed, missing };
}

/**
 * Cut a list into the parts a watchlist can hold.
 *
 * @param symbols - The whole list.
 * @param size - How many each part holds, or `all` for one part.
 * @returns The parts, in order; none for an empty list.
 */
export function partsOf(symbols: readonly string[], size: ExportSize): string[][] {
  const each = size === "all" ? symbols.length : Number(size);
  const parts: string[][] = [];
  for (let at = 0; at < symbols.length; at += each) {
    parts.push(symbols.slice(at, at + each));
  }
  return parts;
}

/**
 * Write symbols the way TradingView reads them.
 *
 * @param symbols - The symbols.
 * @returns One line, comma-separated, with no spaces.
 */
export function listText(symbols: readonly string[]): string {
  return symbols.join(",");
}
