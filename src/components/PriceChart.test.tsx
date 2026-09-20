/**
 * Tests for the candlestick chart.
 *
 * Lightweight Charts draws onto a canvas, which jsdom does not have, so
 * the library is stubbed. What that leaves testable is what this component
 * is responsible for: which series it asks for, what it hands them, and
 * the states where there is nothing to draw.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PriceChart } from "./PriceChart";
import { chartCalls, dataFor, seriesKinds } from "@/test/chartStub";
import { chartPoints } from "@/test/support";
import { ThemeProvider } from "@/lib/theme";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

function draw(points: Parameters<typeof PriceChart>[0]["points"]): void {
  render(
    <ThemeProvider>
      <PriceChart points={points} />
    </ThemeProvider>,
  );
}

describe("PriceChart", () => {
  it("draws candles, what was traded, and the three averages", () => {
    draw(chartPoints(10));

    expect(seriesKinds()).toEqual(["candlestick", "histogram", "line", "line", "line"]);
  });

  it("hands the candles all four prices of each session", () => {
    draw(chartPoints(3));

    expect(dataFor("candlestick")).toEqual([
      { time: "2026-09-01", open: 100, high: 104, low: 99, close: 103 },
      { time: "2026-09-02", open: 101, high: 105, low: 100, close: 104 },
      { time: "2026-09-03", open: 102, high: 106, low: 101, close: 105 },
    ]);
  });

  it("keeps volume off the price scale", () => {
    // On one scale with the price, volume is either invisible or it
    // flattens the candles into a line.
    draw(chartPoints(3));

    const [, volume] = chartCalls.addSeries.mock.calls;
    expect(volume?.[1]).toMatchObject({ priceScaleId: "volume" });
    expect(chartCalls.applyOptions).toHaveBeenCalledWith(
      expect.objectContaining({ scaleMargins: { top: 0.8, bottom: 0 } }),
    );
  });

  it("colours a session's volume by which way it closed", () => {
    draw([
      ...chartPoints(1),
      { ...chartPoints(1)[0], day: "2026-09-02", open: "110", close: "100" } as never,
    ]);

    const traded = dataFor("histogram") as { color: string }[];
    expect(traded[0]?.color).toContain("22,163,74");
    expect(traded[1]?.color).toContain("220,38,38");
  });

  it("leaves out the sessions an average does not exist for yet", () => {
    // Drawn as nought they would put a cliff at the start of every line.
    const points = chartPoints(3).map((point, index) =>
      index === 0 ? { ...point, sma_200: null } : point,
    );

    draw(points);

    expect(dataFor("line")).toHaveLength(3);
    const long = chartCalls.setData.mock.calls[4]?.[0] as unknown[];
    expect(long).toHaveLength(2);
  });

  it("names each average rather than leaving three unlabelled lines", () => {
    draw(chartPoints(5));

    expect(screen.getByText("20-day")).toBeInTheDocument();
    expect(screen.getByText("50-day")).toBeInTheDocument();
    expect(screen.getByText("200-day")).toBeInTheDocument();
  });

  it("draws itself in the theme the rest of the page is in", () => {
    // A chart keeping its own light palette on a dark page is the most
    // visible way a theme can be half-applied.
    window.localStorage.setItem("artha-theme", "dark");
    draw(chartPoints(5));
    const dark = chartCalls.createChart.mock.calls[0]?.[1] as {
      layout: { textColor: string };
      grid: { vertLines: { color: string } };
    };

    vi.clearAllMocks();
    window.localStorage.setItem("artha-theme", "light");
    draw(chartPoints(5));
    const light = chartCalls.createChart.mock.calls[0]?.[1] as {
      layout: { textColor: string };
      grid: { vertLines: { color: string } };
    };

    expect(dark.layout.textColor).not.toBe(light.layout.textColor);
    expect(dark.grid.vertLines.color).not.toBe(light.grid.vertLines.color);
  });

  it("says there is nothing to draw rather than drawing an empty box", () => {
    draw([]);

    expect(screen.getByText("No sessions to draw")).toBeInTheDocument();
  });

  it("holds its height while the sessions are on their way", () => {
    render(
      <ThemeProvider>
        <PriceChart points={null} loading />
      </ThemeProvider>,
    );

    expect(screen.getByRole("img")).toHaveAccessibleName("Price chart loading");
  });

  it("lets go of the chart when the page moves on", () => {
    const { unmount } = render(
      <ThemeProvider>
        <PriceChart points={chartPoints(3)} />
      </ThemeProvider>,
    );

    unmount();

    expect(chartCalls.remove).toHaveBeenCalled();
  });
});
