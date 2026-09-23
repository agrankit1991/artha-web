/** Tests for a company's size band and momentum. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MomentumChip, SizeBadge, momentumBand } from "./Standing";

describe("Standing", () => {
  it("bands momentum weak to forty, neutral to sixty, strong above", () => {
    expect([0, 40, 41, 60, 61, 100].map(momentumBand)).toEqual([
      "weak",
      "weak",
      "neutral",
      "neutral",
      "strong",
      "strong",
    ]);
  });

  it("colours the chip by its band and draws nothing without a score", () => {
    const { rerender, container } = render(<MomentumChip score={72} />);
    expect(screen.getByText("Momentum 72")).toHaveClass("text-gain");

    rerender(<MomentumChip score={35} />);
    expect(screen.getByText("Momentum 35")).toHaveClass("text-loss");

    rerender(<MomentumChip score={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the size band with its rank, and nothing before the snapshot has one", () => {
    const { rerender, container } = render(<SizeBadge bucket="MID" rank={142} />);
    expect(screen.getByText("Mid cap")).toHaveTextContent("Mid cap#142");

    rerender(<SizeBadge bucket="SMALL" rank={null} />);
    expect(screen.getByText("Small cap")).toBeInTheDocument();

    rerender(<SizeBadge bucket={null} rank={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
