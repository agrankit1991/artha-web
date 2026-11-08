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
/** The plot every stubbed chart reports as its element: 400 by 200. */
export const chartElement = document.createElement("div");
Object.defineProperty(chartElement, "clientWidth", { value: 400 });
Object.defineProperty(chartElement, "clientHeight", { value: 200 });

export const chartCalls = {
  createChart: vi.fn(),
  addSeries: vi.fn(),
  setData: vi.fn(),
  createPriceLine: vi.fn(),
  takeScreenshot: vi.fn(),
  createSeriesMarkers: vi.fn(),
  setCrosshairPosition: vi.fn(),
  attachPrimitive: vi.fn(),
  detachPrimitive: vi.fn(),
  subscribeClick: vi.fn(),
  unsubscribeClick: vi.fn(),
  applyChartOptions: vi.fn(),
  clearCrosshairPosition: vi.fn(),
  setVisibleRange: vi.fn(),
  subscribeVisibleTimeRangeChange: vi.fn(),
  unsubscribeVisibleTimeRangeChange: vi.fn(),
  remove: vi.fn(),
  fitContent: vi.fn(),
  setVisibleLogicalRange: vi.fn(),
  subscribeVisibleLogicalRangeChange: vi.fn(),
  unsubscribeVisibleLogicalRangeChange: vi.fn(),
  subscribeCrosshairMove: vi.fn(),
  unsubscribeCrosshairMove: vi.fn(),
  applyOptions: vi.fn(),
  /** Called with the pane's index and the factor it was given. */
  setStretchFactor: vi.fn(),
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
    createChart: chartCalls.createChart.mockImplementation(() => {
      // Named, so a series can hand its chart to a primitive attached to it.
      const chart: Record<string, unknown> = {};
      return Object.assign(chart, {
        // A fresh object per call, so a chart keying a map by series holds
        // one entry per series rather than one in total.
        addSeries: chartCalls.addSeries.mockImplementation(() => {
          const series: Record<string, unknown> = {
            setData: chartCalls.setData,
            createPriceLine: chartCalls.createPriceLine,
            // Whatever the last series was handed, as the library would give back.
            data: () => (chartCalls.setData.mock.lastCall?.[0] as unknown[] | undefined) ?? [],
            // A price is its own pixel, so a test can say where a line sits.
            priceToCoordinate: (price: number): number => price,
            coordinateToPrice: (y: number): number => y,
          };
          // As the library does: a primitive is told its chart and series when
          // attached, and told it is let go when detached.
          series["attachPrimitive"] = (primitive: {
            attached?: (param: unknown) => void;
          }): void => {
            chartCalls.attachPrimitive(primitive);
            primitive.attached?.({ chart, series, requestUpdate: () => undefined });
          };
          series["detachPrimitive"] = (primitive: { detached?: () => void }): void => {
            chartCalls.detachPrimitive(primitive);
            primitive.detached?.();
          };
          return series;
        }),
        subscribeClick: chartCalls.subscribeClick,
        unsubscribeClick: chartCalls.unsubscribeClick,
        applyOptions: chartCalls.applyChartOptions,
        // One element for every chart in a test, so pointer events can be sent to it.
        chartElement: (): HTMLDivElement => chartElement,
        setCrosshairPosition: chartCalls.setCrosshairPosition,
        clearCrosshairPosition: chartCalls.clearCrosshairPosition,
        remove: chartCalls.remove,
        subscribeCrosshairMove: chartCalls.subscribeCrosshairMove,
        unsubscribeCrosshairMove: chartCalls.unsubscribeCrosshairMove,
        timeScale: () => ({
          fitContent: chartCalls.fitContent,
          setVisibleLogicalRange: chartCalls.setVisibleLogicalRange,
          subscribeVisibleLogicalRangeChange: chartCalls.subscribeVisibleLogicalRangeChange,
          unsubscribeVisibleLogicalRangeChange: chartCalls.unsubscribeVisibleLogicalRangeChange,
          setVisibleRange: chartCalls.setVisibleRange,
          // Each session's day of the month is its place across the plot, in tens.
          timeToCoordinate: (day: string): number => Number(day.slice(8, 10)) * 10,
          // Null off the time scale, as the library answers; the stub's runs 1-30 Sept.
          coordinateToTime: (x: number): string | null => {
            const day = Math.round(x / 10);
            return day < 1 || day > 30 ? null : `2026-09-${String(day).padStart(2, "0")}`;
          },
          // A bar's place across the plot, in the same tens, past the last bar too.
          logicalToCoordinate: (logical: number): number => logical * 10,
          coordinateToLogical: (x: number): number => Math.round(x / 10),
          subscribeVisibleTimeRangeChange: chartCalls.subscribeVisibleTimeRangeChange,
          unsubscribeVisibleTimeRangeChange: chartCalls.unsubscribeVisibleTimeRangeChange,
        }),
        priceScale: () => ({ applyOptions: chartCalls.applyOptions }),
        // A canvas that writes a fixed address, for a test of saving the image.
        takeScreenshot: chartCalls.takeScreenshot.mockImplementation(() => ({
          toDataURL: () => "data:image/png;base64,",
        })),
        // Three panes, so a test of a series in a band of its own has one to
        // be put in, and of two bands, two.
        panes: () =>
          [0, 1, 2].map((index) => ({
            setStretchFactor: (factor: number): void => {
              chartCalls.setStretchFactor(index, factor);
            },
          })),
      });
    }),
    LineSeries: "line",
    CandlestickSeries: "candlestick",
    HistogramSeries: "histogram",
    AreaSeries: "area",
    BarSeries: "bar",
    createSeriesMarkers: chartCalls.createSeriesMarkers,
    BaselineSeries: "baseline",
    // The library's own values, so a test can say which mode was asked for.
    PriceScaleMode: { Normal: 0, Logarithmic: 1, Percentage: 2, IndexedTo100: 3 },
    ColorType: { Solid: "solid" },
    CrosshairMode: { Magnet: 1, Normal: 0 },
    // The library's own values, so a line drawn dashed reads as it would.
    LineStyle: { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4 },
  };
}
