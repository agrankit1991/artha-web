/** Tests for the advance–decline line and the oscillator over time. */

import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BreadthChart } from "./BreadthChart";
import { chartCalls, dataFor, moveCrosshair, seriesPanes } from "@/test/chartStub";
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
  it("draws both measures", () => {
    draw();

    expect(screen.getByText("Advance–decline line")).toBeInTheDocument();
    expect(screen.getByText("McClellan oscillator")).toBeInTheDocument();
  });

  it("puts the oscillator in a band of its own", () => {
    // This market's line sits near minus seventy-six thousand and its
    // oscillator between roughly plus and minus a hundred; on one axis
    // the oscillator is a flat line along the bottom.
    draw();

    expect(seriesPanes()).toEqual([0, 1]);
  });

  it("marks the only level an oscillator is read against", () => {
    draw();

    expect(chartCalls.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }));
  });

  it("carries the session dates, so the line can be read against them", () => {
    draw([
      breadthSession({ as_of: "2026-09-15", advance_decline_line: "-75521" }),
      breadthSession({ as_of: "2026-09-16", advance_decline_line: "-75940" }),
    ]);

    expect(dataFor("line")).toEqual([
      { time: "2026-09-15", value: -75521 },
      { time: "2026-09-16", value: -75940 },
    ]);
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

  it("names the session and its figure where the cursor is", () => {
    // The whole point of drawing it full size: reading one session off the
    // line. The counts are whole -- two decimal places on a number of
    // companies is noise pretending to be precision.
    draw([
      breadthSession({ as_of: "2026-09-15" }),
      breadthSession({ as_of: "2026-09-16", advance_decline_line: "-75940" }),
    ]);

    act(() => {
      moveCrosshair("2026-09-16", [-75940, -37.3]);
    });

    const reading = screen.getByRole("group", { name: "Crosshair reading" });
    expect(within(reading).getByText(/16 Sept? 2026/)).toBeInTheDocument();
    expect(within(reading).getByText("-75940")).toBeInTheDocument();
    expect(within(reading).getByText("-37")).toBeInTheDocument();
  });

  it("says nothing was counted rather than drawing an empty frame", () => {
    draw([]);

    expect(screen.getByText("No sessions to draw")).toBeInTheDocument();
  });
});
