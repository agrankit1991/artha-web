/** Tests for the population heatmap. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Heatmap } from "./Heatmap";
import { member } from "@/test/support";

/** Build a run of companies with given moves. */
function movers(...moves: (string | null)[]) {
  return moves.map((change, index) =>
    member({
      instrument_key: `NSE_EQ|INE${String(index)}`,
      symbol: `SYM${String(index)}`,
      change_percent: change,
    }),
  );
}

describe("Heatmap", () => {
  it("draws a tile for each company, with its move", () => {
    render(<Heatmap members={movers("2.5", "-1.2")} />);

    expect(screen.getByText("SYM0")).toBeInTheDocument();
    expect(screen.getByText("+2.50%")).toBeInTheDocument();
    expect(screen.getByText("-1.20%")).toBeInTheDocument();
  });

  it("colours a rise and a fall apart", () => {
    render(<Heatmap members={movers("4", "-4")} />);

    const [up, down] = screen.getAllByRole("listitem");
    expect(up?.getAttribute("style")).toContain("--gain");
    expect(down?.getAttribute("style")).toContain("--loss");
  });

  it("leans on the colour harder the further something moved", () => {
    // A strong fall and a weak one are told apart without a legend.
    render(<Heatmap members={movers("4", "0.5")} />);

    const [strong, weak] = screen.getAllByRole("listitem");
    const share = (tile: Element | undefined): number =>
      Number(/(\d+(?:\.\d+)?)%/.exec(tile?.getAttribute("style") ?? "")?.[1] ?? 0);
    expect(share(strong)).toBeGreaterThan(share(weak));
  });

  it("leaves out a company that has not been counted", () => {
    render(<Heatmap members={movers("2", null)} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows the companies that moved most when there are too many", () => {
    // A hundred and twenty tiles of a two-hundred company sector should be
    // the hundred and twenty worth looking at.
    render(<Heatmap members={movers("0.1", "9", "0.2")} limit={2} />);

    expect(screen.getByText("SYM1")).toBeInTheDocument();
    expect(screen.queryByText("SYM0")).not.toBeInTheDocument();
    expect(screen.getByText(/2 that moved most, of 3/)).toBeInTheDocument();
  });

  it("says nothing was counted rather than drawing an empty grid", () => {
    render(<Heatmap members={movers(null)} />);

    expect(screen.getByText("Nothing counted for this population")).toBeInTheDocument();
  });

  it("stays flat when choosing a company would do nothing", () => {
    render(<Heatmap members={movers("2")} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reports the company that was chosen", async () => {
    const chosen = vi.fn();
    render(<Heatmap members={movers("2")} onSelect={chosen} />);

    await userEvent.click(screen.getByRole("listitem"));

    expect(chosen).toHaveBeenCalledWith(expect.objectContaining({ symbol: "SYM0" }));
  });

  it("leaves a company that did not move uncoloured", () => {
    // Nought is neither a rise nor a fall, and painting it either way
    // would make a flat day look like a small one.
    render(<Heatmap members={movers("0")} />);

    expect(screen.getByRole("listitem").getAttribute("style")).toContain("--muted");
  });
});
