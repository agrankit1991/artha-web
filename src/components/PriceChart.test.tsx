/**
 * Tests for the price chart and the controls that shape it.
 *
 * Lightweight Charts draws onto a canvas, which jsdom does not have, so
 * the library is stubbed. What that leaves testable is what this component
 * is responsible for: which series it asks for, what it hands them, and
 * what the controls change.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PriceChart } from "./PriceChart";
import { forgetForTests, readPreferences } from "@/lib/preferences";
import { chartCalls, dataFor, seriesKinds, seriesPanes } from "@/test/chartStub";
import { AVERAGE_COLOURS, FORECAST_MIDDLE, PRICE_LINE } from "@/lib/chartPalette";
import { chartPoints, priceBands } from "@/test/support";
import { ThemeProvider } from "@/lib/theme";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

function draw(props: Partial<Parameters<typeof PriceChart>[0]> = {}): void {
  render(
    <ThemeProvider>
      <PriceChart points={chartPoints(10)} {...props} />
    </ThemeProvider>,
  );
}

/** The legend, which names what is drawn rather than what is on offer. */
function legend(): HTMLElement {
  return screen.getByRole("list", { name: "Series drawn" });
}

/**
 * Forget the first drawing, so an assertion after a change sees only what
 * the change produced. Every change tears the chart down and builds it
 * again, and the stub remembers both.
 */
function afterRedraw(): void {
  vi.clearAllMocks();
}

/** Choose a shape from the style menu. */
async function chooseShape(name: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Chart style" }));
  await userEvent.click(screen.getByRole("menuitem", { name: new RegExp(`^${name}\\b`) }));
}

/** Turn an indicator on or off from the indicator menu. */
async function toggleIndicator(name: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Indicators" }));
  await userEvent.click(screen.getByRole("menuitem", { name: new RegExp(`^${name}\\b`) }));
}

