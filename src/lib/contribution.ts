/**
 * How much of an index's move each member made.
 *
 * Tickertape's "return attribution": a member's share of the move is its
 * weight in the index times its own move. The weights here are each
 * member's share of the members' combined market capitalisation -- the
 * platform holds market capitalisation, not the free float an exchange
 * weights by -- so the figures are an approximation, and every screen
 * that shows them says so.
 */

import { toNumber } from "@/lib/format";

/** What a member needs for its contribution to be worked out. */
export interface Weighable {
  instrument_key: string;
  /** Crore; null when its share count is not held. */
  market_cap: string | null;
  change_percent: string | null;
}

/** One member's weight and its part in the day's move. */
export interface Contribution {
  /** Share of the combined capitalisation, in per cent. */
  weight: number;
  /** Its part of the index's move, in percentage points. */
  percent: number;
  /** The same, in index points; null without the index's previous level. */
  points: number | null;
}

/**
 * Work out each member's contribution.
 *
 * Members without a capitalisation or a move are left out of the weights
 * altogether, so the others' weights still sum to a hundred.
 *
 * @param members - The index's members.
 * @param previousLevel - The index's previous close, to turn percentage
 *   points into index points; null for a population with no level, such as
 *   a sector.
 * @returns Contributions by instrument key.
 */
export function contributions(
  members: readonly Weighable[],
  previousLevel: number | null,
): Map<string, Contribution> {
  const weighed = members.flatMap((one) => {
    const cap = toNumber(one.market_cap);
    const change = toNumber(one.change_percent);
    return cap === null || cap <= 0 || change === null
      ? []
      : [{ key: one.instrument_key, cap, change }];
  });
  const total = weighed.reduce((sum, one) => sum + one.cap, 0);
  const found = new Map<string, Contribution>();
  if (total === 0) {
    return found;
  }
  for (const one of weighed) {
    const weight = (one.cap / total) * 100;
    const percent = (weight * one.change) / 100;
    found.set(one.key, {
      weight,
      percent,
      points: previousLevel === null ? null : (previousLevel * percent) / 100,
    });
  }
  return found;
}
