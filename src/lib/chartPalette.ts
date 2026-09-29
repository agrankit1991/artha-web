/**
 * The colours every chart draws with, named for what they mean.
 *
 * One place, so two charts cannot disagree about what a moving average
 * looks like: a reader who has learnt that the heavy violet line is the
 * two-hundred-session average on one screen should not have to learn it
 * again on the next.
 *
 * Each is a reference to a token in `index.css` (`var(--chart-1)`), not a
 * colour, so the stylesheet decides the value for light and dark in one
 * place. `Chart` resolves a reference to its colour when it draws (the
 * canvas cannot read a token), and HTML beside a chart -- a legend swatch,
 * a compare chip -- uses the reference as it is and follows the theme by
 * itself.
 *
 * Rise, fall and caution are the market's colours and nothing else is drawn
 * in them: profit, earnings per share and fund holders each have a series
 * colour of their own, never the rising candle's green.
 */

/** A token of the stylesheet, as something a style or `Chart` can take. */
const token = (name: string): string => `var(--${name})`;

/**
 * The series colours, in the order they are handed out.
 *
 * Checked in both modes for colour blindness and normal vision between
 * neighbours; the first two are the logo's teal and orange.
 */
export const SERIES_COLOURS = [1, 2, 3, 4, 5, 6, 7].map((slot) => token(`chart-${String(slot)}`));

/** The most series one chart can colour apart; more have to be folded or split. */
export const MOST_SERIES = SERIES_COLOURS.length;

/** A session that closed up, and one that closed down: candles and volume. */
export const RISE = token("gain");
export const FALL = token("loss");

/**
 * A series with no colour of its own, in a legend or a crosshair reading:
 * candles, which are both colours at once.
 */
export const NEUTRAL = token("chart-text");

/**
 * The price itself, as a line or an area: the first series colour, because
 * the first line on any chart is the instrument the page is about.
 */
export const PRICE_LINE = token("chart-1");

/**
 * The forecast band: its middle in the price's own colour, dashed, and its
 * edges a lighter teal. A forecast of the price is drawn as the price's
 * likely range; the dashes keep it from being read as a record.
 */
export const FORECAST_MIDDLE = PRICE_LINE;
export const FORECAST_EDGE = token("chart-forecast-edge");

/** An oscillator in its own pane: the last series colour, blue. */
export const OSCILLATOR = token("chart-7");

/** A rule a series is read against: nought, a median, seventy and thirty. */
export const THRESHOLD = token("chart-threshold");

/** A benchmark drawn beside the subject: the index a playbook is judged against. */
export const BENCHMARK = token("chart-benchmark");

/** How far below its peak something stood. */
export const DRAWDOWN = FALL;

/** Reported figures, wherever they are drawn: revenue first, profit second. */
export const REVENUE = token("chart-1");
export const PROFIT = token("chart-2");
export const EARNINGS_PER_SHARE = token("chart-3");

/**
 * The moving averages.
 *
 * One hue, light to heavy as the average lengthens, so the weight of the
 * colour matches the weight a reader should give it: the twenty-session
 * line is noise most days, and the two-hundred is the one that decides
 * whether a market is in an uptrend at all. Violet, which no other line on
 * a price chart is. (They were green, orange and red until 2026-09-30, the
 * colours of a rise, a warning and a fall.)
 */
export const AVERAGE_COLOURS = {
  sma_20: token("chart-average-short"),
  sma_50: token("chart-average-medium"),
  sma_200: token("chart-average-long"),
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
 * Hand out the series colours in order, and refuse to start again.
 *
 * Cycling would give the eighth line the first line's colour, and two lines
 * in one colour on one chart are one line to a reader.
 *
 * @param colours - The colours, in order.
 * @yields Each colour once.
 * @throws {Error} When asked for one more than there are.
 */
function* inOrder(colours: readonly string[]): Generator<string, never> {
  yield* colours;
  throw new Error(
    `a chart can colour ${String(colours.length)} series apart; fold the rest or split the chart`,
  );
}

/**
 * Pair each thing to be drawn with the colour to draw it in.
 *
 * Handed out from a generator rather than looked up by position: indexing
 * an array is `string | undefined` under this project's compiler settings
 * however certain the arithmetic, and a generator that never returns is
 * typed as always yielding a colour.
 *
 * @param items - What is to be drawn, in the order it should be coloured.
 * @returns The same things, each with a colour.
 * @throws {Error} Given more than `MOST_SERIES` items.
 */
export function coloured<Item>(items: readonly Item[]): (Item & { colour: string })[] {
  const colours = inOrder(SERIES_COLOURS);
  return items.map((item) => ({ ...item, colour: colours.next().value }));
}
