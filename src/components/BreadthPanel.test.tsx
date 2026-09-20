/** Tests for market breadth, read in one glance. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BreadthPanel } from "./BreadthPanel";
import { breadth, breadthSession } from "@/test/support";

describe("BreadthPanel", () => {
  it("leads with how many took part, not how far the index moved", () => {
    // The whole reason breadth exists: an index can rise on five companies
    // while four hundred fall.
    render(<BreadthPanel breadth={breadth()} />);

    expect(screen.getByText("60 advancing")).toBeInTheDocument();
    expect(screen.getByText("35 declining")).toBeInTheDocument();
    expect(screen.getByText("5 unchanged")).toBeInTheDocument();
  });

  it("describes the split for a reader who cannot see the bar", () => {
    render(<BreadthPanel breadth={breadth()} />);

    expect(
      screen.getByRole("img", { name: "60 advancing, 35 declining, 5 unchanged" }),
    ).toBeInTheDocument();
  });

  it("shows how much of the market is above each average", () => {
    render(<BreadthPanel breadth={breadth()} />);

    expect(screen.getByRole("meter", { name: "Above 20-day" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Above 200-day" })).toHaveAttribute(
      "aria-valuenow",
      "62",
    );
  });

  it("says what an oscillator reading means, since the number does not", () => {
    // "+42" says nothing to most readers; "more stocks joining" does.
    const { rerender } = render(<BreadthPanel breadth={breadth()} />);
    expect(screen.getByText("More stocks joining")).toBeInTheDocument();

    rerender(<BreadthPanel breadth={breadth({ mcclellan_oscillator: "-140" })} />);
    expect(screen.getByText("Narrowing sharply")).toBeInTheDocument();

    rerender(<BreadthPanel breadth={breadth({ mcclellan_oscillator: "180" })} />);
    expect(screen.getByText("Broadening sharply")).toBeInTheDocument();

    rerender(<BreadthPanel breadth={breadth({ mcclellan_oscillator: null })} />);
    expect(screen.getByText("Needs 39 sessions")).toBeInTheDocument();
  });

  it("shows the yearly extremes beside the daily ones", () => {
    render(<BreadthPanel breadth={breadth()} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("at 52-week highs")).toBeInTheDocument();
    expect(screen.getByText("0.86")).toBeInTheDocument();
  });

  it("says it is counting rather than showing an empty market", () => {
    // Nothing counted and nothing moving look identical otherwise, and one
    // of them is a market where every company stood still.
    const { rerender } = render(<BreadthPanel breadth={null} loading />);
    expect(screen.getByText("Counting…")).toBeInTheDocument();

    rerender(<BreadthPanel breadth={null} />);
    expect(screen.getByText("Nothing counted yet")).toBeInTheDocument();
  });

  it("leaves out an unchanged count of nothing", () => {
    // On a liquid market it is always nought, and a permanent "0 unchanged"
    // is noise in the one line a reader should take at a glance.
    render(<BreadthPanel breadth={breadth({ latest: breadthSession({ unchanged: 0 }) })} />);

    expect(screen.queryByText(/unchanged/)).not.toBeInTheDocument();
  });
});
