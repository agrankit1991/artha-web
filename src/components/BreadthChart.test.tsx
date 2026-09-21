/** Tests for the session balance and the oscillator over time. */

import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BreadthChart } from "./BreadthChart";
import { chartCalls, moveCrosshair, seriesPanes } from "@/test/chartStub";
import { ThemeProvider } from "@/lib/theme";
import { breadth, breadthSession } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.clearAllMocks();
});

function draw(sessions = breadth().sessions): void {
  render(
    <ThemeProvider>
      <BreadthChart sessions={sessions} />
    </ThemeProvider>,
  );
}

describe("BreadthChart", () => {
  it("draws the balance of the session, and the oscillator", () => {
    draw();

    expect(screen.getByText("Net advancing")).toBeInTheDocument();
    expect(screen.getByText("McClellan oscillator")).toBeInTheDocument();
  });

  it("puts the oscillator in a band of its own", () => {
    // A percentage and an oscillator running to some hundreds cannot
    // share a scale; together the line flattens against the middle.
    draw();

    expect(seriesPanes()).toEqual([0, 1]);
  });

  it("rules both measures at nought, which is balance", () => {
    // The line is read by which side of nought it is on, so the rule is
    // not decoration: without it the sign has to be read off the axis.
    draw();

    expect(chartCalls.createPriceLine).toHaveBeenCalledTimes(2);
    expect(chartCalls.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }));
  });

  it("writes the balance as a percentage and the oscillator as a figure", () => {
    // One chart, two units. A percentage sign on a McClellan reading
    // would be a claim about the measure that is simply untrue.
    draw();

    const [balance, oscillator] = chartCalls.addSeries.mock.calls;
    expect(balance?.[1]).toHaveProperty("priceFormat");
    expect(oscillator?.[1]).not.toHaveProperty("priceFormat");
  });

  it("draws each session's balance, keeping its counts alongside", () => {
    draw([
      breadthSession({
        as_of: "2026-09-15",
        advancing: 1202,
        declining: 3898,
        net_advance_percent: "-52.862745",
      }),
      breadthSession({
        as_of: "2026-09-16",
        advancing: 2304,
        declining: 2723,
        net_advance_percent: "-8.334991",
      }),
    ]);

    const [balance] = chartCalls.setData.mock.calls;
    expect(balance?.[0]).toEqual([
      { time: "2026-09-15", value: -52.862745, detail: "1202 up · 3898 down" },
      { time: "2026-09-16", value: -8.334991, detail: "2304 up · 2723 down" },
    ]);
  });

  it("leaves out a session nothing moved on rather than calling it balanced", () => {
    // No mover is not the same claim as an even split, and drawn at
    // nought it would be indistinguishable from one.
    draw([
      breadthSession({ as_of: "2026-09-15", net_advance_percent: null }),
      breadthSession({ as_of: "2026-09-16", net_advance_percent: "-8.33" }),
    ]);

    const [balance] = chartCalls.setData.mock.calls;
    expect(balance?.[0]).toEqual([{ time: "2026-09-16", value: -8.33, detail: "60 up · 35 down" }]);
  });

  it("leaves out the sessions an oscillator does not exist for yet", () => {
    // It needs thirty-nine sessions before it means anything, and a flat
    // run at nought before that would read as a market in balance.
    draw([
      breadthSession({ as_of: "2026-09-15", mcclellan_oscillator: null }),
      breadthSession({ as_of: "2026-09-16", mcclellan_oscillator: "-37.3" }),
    ]);

    const [, oscillator] = chartCalls.setData.mock.calls;
    expect(oscillator?.[0]).toEqual([{ time: "2026-09-16", value: -37.3 }]);
  });

  it("gives back the counts where the cursor is", () => {
    // A ratio says which way a session went and forgets what it was taken
    // over. The counts are what anybody asks for next, so they are written
    // under the reading rather than left to another part of the page.
    draw([
      breadthSession({ as_of: "2026-09-15" }),
      breadthSession({
        as_of: "2026-09-16",
        advancing: 2304,
        declining: 2723,
        net_advance_percent: "-8.334991",
      }),
    ]);

    act(() => {
      moveCrosshair("2026-09-16", [-8.334991, -37.3]);
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(within(reading).getByText(/16 Sept? 2026/)).toBeInTheDocument();
    expect(within(reading).getByText("2304 up · 2723 down")).toBeInTheDocument();
    // Its own unit, not the chart's: the oscillator is no percentage.
    expect(within(reading).getByText("-8.33%")).toBeInTheDocument();
    expect(within(reading).getByText("-37")).toBeInTheDocument();
  });

  it("says nothing was counted rather than drawing an empty frame", () => {
    draw([]);

    expect(screen.getByText("No sessions to draw")).toBeInTheDocument();
  });
});
