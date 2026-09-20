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

  it("adds an arrow only where one is asked for and means something", () => {
    const { rerender } = render(<Delta value="1.2" arrow />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();

    rerender(<Delta value="-1.2" arrow />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();

    rerender(<Delta value="0" arrow />);
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });
});
