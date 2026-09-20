/**
 * The colours every chart draws with.
 *
 * One place, so two charts cannot disagree about what a moving average
 * looks like. A reader who has learnt that the red line is the
 * two-hundred-session average on one screen should not have to learn it
 * again on the next.
 *
 * These are deliberately apart from the theme's accent: an accent recolours
 * the interface, and a chart's own series have to stay recognisable
 * whichever accent is chosen. Chosen to read on both a white and a dark
 * surface, which rules out the palest shades.
 */

/** A rising candle, and a falling one. */
export const CANDLE_UP = "#16a34a";
export const CANDLE_DOWN = "#dc2626";

/** Volume, tinted by which way the session closed and kept faint. */
export const VOLUME_UP = "rgba(22,163,74,0.35)";
export const VOLUME_DOWN = "rgba(220,38,38,0.35)";

/** The price itself, when drawn as a line or an area rather than candles. */
export const PRICE_LINE = "#2563eb";

/** An oscillator, and the rules it is read against. */
export const OSCILLATOR = "#0ea5e9";
export const THRESHOLD = "#a1a1aa";

/**
 * The moving averages.
 *
 * Light to heavy as the average lengthens, so the weight of the colour
 * matches the weight a reader should give it: the twenty-session line is
 * noise most days, and the two-hundred is the one that decides whether a
 * market is in an uptrend at all.
 */
export const AVERAGE_COLOURS = {
  sma_20: "#4ade80",
  sma_50: "#fb923c",
  sma_200: "#ef4444",
} as const;

/**
 * How thick a series is drawn.
 *
 * The averages are thin deliberately. Three of them over a price at two
 * pixels each is a chart of moving averages with a price somewhere behind
 * it, which is backwards.
 */
export const AVERAGE_WIDTH = 1;
export const PRICE_WIDTH = 2;
