/**
 * Tests for the comparison chart.
 *
 * Lightweight Charts draws onto a canvas, which jsdom does not have, so the
 * library is stubbed here. What that leaves testable is what this component
 * is actually responsible for: the legend, the empty and loading states,
 * and handing the library the right series. The arithmetic behind the lines
 * is tested as arithmetic, in `lib/rebase`.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ComparisonChart } from "./ComparisonChart";
import { ThemeProvider } from "@/lib/theme";
import { chartCalls } from "@/test/chartStub";
import { priceSeries } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

const NIFTY = "NSE_INDEX|Nifty 50";
const GOLD = "NSE_EQ|INF204KB17I5";
const LINES = [
  { instrumentKey: NIFTY, label: "Nifty 50", colour: "#2563eb" },
  { instrumentKey: GOLD, label: "Gold", colour: "#d97706" },
];

function draw(series: Parameters<typeof ComparisonChart>[0]["series"]): void {
  render(
    <ThemeProvider>
      <ComparisonChart series={series} lines={LINES} />
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("ComparisonChart", () => {
  it("names each line and says what it did over the window", () => {
    // A chart of two unlabelled lines is a decoration.
    draw([priceSeries(NIFTY, [100, 110]), priceSeries(GOLD, [200, 190])]);

    expect(screen.getByText("Nifty 50")).toBeInTheDocument();
    expect(screen.getByText("+10.00%")).toBeInTheDocument();
    expect(screen.getByText("-5.00%")).toBeInTheDocument();
  });

  it("colours a gain and a loss apart in the legend", () => {
    draw([priceSeries(NIFTY, [100, 110]), priceSeries(GOLD, [200, 190])]);

    expect(screen.getByText("+10.00%")).toHaveClass("text-gain");
    expect(screen.getByText("-5.00%")).toHaveClass("text-loss");
  });

  it("hands the library one line per series", () => {
    draw([priceSeries(NIFTY, [100, 110]), priceSeries(GOLD, [200, 190])]);

    expect(chartCalls.addSeries).toHaveBeenCalledTimes(2);
    expect(chartCalls.setData).toHaveBeenCalledWith([
      { time: "2026-03-02", value: 0 },
      { time: "2026-03-03", value: -5 },
    ]);
  });

  it("says so rather than drawing an empty box when nothing overlaps", () => {
    draw([
      priceSeries(NIFTY, [100, 110], "2026-03-02"),
      priceSeries(GOLD, [200, 190], "2026-07-02"),
    ]);

    expect(screen.getByText("No overlapping history to compare")).toBeInTheDocument();
  });

  it("holds its height while the prices are on their way", () => {
    // A chart that appears late shunts everything under it down the page.
    render(
      <ThemeProvider>
        <ComparisonChart series={null} lines={LINES} loading />
      </ThemeProvider>,
    );

    expect(screen.getByRole("img")).toHaveAccessibleName("Comparison loading");
  });

  it("lets go of the chart when the page moves on", () => {
    // Lightweight Charts holds a resize observer and a canvas; left
    // behind, every scope change would leak another one.
    const { unmount } = render(
      <ThemeProvider>
        <ComparisonChart series={[priceSeries(NIFTY, [100, 110])]} lines={LINES} />
      </ThemeProvider>,
    );

    unmount();

    expect(chartCalls.remove).toHaveBeenCalled();
  });

  it("draws itself in the theme the rest of the page is in", () => {
    // A chart that keeps its own light palette on a dark page is the most
    // visible way a theme can be half-applied.
    window.localStorage.setItem("artha-theme", "dark");
    draw([priceSeries(NIFTY, [100, 110])]);
    const dark = chartCalls.createChart.mock.calls[0]?.[1] as {
      layout: { textColor: string };
    };

    vi.clearAllMocks();
    window.localStorage.setItem("artha-theme", "light");
    draw([priceSeries(NIFTY, [100, 110])]);
    const light = chartCalls.createChart.mock.calls[0]?.[1] as {
      layout: { textColor: string };
    };

    expect(dark.layout.textColor).not.toBe(light.layout.textColor);
  });

  it("falls back to the instrument key for a line nobody named", () => {
    // Better a key in the legend than a blank space where a name should be.
    render(
      <ThemeProvider>
        <ComparisonChart series={[priceSeries("NSE_EQ|UNNAMED", [100, 110])]} lines={[]} />
      </ThemeProvider>,
    );

    expect(screen.getByText("NSE_EQ|UNNAMED")).toBeInTheDocument();
  });
});
