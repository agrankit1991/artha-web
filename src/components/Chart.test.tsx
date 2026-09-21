/**
 * Tests for the one chart.
 *
 * Lightweight Charts draws onto a canvas, which jsdom does not have, so
 * the library is stubbed. What that leaves testable is what this component
 * is responsible for: which series it asks the library for, what it hands
 * them, the legend, the links, and the states where there is nothing to
 * draw.
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Chart, type Series } from "./Chart";
import { chartCalls, dataFor, moveCrosshair, reportRange, seriesKinds } from "@/test/chartStub";
import { ThemeProvider } from "@/lib/theme";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

const LINE: Series = {
  kind: "line",
  label: "Nifty 50",
  colour: "#2563eb",
  points: [
    { time: "2026-09-01", value: 0 },
    { time: "2026-09-02", value: 5 },
  ],
};

/**
 * Give the plot a size, which jsdom otherwise reports as nought.
 *
 * @param width - The plot's width.
 * @param height - Its height.
 */
function sizePlot(width: number, height: number): void {
  const plot = screen.getByTestId("chart");
  Object.defineProperty(plot, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(plot, "clientHeight", { value: height, configurable: true });
}

function draw(series: Series[], props: Partial<Parameters<typeof Chart>[0]> = {}): void {
  render(
    <ThemeProvider>
      <Chart series={series} {...props} />
    </ThemeProvider>,
  );
}

describe("Chart", () => {
  it("asks the library for the kind of series it was given", () => {
    draw([
      {
        kind: "candles",
        label: "Price",
        points: [{ time: "2026-09-01", open: 1, high: 2, low: 0, close: 1 }],
      },
      { kind: "bars", label: "Volume", points: [{ time: "2026-09-01", value: 10 }] },
      LINE,
    ]);

    expect(seriesKinds()).toEqual(["candlestick", "histogram", "line"]);
  });

  it("hands each series its own points", () => {
    draw([LINE]);

    expect(dataFor("line")).toEqual(LINE.points);
  });

  it("keeps bar series off the price scale", () => {
    // On one scale with the price, volume is either invisible or it
    // flattens the price into a line.
    draw([LINE, { kind: "bars", label: "Volume", points: [{ time: "2026-09-01", value: 9 }] }]);

    expect(chartCalls.applyOptions).toHaveBeenCalledWith(
      expect.objectContaining({ scaleMargins: { top: 0.8, bottom: 0 } }),
    );
  });

  it("leaves no room at the bottom when nothing is pinned there", () => {
    draw([LINE]);

    const options = chartCalls.createChart.mock.calls[0]?.[1] as {
      rightPriceScale: { scaleMargins: { bottom: number } };
    };
    expect(options.rightPriceScale.scaleMargins.bottom).toBe(0.08);
  });

  it("names every series it draws", () => {
    draw([LINE, { ...LINE, label: "Gold", colour: "#d97706" }]);

    expect(screen.getByText("Nifty 50")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("leaves bar series out of the legend", () => {
    // Volume is context for the price, not a line somebody reads off.
    draw([LINE, { kind: "bars", label: "Volume", points: [{ time: "2026-09-01", value: 9 }] }]);

    expect(screen.queryByText("Volume")).not.toBeInTheDocument();
  });

  it("puts a reading beside the series it belongs to", () => {
    draw([LINE], {
      readings: [{ label: "Nifty 50", value: "+10.00%", tone: "gain" }],
    });

    expect(screen.getByText("+10.00%")).toHaveClass("text-gain");
  });

  it("offers a way out for every instrument it draws", () => {
    // A comparison of two is two links, not one.
    draw([LINE], {
      instruments: [
        { label: "Nifty 50", symbol: "NSE:NIFTY" },
        { label: "Gold", symbol: "NSE:GOLDBEES" },
      ],
    });

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("skips a series with nothing in it rather than drawing an empty one", () => {
    draw([LINE, { ...LINE, label: "Gold", points: [] }]);

    expect(seriesKinds()).toEqual(["line"]);
    expect(screen.queryByText("Gold")).not.toBeInTheDocument();
  });

  it("says what is missing rather than drawing an empty box", () => {
    draw([], { empty: "No overlapping history to compare" });

    expect(screen.getByText("No overlapping history to compare")).toBeInTheDocument();
  });

  it("holds its height while the data is on its way", () => {
    draw([], { loading: true });

    expect(screen.getByRole("img")).toHaveAccessibleName("Chart loading");
  });

  it("draws itself in the theme the rest of the page is in", () => {
    window.localStorage.setItem("artha-theme", "dark");
    draw([LINE]);
    const dark = chartCalls.createChart.mock.calls[0]?.[1] as { layout: { textColor: string } };

    vi.clearAllMocks();
    window.localStorage.setItem("artha-theme", "light");
    draw([LINE]);
    const light = chartCalls.createChart.mock.calls[0]?.[1] as { layout: { textColor: string } };

    expect(dark.layout.textColor).not.toBe(light.layout.textColor);
  });

  it("lets go of the chart when the page moves on", () => {
    const { unmount } = render(
      <ThemeProvider>
        <Chart series={[LINE]} />
      </ThemeProvider>,
    );

    unmount();

    expect(chartCalls.remove).toHaveBeenCalled();
  });

  it("lets a reader drag past both ends of the data", () => {
    // Pinned edges stop the chart dead at the first and last session,
    // which leaves the newest bar flush against the price scale and no
    // room to pull the series clear of either end to look at it.
    draw([LINE]);

    const options = chartCalls.createChart.mock.calls[0]?.[1] as {
      timeScale: { fixLeftEdge: boolean; fixRightEdge: boolean };
    };
    expect(options.timeScale.fixLeftEdge).toBe(false);
    expect(options.timeScale.fixRightEdge).toBe(false);
  });

  it("frames the series with a margin at each end rather than flush to it", () => {
    draw([LINE]);

    // Two points, so the data occupies logical 0 and 1.
    expect(chartCalls.setVisibleLogicalRange).toHaveBeenCalledWith({ from: -6, to: 7 });
  });

  it("frames to the longest series when they differ in length", () => {
    // One instrument listed later than another is ordinary; the frame has
    // to hold whichever of them has more sessions.
    draw([
      LINE,
      {
        ...LINE,
        label: "Gold",
        points: [
          { time: "2026-09-01", value: 0 },
          { time: "2026-09-02", value: 1 },
          { time: "2026-09-03", value: 2 },
          { time: "2026-09-04", value: 3 },
        ],
      },
    ]);

    expect(chartCalls.setVisibleLogicalRange).toHaveBeenCalledWith({ from: -6, to: 9 });
  });

  it("offers nothing to reset until the view has actually moved", () => {
    // A reset that is always on screen is a button that does nothing
    // nearly every time it is looked at.
    draw([LINE]);

    expect(screen.queryByRole("button", { name: /Reset view/ })).not.toBeInTheDocument();
  });

  it("offers a reset once the reader has moved it", () => {
    draw([LINE]);

    act(() => {
      reportRange({ from: 40, to: 60 });
    });

    expect(screen.getByRole("button", { name: /Reset view/ })).toBeInTheDocument();
  });

  it("does not call a redraw a move", () => {
    // The library reports the range it settled on rather than the one it
    // was given, and those differ by a fraction of a bar.
    draw([LINE]);

    act(() => {
      reportRange({ from: -6.2, to: 7.1 });
    });

    expect(screen.queryByRole("button", { name: /Reset view/ })).not.toBeInTheDocument();
  });

  it("puts the view back where it opened", async () => {
    draw([LINE]);
    act(() => {
      reportRange({ from: 40, to: 60 });
    });
    chartCalls.setVisibleLogicalRange.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /Reset view/ }));

    expect(chartCalls.setVisibleLogicalRange).toHaveBeenCalledWith({ from: -6, to: 7 });
  });

  it("resets on a double click, which is what a reader tries first", () => {
    draw([LINE]);
    act(() => {
      reportRange({ from: 40, to: 60 });
    });
    chartCalls.setVisibleLogicalRange.mockClear();

    fireEvent.doubleClick(screen.getByTestId("chart"));

    expect(chartCalls.setVisibleLogicalRange).toHaveBeenCalledWith({ from: -6, to: 7 });
  });

  it("stops listening when the page moves on", () => {
    // The subscription outlives the chart otherwise, and every redraw
    // leaves another one behind.
    const { unmount } = render(
      <ThemeProvider>
        <Chart series={[LINE]} />
      </ThemeProvider>,
    );

    unmount();

    expect(chartCalls.unsubscribeVisibleLogicalRangeChange).toHaveBeenCalled();
  });

  it("treats a chart with no range at all as unmoved", () => {
    draw([LINE]);

    act(() => {
      reportRange(null);
    });

    expect(screen.queryByRole("button", { name: /Reset view/ })).not.toBeInTheDocument();
  });

  it("says nothing until the crosshair is over the plot", () => {
    draw([LINE]);

    expect(screen.queryByText(/Sept 2026/)).not.toBeInTheDocument();
  });

  it("names each line and what it was worth where the crosshair is", async () => {
    // A chart of four lines is unreadable without this: the axis says what
    // one of them was worth and leaves the rest to be guessed at.
    draw([LINE, { ...LINE, label: "Nifty 500", colour: "#71717a" }]);

    act(() => {
      moveCrosshair("2026-09-02", [24812.4, 22477.45]);
    });

    const reading = await screen.findByRole("group", { name: "Crosshair reading" });
    expect(within(reading).getByText(/2 Sept 2026/)).toBeInTheDocument();
    expect(within(reading).getByText("Nifty 50")).toBeInTheDocument();
    expect(within(reading).getByText("24,812.40")).toBeInTheDocument();
    expect(within(reading).getByText("22,477.45")).toBeInTheDocument();
  });

  it("reads a candle by where the session closed", () => {
    draw([
      {
        kind: "candles",
        label: "Nifty Bank",
        points: [{ time: "2026-09-01", open: 1, high: 2, low: 0, close: 1 }],
      },
    ]);

    act(() => {
      moveCrosshair("2026-09-01", [{ close: 56292.45 }]);
    });

    expect(screen.getByText("56,292.45")).toBeInTheDocument();
  });

  it("says nothing about a series with no point on that session", () => {
    // One instrument listed later than another is ordinary, and the
    // earlier sessions are simply not its.
    draw([LINE, { ...LINE, label: "Nifty 500", colour: "#71717a" }]);

    act(() => {
      moveCrosshair("2026-09-01", [100, {}]);
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(within(reading).queryByText("Nifty 500")).not.toBeInTheDocument();
    expect(within(reading).getByText("Nifty 50")).toBeInTheDocument();
  });

  it("follows the cursor rather than sitting in a corner", () => {
    draw([LINE]);
    sizePlot(600, 360);

    act(() => {
      moveCrosshair("2026-09-01", [100], { x: 40, y: 30 });
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(reading.style.left).toBe("54px");
    expect(reading.style.top).toBe("44px");
  });

  it("flips to the other side of the cursor near an edge", () => {
    // Anchored to the far edge rather than the near one, which flips it
    // without anybody having to know how wide it is -- and its width
    // depends on the longest name in it, so nobody does until it has been
    // drawn.
    draw([LINE]);
    sizePlot(600, 360);

    act(() => {
      moveCrosshair("2026-09-01", [100], { x: 560, y: 340 });
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(reading.style.left).toBe("");
    expect(reading.style.right).toBe("54px");
    expect(reading.style.bottom).toBe("34px");
  });

  it("reads percentages as percentages where the axis is one", () => {
    draw([LINE], { asPercent: true });

    act(() => {
      moveCrosshair("2026-09-02", [10]);
    });

    expect(screen.getByText("+10.00%")).toBeInTheDocument();
  });

  it("clears the reading when the crosshair leaves the plot", () => {
    // Frozen on the last session it saw, it would read as a reading of
    // right now.
    draw([LINE]);
    act(() => {
      moveCrosshair("2026-09-02", [100]);
    });

    act(() => {
      moveCrosshair(undefined);
    });

    expect(screen.queryByText(/Sept 2026/)).not.toBeInTheDocument();
  });

  it("leaves volume out of the reading", () => {
    // It is context for the price rather than a figure anybody reads off
    // a crosshair.
    draw([LINE, { kind: "bars", label: "Volume", points: [{ time: "2026-09-01", value: 9 }] }]);

    act(() => {
      moveCrosshair("2026-09-01", [100, 9]);
    });

    expect(screen.queryByText("Volume")).not.toBeInTheDocument();
  });

  it("stops following the crosshair when the page moves on", () => {
    const { unmount } = render(
      <ThemeProvider>
        <Chart series={[LINE]} />
      </ThemeProvider>,
    );

    unmount();

    expect(chartCalls.unsubscribeCrosshairMove).toHaveBeenCalled();
  });
});
