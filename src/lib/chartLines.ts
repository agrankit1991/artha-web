/**
 * The lines a reader may restyle, each with its name and the chart's own way
 * of drawing it (the owner, 2026-11-08: "I should be able to choose colors
 * and thickness of lines, including indicators").
 *
 * One catalogue, so the dialog that styles them, the price chart that draws
 * them and the drawings cannot disagree about which lines there are. A key
 * is what the platform keeps a style under (`/api/line-styles/{key}`), so
 * renaming one forgets every reader's style for it. Candles, volume and the
 * compare lines are not here: the first two are drawn in a rise's and a
 * fall's colours, and a compare line's colour tells one instrument from
 * another, handed out in order.
 */

import {
  AVERAGE_COLOURS,
  AVERAGE_WIDTH,
  DRAWING,
  DRAWING_WIDTH,
  FORECAST_EDGE,
  FORECAST_MIDDLE,
  OSCILLATOR,
  PRICE_LINE,
  PRICE_WIDTH,
} from "@/lib/chartPalette";

/** How a line is drawn: a colour (a token or `#rrggbb`) and a width in pixels. */
export interface LineLook {
  colour: string;
  width: number;
}

/** A line the reader may restyle: what it is called, and how the chart draws it. */
export interface ChartLine extends LineLook {
  label: string;
}

export const CHART_LINES = {
  price: { label: "Price", colour: PRICE_LINE, width: PRICE_WIDTH },
  sma_20: { label: "SMA 20", colour: AVERAGE_COLOURS.sma_20, width: AVERAGE_WIDTH },
  sma_50: { label: "SMA 50", colour: AVERAGE_COLOURS.sma_50, width: AVERAGE_WIDTH },
  sma_200: { label: "SMA 200", colour: AVERAGE_COLOURS.sma_200, width: AVERAGE_WIDTH },
  rsi: { label: "RSI", colour: OSCILLATOR, width: AVERAGE_WIDTH },
  forecast_edges: { label: "Forecast 90% and 10%", colour: FORECAST_EDGE, width: AVERAGE_WIDTH },
  forecast_middle: { label: "Forecast middle", colour: FORECAST_MIDDLE, width: AVERAGE_WIDTH },
  // Every drawing without a colour or width of its own.
  drawing: { label: "Drawings", colour: DRAWING, width: DRAWING_WIDTH },
} as const satisfies Record<string, ChartLine>;

/** Which line: a key of the catalogue. */
export type LineKey = keyof typeof CHART_LINES;

/** The lines, in the order the dialog lists them. */
export const LINE_KEYS = Object.keys(CHART_LINES) as LineKey[];

/** The widths a reader may choose, in pixels: what the platform keeps. */
export const LINE_WIDTHS = [1, 2, 3, 4] as const;
