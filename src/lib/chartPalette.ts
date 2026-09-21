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

/**
 * The colours a chart of several instruments draws them in, in order.
 *
 * Distinct from the moving averages above: those mean a particular thing
 * wherever they appear, while these only have to be told apart. The first
 * is the price blue, because the first line on such a chart is the
 * instrument the page is about.
 */
const SERIES_COLOURS: readonly [string, ...string[]] = [
  PRICE_LINE,
  "#71717a",
  OSCILLATOR,
  "#d97706",
  "#a855f7",
];

/**
 * Hand out the series colours, repeating once they run out.
 *
 * @param colours - The wheel to cycle.
 * @yields Each colour in turn, for ever.
 */
function* cycle(colours: readonly [string, ...string[]]): Generator<string, never> {
  for (;;) {
    yield* colours;
  }
}

/**
 * Pair each thing to be drawn with the colour to draw it in.
 *
 * Handed out from an endless wheel rather than looked up by position,
 * deliberately. Indexing an array is `string | undefined` under this
 * project's compiler settings however certain the arithmetic makes us, so
 * indexing would need a fallback colour that could never be reached --
 * and an unreachable line is a claim about the code that is not true.
 *
 * @param items - What is to be drawn, in the order it should be coloured.
 * @returns The same things, each with a colour.
 */
export function coloured<Item>(items: readonly Item[]): (Item & { colour: string })[] {
  const wheel = cycle(SERIES_COLOURS);
  return items.map((item) => ({ ...item, colour: wheel.next().value }));
}
