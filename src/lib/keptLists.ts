/**
 * Which kept list the watchlist page shows, as its address says.
 *
 * A kept list is named by its kind and key -- `?kept=index&key=NSE_INDEX|Nifty
 * 50` -- so it is a link and Back returns to it, as one of the reader's own
 * lists is with `?list=`. A list opened from another (an index from its
 * category) also carries where it came from, `from=indices:SECTORAL`, for the
 * way back. Read and written here only, so the tree, the list and the way in
 * from a row cannot disagree about the spelling.
 */

import type { KeptKind, KeptSource } from "@/api/client";

const KINDS: readonly KeptKind[] = ["index", "sector", "indices", "movers", "strategy"];

/** A kept list, and the one it was opened from. */
export interface KeptChoice {
  source: KeptSource;
  /** The list it was opened from, for the way back; null when chosen directly. */
  from: KeptSource | null;
}

function isKind(value: string | null): value is KeptKind {
  return value !== null && (KINDS as readonly string[]).includes(value);
}

/**
 * Read the kept list an address names.
 *
 * @param params - The address's query.
 * @returns The list and where it was opened from, or null when it names none
 *   or names it wrongly.
 */
export function keptFromParams(params: URLSearchParams): KeptChoice | null {
  const kind = params.get("kept");
  const key = params.get("key");
  if (!isKind(kind) || key === null || key === "") {
    return null;
  }
  return { source: { kind, key }, from: parseFrom(params.get("from")) };
}

/** Read `kind:key`, the key itself possibly holding colons. */
function parseFrom(value: string | null): KeptSource | null {
  if (value === null) {
    return null;
  }
  const at = value.indexOf(":");
  const kind = value.slice(0, at);
  const key = value.slice(at + 1);
  return at > 0 && isKind(kind) && key !== "" ? { kind, key } : null;
}

/**
 * Write a kept list into an address, leaving the rest of it as it was but
 * for the reader's own list, which it replaces.
 *
 * @param params - The address's query now.
 * @param source - The list to show.
 * @param from - The list it is opened from, or null.
 * @returns The new query.
 */
export function keptParams(
  params: URLSearchParams,
  source: KeptSource,
  from: KeptSource | null = null,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete("list");
  next.set("kept", source.kind);
  next.set("key", source.key);
  if (from === null) {
    next.delete("from");
  } else {
    next.set("from", `${from.kind}:${from.key}`);
  }
  return next;
}

/**
 * Take a kept list out of an address, as when one of the reader's own is chosen.
 *
 * @param params - The address's query now.
 * @returns The query without it.
 */
export function withoutKept(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete("kept");
  next.delete("key");
  next.delete("from");
  return next;
}

/**
 * Whether two sources name the same list.
 *
 * @param one - A source.
 * @param other - Another, or null.
 * @returns True when kind and key agree.
 */
export function sameKept(one: KeptSource, other: KeptSource | null): boolean {
  return other !== null && one.kind === other.kind && one.key === other.key;
}
