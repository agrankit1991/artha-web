/** Tests for the figure that is up, down, or neither. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Delta } from "./Delta";

describe("Delta", () => {
  it("prints the sign as well as the colour", () => {
    // Colour is never the only carrier: the figure has to read the same to
    // someone who cannot tell the two colours apart.
    render(<Delta value="8.25" />);

    expect(screen.getByText("+8.25%")).toHaveClass("text-gain");
  });

  it("colours a fall differently", () => {
    render(<Delta value="-3.10" />);

    expect(screen.getByText("-3.10%")).toHaveClass("text-loss");
  });

  it("treats no change and no figure alike, as neither", () => {
    // A young company with no yearly return must not be coloured as though
    // it had fallen.
    const { rerender } = render(<Delta value="0" />);
    expect(screen.getByText("0.00%")).toHaveClass("text-muted-foreground");

    rerender(<Delta value={null} />);
    expect(screen.getByText("—")).toHaveClass("text-muted-foreground");
  });

  it("draws the direction arrow by default, and none for no move", () => {
    const { rerender } = render(<Delta value="1.2" />);
    expect(screen.getByTestId("arrow-up")).toBeInTheDocument();

    rerender(<Delta value="-1.2" />);
    expect(screen.getByTestId("arrow-down")).toBeInTheDocument();

    rerender(<Delta value="0" />);
    expect(screen.queryByTestId(/arrow-/)).not.toBeInTheDocument();
  });

  it("leaves the arrow out where the caller says the colour already carries it", () => {
    render(<Delta value="1.2" arrow={false} />);

    expect(screen.getByText("+1.20%")).toHaveClass("text-gain");
    expect(screen.queryByTestId(/arrow-/)).not.toBeInTheDocument();
  });

  it("draws as a tinted pill where a card shows the move beside a name", () => {
    render(<Delta value="-0.56" badge />);

    expect(screen.getByText("-0.56%")).toHaveClass("text-loss", "border-loss/30", "bg-loss/5");
  });
});