describe("PriceChart", () => {
  it("opens as a line, with all three averages and what traded", () => {
    // A chart somebody has just opened is being read as a shape rather
    // than a session at a time; the candles are one choice away.
    draw();

    expect(seriesKinds()).toEqual(["line", "histogram", "line", "line", "line"]);
    for (const average of ["SMA 20", "SMA 50", "SMA 200"]) {
      expect(within(legend()).getByText(average)).toBeInTheDocument();
    }
  });

  it("draws the price from the closes when it is a line", () => {
    draw({ points: chartPoints(3) });

    expect(dataFor("line")).toEqual([
      { time: "2026-09-01", value: 103 },
      { time: "2026-09-02", value: 104 },
      { time: "2026-09-03", value: 105 },
    ]);
  });

  it("hands the candles all four prices of each session", async () => {
    draw({ points: chartPoints(3) });
    afterRedraw();

    await chooseShape("Candles");

    expect(dataFor("candlestick")).toEqual([
      { time: "2026-09-01", open: 100, high: 104, low: 99, close: 103 },
      { time: "2026-09-02", open: 101, high: 105, low: 100, close: 104 },
      { time: "2026-09-03", open: 102, high: 106, low: 101, close: 105 },
    ]);
  });

  it("draws it as an area when an area is asked for", async () => {
    draw();
    afterRedraw();

    await chooseShape("Area");

    expect(seriesKinds()).toContain("area");
  });

  it("colours a session's volume by which way it closed", () => {
    draw({
      points: [
        ...chartPoints(1),
        { ...chartPoints(1)[0], day: "2026-09-02", open: "110", close: "100" } as never,
      ],
    });

    const traded = dataFor("histogram") as { color: string }[];
    expect(traded[0]?.color).toContain("22,163,74");
    expect(traded[1]?.color).toContain("220,38,38");
  });

  it("adds an average when one is asked for", async () => {
    draw({ initialOverlays: ["sma_50"] });
    expect(within(legend()).queryByText("SMA 20")).not.toBeInTheDocument();

    await toggleIndicator("SMA 20");

    expect(within(legend()).getByText("SMA 20")).toBeInTheDocument();
  });

  it("takes one away again", async () => {
    draw();

    await toggleIndicator("SMA 200");

    expect(within(legend()).queryByText("SMA 200")).not.toBeInTheDocument();
  });

  it("puts the oscillator in a band of its own", async () => {
    // An RSI on a nought to a hundred scale drawn over a price is a flat
    // line along the bottom.
    draw();
    afterRedraw();

    await toggleIndicator("RSI");

    expect(seriesPanes()).toContain(1);
    expect(chartCalls.setHeight).toHaveBeenCalled();
  });

  it("marks what an oscillator is read against", async () => {
    // Thirty and seventy: the reading means nothing without them.
    draw();
    afterRedraw();

    await toggleIndicator("RSI");

    expect(chartCalls.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({ price: 70 }));
    expect(chartCalls.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({ price: 30 }));
  });

  it("clears everything drawn over the price when asked", async () => {
    // The setting people reach for most often, which is why nothing here
    // is mandatory.
    draw();
    afterRedraw();

    await userEvent.click(screen.getByRole("button", { name: "Indicators" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Clear all" }));

    expect(seriesKinds()).toEqual(["line"]);
    expect(within(legend()).queryByText("SMA 200")).not.toBeInTheDocument();
  });

  it("leaves out the sessions an average does not exist for yet", () => {
    // Drawn as nought they would put a cliff at the start of every line.
    const points = chartPoints(3).map((point, index) =>
      index === 0 ? { ...point, sma_200: null } : point,
    );

    draw({ points, initialOverlays: ["sma_200"] });

    // The price is a line too, so the average is the second series drawn.
    const [, average] = chartCalls.setData.mock.calls;
    expect(average?.[0]).toHaveLength(2);
  });

  it("leaves out a session whose prices will not parse", async () => {
    // Drawn at nought it would be a candle crashing to zero in the middle
    // of the series, which looks like a real event.
    const points = chartPoints(3).map((point, index) =>
      index === 1 ? { ...point, high: "" } : point,
    );
    draw({ points, initialOverlays: [] });
    afterRedraw();

    await chooseShape("Candles");

    expect(dataFor("candlestick")).toHaveLength(2);
  });

  it("draws the line from the closes it can read", () => {
    const points = chartPoints(3).map((point, index) =>
      index === 1 ? { ...point, close: "" } : point,
    );

    draw({ points, initialOverlays: [] });

    expect(dataFor("line")).toHaveLength(2);
  });

  it("offers the way out to the instrument it drew", () => {
    draw({ instrument: { label: "Nifty 50", symbol: "NSE:NIFTY" } });

    expect(screen.getByRole("link", { name: /Nifty 50/ })).toBeInTheDocument();
  });

  it("says there is nothing to draw rather than drawing an empty box", () => {
    draw({ points: [] });

    expect(screen.getByText("No sessions to draw")).toBeInTheDocument();
  });

  it("holds its height while the sessions are on their way", () => {
    draw({ points: null, loading: true });

    expect(screen.getByRole("img")).toHaveAccessibleName("Chart loading");
  });

  it("draws each average thin, and in its own colour", () => {
    // Light to heavy as the average lengthens, so the weight of the
    // colour matches the weight a reader should give it. Three of them at
    // two pixels each would be a chart of averages with a price behind it.
    draw({ initialOverlays: ["sma_20", "sma_50", "sma_200"] });

    const drawn = chartCalls.addSeries.mock.calls
      .map((call) => (call as unknown[])[1] as { color?: string; lineWidth?: number })
      .filter((options) => options.color !== undefined && options.color !== PRICE_LINE);

    expect(drawn.map((options) => options.color)).toEqual([
      AVERAGE_COLOURS.sma_20,
      AVERAGE_COLOURS.sma_50,
      AVERAGE_COLOURS.sma_200,
    ]);
    expect(drawn.every((options) => options.lineWidth === 1)).toBe(true);
  });

  it("draws in the shape the reader chose last time, and remembers a new choice", async () => {
    window.localStorage.setItem(
      "artha.preferences",
      JSON.stringify({ chartStyle: "candles", overlays: ["volume"], range: 250 }),
    );
    forgetForTests();
    draw({ points: chartPoints(30) });

    expect(screen.getByRole("button", { name: "Chart style" })).toHaveTextContent("Candles");
    await chooseShape("Line");
    expect(readPreferences().chartStyle).toBe("line");
    window.localStorage.removeItem("artha.preferences");
    forgetForTests();
  });

  it("draws the forecast band as three dashed lines from the last close, and explains it", () => {
    draw({ forecast: priceBands() });

    const names = within(legend())
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(names).toEqual(
      expect.arrayContaining(["Forecast 90%", "Forecast middle", "Forecast 10%"]),
    );
    const dashed = chartCalls.addSeries.mock.calls
      .map((call) => (call as unknown[])[1] as { color?: string; lineStyle?: number })
      .filter((options) => options.lineStyle === 2);
    expect(dashed).toHaveLength(3);
    expect(dashed[1]?.color).toBe(FORECAST_MIDDLE);
    expect(screen.getByTestId("forecast-note")).toHaveTextContent("80% range");
  });

  it("puts the band away when asked, and remembers that", async () => {
    draw({ forecast: priceBands() });
    const toggle = screen.getByRole("button", { name: "Forecast" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    afterRedraw();
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("forecast-note")).not.toBeInTheDocument();
    expect(within(legend()).queryByText("Forecast middle")).not.toBeInTheDocument();
    expect(readPreferences().forecast).toBe(false);
    forgetForTests();
  });

  it("offers no forecast where the instrument has none", () => {
    draw({ forecast: null });

    expect(screen.queryByRole("button", { name: "Forecast" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("forecast-note")).not.toBeInTheDocument();
  });
});
