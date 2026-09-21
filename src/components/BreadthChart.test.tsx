/** Tests for the participation counts and the oscillator over time. */

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
  it("draws both sides of the count, and the oscillator", () => {
    draw();

    expect(screen.getByText("Advancing")).toBeInTheDocument();
    expect(screen.getByText("Declining")).toBeInTheDocument();
    expect(screen.getByText("McClellan oscillator")).toBeInTheDocument();
  });

  it("puts the oscillator in a band of its own", () => {
    // The counts run to several thousand and the oscillator between
    // roughly plus and minus a hundred; sharing an axis, the oscillator is
    // a flat line along the bottom.
    draw();

    expect(seriesPanes()).toEqual([0, 0, 1]);
  });

  it("marks the only level an oscillator is read against", () => {
    draw();

    expect(chartCalls.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }));
  });

  it("counts companies rather than accumulating them", () => {
    // The cumulative line this replaced reached many times the size of the
    // population it counted, which is no longer a number of companies.
    // Each point is that session's own count, bounded by the population.
    draw([
      breadthSession({ as_of: "2026-09-15", instruments: 5262, advancing: 1202, declining: 3898 }),
      breadthSession({ as_of: "2026-09-16", instruments: 5243, advancing: 2304, declining: 2723 }),
    ]);

    const [advancing, declining] = chartCalls.setData.mock.calls;
    expect(advancing?.[0]).toEqual([
      { time: "2026-09-15", value: 1202 },
      { time: "2026-09-16", value: 2304 },
    ]);
    expect(declining?.[0]).toEqual([
      { time: "2026-09-15", value: 3898 },
      { time: "2026-09-16", value: 2723 },
    ]);
  });

  it("leaves out the sessions an oscillator does not exist for yet", () => {
    // It needs thirty-nine sessions before it means anything, and a flat
    // run at nought before that would read as a market in balance.
    draw([
      breadthSession({ as_of: "2026-09-15", mcclellan_oscillator: null }),
      breadthSession({ as_of: "2026-09-16", mcclellan_oscillator: "-37.3" }),
    ]);

    const [, , oscillator] = chartCalls.setData.mock.calls;
    expect(oscillator?.[0]).toEqual([{ time: "2026-09-16", value: -37.3 }]);
  });

  it("names the session and how many companies each way", () => {
    // The whole point of drawing it full size: reading one session off it.
    // The counts are whole -- two decimal places on a number of companies
    // is noise pretending to be precision.
    draw([
      breadthSession({ as_of: "2026-09-15" }),
      breadthSession({ as_of: "2026-09-16", advancing: 2304, declining: 2723 }),
    ]);

    act(() => {
      moveCrosshair("2026-09-16", [2304, 2723, -37.3]);
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(within(reading).getByText(/16 Sept? 2026/)).toBeInTheDocument();
    expect(within(reading).getByText("2304")).toBeInTheDocument();
    expect(within(reading).getByText("2723")).toBeInTheDocument();
    expect(within(reading).getByText("-37")).toBeInTheDocument();
  });

  it("says nothing was counted rather than drawing an empty frame", () => {
    draw([]);

    expect(screen.getByText("No sessions to draw")).toBeInTheDocument();
  });
});
