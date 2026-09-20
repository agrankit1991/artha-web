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
  remove: vi.fn(),
  fitContent: vi.fn(),
};

/**
 * Build the module a `vi.mock` factory should return.
 *
 * @returns The library's surface, as far as this application uses it.
 */
export function chartModule(): Record<string, unknown> {
  return {
    createChart: chartCalls.createChart.mockImplementation(() => ({
      addSeries: chartCalls.addSeries.mockImplementation(() => ({
        setData: chartCalls.setData,
      })),
      remove: chartCalls.remove,
      timeScale: () => ({ fitContent: chartCalls.fitContent }),
    })),
    LineSeries: "line",
    ColorType: { Solid: "solid" },
    CrosshairMode: { Magnet: 1 },
  };
}
