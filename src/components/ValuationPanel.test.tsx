/** Tests for the valuation tiles. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ValuationPanel } from "./ValuationPanel";
import { valuation } from "@/test/support";

describe("ValuationPanel", () => {
  it("writes each figure in its own unit", () => {
    render(<ValuationPanel valuation={valuation()} />);

    expect(screen.getByText("₹16.78 lakh cr")).toBeInTheDocument();
    expect(screen.getByText("42.79×")).toBeInTheDocument();
    expect(screen.getByText("2.96×")).toBeInTheDocument();
    expect(screen.getByText("0.48%")).toBeInTheDocument();
    expect(screen.getByText("₹28.98")).toBeInTheDocument();
    expect(screen.getByText("₹1,353.43 cr")).toBeInTheDocument();
  });

  it("explains each figure on hover, in the platform's own words", async () => {
    render(<ValuationPanel valuation={valuation()} />);

    await userEvent.hover(
      screen.getAllByRole("button", { name: "What this means" })[1] as HTMLElement,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("Price 1,240.00 ÷ 28.98 trailing EPS");
  });

  it("says which input is missing when a figure cannot be worked out", () => {
    render(
      <ValuationPanel
        valuation={valuation({
          pe: { value: null, derivation: "Four standalone quarters of profit are needed; 3 held" },
        })}
      />,
    );

    expect(screen.getByText("An input is not held")).toBeInTheDocument();
  });

  it("says there is nothing to value against when the company has no price", () => {
    render(<ValuationPanel valuation={null} />);

    expect(screen.getByText("No valuation yet")).toBeInTheDocument();
  });

  it("shows it is still arriving", () => {
    const { container } = render(<ValuationPanel valuation={null} loading />);

    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});
