/** Tests for a population valued. */

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PopulationValuationPanel } from "./PopulationValuationPanel";
import { memberValuation, populationValuation, renderPage } from "@/test/support";

describe("PopulationValuationPanel", () => {
  it("states the typical multiple, to one decimal, and what the whole is worth", () => {
    renderPage(<PopulationValuationPanel valuation={populationValuation()} />);

    expect(screen.getByText("30.0×")).toBeInTheDocument();
    expect(screen.getByText("₹20.00 lakh cr")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    // The day's movers are the members' part of the page now.
    expect(screen.queryByText(/Added the most/)).not.toBeInTheDocument();
  });

  it("holds the space while loading and says when nothing can be valued", () => {
    const { unmount } = renderPage(<PopulationValuationPanel valuation={null} loading />);
    expect(screen.queryByText("Median price to earnings")).not.toBeInTheDocument();
    unmount();

    renderPage(
      <PopulationValuationPanel valuation={populationValuation({ companies: 0, members: [] })} />,
    );
    expect(screen.getByText("Nothing to value yet")).toBeInTheDocument();
  });

  it("marks a multiple it cannot state", () => {
    renderPage(
      <PopulationValuationPanel
        valuation={populationValuation({
          companies: 1,
          valued: 0,
          pe_median: null,
          members: [memberValuation({ market_cap: null, moved: null })],
        })}
      />,
    );

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });
});
