/** Tests for a percentage as a bar. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meter } from "./Meter";

describe("Meter", () => {
  it("prints the figure as well as drawing it", () => {
    // A bar cannot be read precisely, and a number alone cannot be compared
    // across three of them without arithmetic.
    render(<Meter label="Above 200-day" percent={62.4} />);

    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Above 200-day" })).toHaveAttribute(
      "aria-valuenow",
      "62.4",
    );
  });

  it("reads as healthy above its threshold and not below", () => {
    const { rerender } = render(<Meter label="Above 200-day" percent={70} />);
    expect(screen.getByRole("meter").firstChild).toHaveClass("bg-gain");

    rerender(<Meter label="Above 200-day" percent={30} />);
    expect(screen.getByRole("meter").firstChild).toHaveClass("bg-loss");
  });

  it("shows nothing rather than nought when there is no figure", () => {
    // A market with no 200-day average yet is not a market with none above it.
    render(<Meter label="Above 200-day" percent={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
