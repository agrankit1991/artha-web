/** Tests for a population valued, and the money its members moved. */

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bucketed, PopulationValuationPanel } from "./PopulationValuationPanel";
import { memberValuation, populationValuation, renderPage } from "@/test/support";

describe("PopulationValuationPanel", () => {
  it("states the typical multiple, the movers each way, and the spread", () => {
    renderPage(<PopulationValuationPanel valuation={populationValuation()} />);

    expect(screen.getByText("30.00×")).toBeInTheDocument();
    expect(screen.getByText("₹20.00 lakh cr")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    const added = screen.getByRole("heading", { name: /Added the most/ }).parentElement;
    expect(within(added as HTMLElement).getByRole("link", { name: "RELIANCE" })).toHaveAttribute(
      "href",
      "/company/NSE_EQ%7CINE002A01018",
    );
    expect(added).toHaveTextContent("₹24,800 cr");
    const taken = screen.getByRole("heading", { name: /Took away the most/ }).parentElement;
    expect(within(taken as HTMLElement).getByRole("link", { name: "TCS" })).toBeInTheDocument();
    expect(taken).toHaveTextContent("₹-8,250 cr");

    expect(screen.getByRole("img", { name: /0 to 2%: 1, 2 to 5%: 0/ })).toBeInTheDocument();
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

  it("says when no member can be weighed, and names none on an empty side", () => {
    const unweighed = populationValuation({
      companies: 1,
      valued: 0,
      pe_median: null,
      members: [memberValuation({ market_cap: null, moved: null, change_percent: null })],
    });
    const { unmount } = renderPage(<PopulationValuationPanel valuation={unweighed} />);
    expect(screen.getByText(/nothing can be weighed/)).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    unmount();

    const oneWay = populationValuation({ members: [memberValuation()] });
    renderPage(<PopulationValuationPanel valuation={oneWay} />);
    expect(screen.getByText("None today.")).toBeInTheDocument();
  });
});

describe("bucketed", () => {
  it("counts each move into one bucket, on the boundaries too", () => {
    const moves = ["-7", "-5", "-2", "-0.5", "0", "0.5", "2", "5", "9", null];
    const counted = bucketed(moves.map((change) => memberValuation({ change_percent: change })));

    // < −5 | −5..−2 | −2..0 | 0 | 0..2 | 2..5 | > 5
    expect(counted).toEqual([1, 1, 2, 1, 2, 1, 1]);
    expect(counted.reduce((sum, one) => sum + one, 0)).toBe(9);
  });
});
