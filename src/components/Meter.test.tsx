/** Tests for a percentage as a bar. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meter } from "./Meter";

describe("Meter", () => {
  it("prints the figure as well as drawing it", () => {
    // A bar cannot be read precisely, and a number alone cannot be compared
    // across three of them without arithmetic.
    render(<Meter label="Above 200-day" percent={62.4} />);

    expect(screen.getByText("62.4%")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Above 200-day" })).toHaveAttribute(
      "aria-valuenow",
      "62.4",
    );
  });

  it("draws how much, not whether it is good, against a halfway tick", () => {
    // 95% above the 200-day is over-extended; a green bar would call it
    // healthy. The caption says what a reading means.
    const { rerender } = render(<Meter label="Above 200-day" percent={95} />);
    const bar = (): Element | null => screen.getByRole("meter").firstElementChild;
    expect(bar()).toHaveClass("bg-primary");
    expect(bar()).toHaveStyle({ width: "95%" });
    rerender(<Meter label="Above 200-day" percent={30} />);
    expect(bar()).not.toHaveClass("bg-loss");
    expect(screen.getByRole("meter").querySelector("span[aria-hidden]")).not.toBeNull();
  });

  it("shows nothing rather than nought when there is no figure", () => {
    // A market with no 200-day average yet is not a market with none above it.
    render(<Meter label="Above 200-day" percent={null} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
