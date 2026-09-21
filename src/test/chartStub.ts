/**
 * A stand-in for Lightweight Charts.
 *
 * The library draws onto a canvas, which jsdom does not have, so every test
 * that renders a chart replaces it with this. One copy rather than one per
 * test file: two stubs of the same library drift apart, and then a test
 * passes against a shape the library never had.
 */

import { vi } from "vitest";

/** The calls a test can assert on. */
export const chartCalls = {
  createChart: vi.fn(),
  addSeries: vi.fn(),
  setData: vi.fn(),
  createPriceLine: vi.fn(),
  remove: vi.fn(),
  fitContent: vi.fn(),
  setVisibleLogicalRange: vi.fn(),
  subscribeVisibleLogicalRangeChange: vi.fn(),
  unsubscribeVisibleLogicalRangeChange: vi.fn(),
  subscribeCrosshairMove: vi.fn(),
  unsubscribeCrosshairMove: vi.fn(),
  applyOptions: vi.fn(),
  setHeight: vi.fn(),
};

/**
 * Tell the chart the visible range has changed, as the library would.
 *
 * @param range - The range now showing, or null when there is none.
 */
export function reportRange(range: { from: number; to: number } | null): void {
  for (const [handler] of chartCalls.subscribeVisibleLogicalRangeChange.mock.calls) {
    (handler as (moved: typeof range) => void)(range);
  }
}

/**
 * The series the chart added, in the order it added them.
 *
 * The stub hands back the same object every time, so each call is given
 * its own marker: without one, a `Map` keyed by series would hold a
 * single entry however many were drawn.
 */
function addedSeries(): unknown[] {
  return chartCalls.addSeries.mock.results.map((result) => (result as { value: unknown }).value);
}

/**
 * Move the crosshair, as the library would.
 *
 * @param day - The session it is over, or undefined for off the plot.
 * @param figures - What each series was worth there, in the order the
 *   series were drawn. A bare number is a line's value; `{ close }` is a
 *   candle; an empty object is a session the series has no point for.
 * @param point - Where in the plot the cursor sits.
 */
export function moveCrosshair(
  day: string | undefined,
  figures: (number | { close: number } | Record<string, never>)[] = [],
  point: { x: number; y: number } = { x: 1, y: 1 },
): void {
  const drawn = addedSeries();
  const seriesData = new Map(
    figures.map(
      (figure, position) =>
        [drawn[position], typeof figure === "number" ? { value: figure } : figure] as const,
    ),
  );
  for (const [handler] of chartCalls.subscribeCrosshairMove.mock.calls) {
    (handler as (event: unknown) => void)(
      day === undefined ? {} : { time: day, point, seriesData },
    );
  }
}

/** Which kind of series each `addSeries` call asked for, in order. */
export function seriesKinds(): unknown[] {
  return chartCalls.addSeries.mock.calls.map((call) => (call as unknown[])[0]);
}

/** Which pane each `addSeries` call asked for, in order. */
export function seriesPanes(): unknown[] {
  return chartCalls.addSeries.mock.calls.map((call) => (call as unknown[])[2]);
}

/** The data handed to the series of a given kind, if one was added. */
export function dataFor(kind: string): unknown[] | undefined {
  const at = seriesKinds().indexOf(kind);
  return at === -1 ? undefined : (chartCalls.setData.mock.calls[at]?.[0] as unknown[]);
}

/**
 * Build the module a `vi.mock` factory should return.
 *
 * @returns The library's surface, as far as this application uses it.
 */
export function chartModule(): Record<string, unknown> {
  return {
    createChart: chartCalls.createChart.mockImplementation(() => ({
      // A fresh object per call, so a chart keying a map by series holds
      // one entry per series rather than one in total.
      addSeries: chartCalls.addSeries.mockImplementation(() => ({
        setData: chartCalls.setData,
        createPriceLine: chartCalls.createPriceLine,
      })),
      remove: chartCalls.remove,
      subscribeCrosshairMove: chartCalls.subscribeCrosshairMove,
      unsubscribeCrosshairMove: chartCalls.unsubscribeCrosshairMove,
      timeScale: () => ({
        fitContent: chartCalls.fitContent,
        setVisibleLogicalRange: chartCalls.setVisibleLogicalRange,
        subscribeVisibleLogicalRangeChange: chartCalls.subscribeVisibleLogicalRangeChange,
        unsubscribeVisibleLogicalRangeChange: chartCalls.unsubscribeVisibleLogicalRangeChange,
      }),
      priceScale: () => ({ applyOptions: chartCalls.applyOptions }),
      // Two panes, so a test of a series in a band of its own has one to
      // be put in.
      panes: () => [{ setHeight: chartCalls.setHeight }, { setHeight: chartCalls.setHeight }],
    })),
    LineSeries: "line",
    CandlestickSeries: "candlestick",
    HistogramSeries: "histogram",
    AreaSeries: "area",
    ColorType: { Solid: "solid" },
    CrosshairMode: { Magnet: 1, Normal: 0 },
  };
}
