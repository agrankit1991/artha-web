/**
 * The spans a price chart offers, and how many points each draws.
 *
 * One more point than the platform's return windows (21, 63, 126 and 252
 * sessions, `SESSIONS_IN_*` in the platform's `domain/overview.py`),
 * because a line of N points spans N - 1 sessions of change. Before
 * 2026-09-30 the chart's "1Y" was 250 points, so a comparison's legend
 * said RELIANCE -11.79% over "1Y" beside a table saying -13.36%: two
 * windows under one name. Now a line over "1Y" starts on the close the
 * year's return is measured from, and the two agree.
 *
 * Five years is five of the platform's years. `Max` is the endpoint's own
 * ceiling rather than a guess at how much history exists: asking for more
 * than an instrument has simply returns what it has.
 */

/** One span on offer, and how many sessions it draws. */
export interface Range {
  label: string;
  sessions: number;
}

export const PRICE_RANGES: readonly Range[] = [
  { label: "1M", sessions: 22 },
  { label: "3M", sessions: 64 },
  { label: "6M", sessions: 127 },
  { label: "1Y", sessions: 253 },
  { label: "5Y", sessions: 1261 },
  { label: "Max", sessions: 12500 },
];

/** The year, which a chart opens at until a reader chooses otherwise. */
export const DEFAULT_RANGE = 253;

/** The spans stored before the ranges were aligned, carried to what they meant. */
const RANGES_BEFORE: Readonly<Record<number, number>> = {
  21: 22,
  65: 64,
  125: 127,
  250: 253,
  1250: 1261,
};

/**
 * A stored span as one the chart offers.
 *
 * @param stored - What was stored, of any shape.
 * @returns The span, carried from an older one where it was one; the
 *   default for anything else.
 */
export function rangeFrom(stored: unknown): number {
  if (typeof stored !== "number") {
    return DEFAULT_RANGE;
  }
  if (PRICE_RANGES.some((range) => range.sessions === stored)) {
    return stored;
  }
  return RANGES_BEFORE[stored] ?? DEFAULT_RANGE;
}
