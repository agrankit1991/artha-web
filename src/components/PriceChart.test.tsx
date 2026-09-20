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
import { chartCalls, dataFor, seriesKinds, seriesPanes } from "@/test/chartStub";
import { chartPoints } from "@/test/support";
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
  it("opens on candles, with the long averages and what traded", () => {
    draw();

    expect(seriesKinds()).toEqual(["candlestick", "histogram", "line", "line"]);
    expect(within(legend()).getByText("SMA 50")).toBeInTheDocument();
    expect(within(legend()).getByText("SMA 200")).toBeInTheDocument();
  });

  it("hands the candles all four prices of each session", () => {
    draw({ points: chartPoints(3) });

    expect(dataFor("candlestick")).toEqual([
      { time: "2026-09-01", open: 100, high: 104, low: 99, close: 103 },
      { time: "2026-09-02", open: 101, high: 105, low: 100, close: 104 },
      { time: "2026-09-03", open: 102, high: 106, low: 101, close: 105 },
    ]);
  });

  it("draws the price as a line when a line is asked for", async () => {
    draw();
    afterRedraw();

    await chooseShape("Line");

    expect(seriesKinds()).not.toContain("candlestick");
    expect(dataFor("line")).toEqual(
      chartPoints(10).map((point) => ({ time: point.day, value: Number(point.close) })),
    );
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
    draw();
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

    expect(seriesKinds()).toEqual(["candlestick"]);
    expect(within(legend()).queryByText("SMA 200")).not.toBeInTheDocument();
  });

  it("leaves out the sessions an average does not exist for yet", () => {
    // Drawn as nought they would put a cliff at the start of every line.
    const points = chartPoints(3).map((point, index) =>
      index === 0 ? { ...point, sma_200: null } : point,
    );

    draw({ points, initialOverlays: ["sma_200"] });

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
});
