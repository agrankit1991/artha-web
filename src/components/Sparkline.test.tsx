/** Tests for the line read for its shape. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("says which way it is going, for a reader who cannot see it", () => {
    // The shape is the whole content, so without this the component says
    // nothing at all to a screen reader.
    render(<Sparkline values={[1, 2, 3]} label="A–D line" />);

    expect(screen.getByRole("img", { name: "A–D line: rising" })).toBeInTheDocument();
  });

  it("colours a fall differently from a rise", () => {
    const { rerender } = render(<Sparkline values={[3, 2, 1]} label="A–D line" />);
    expect(screen.getByRole("img").querySelector("polyline")).toHaveClass("stroke-loss");

    rerender(<Sparkline values={[1, 2, 3]} label="A–D line" />);
    expect(screen.getByRole("img").querySelector("polyline")).toHaveClass("stroke-gain");
  });

  it("draws a flat series down the middle rather than dividing by nothing", () => {
    // A series that never moves has no range to scale against, and the
    // arithmetic for it is a division by nought.
    render(<Sparkline values={[5, 5, 5]} label="Flat" />);

    expect(screen.getByRole("img", { name: "Flat: flat" })).toBeInTheDocument();
  });

  it("says when there is not enough history to draw", () => {
    // Before 39 sessions the McClellan oscillator does not exist, and an
    // empty box that claims to be a chart is worse than one that admits it.
    render(<Sparkline values={[null, null, 1]} label="McClellan" />);

    expect(screen.getByRole("img", { name: "McClellan: not enough history" })).toBeInTheDocument();
  });

  it("marks the baseline an oscillator is read against", () => {
    render(<Sparkline values={[-2, 1, 3]} baseline={0} label="McClellan" />);

    expect(screen.getByRole("img").querySelector("line")).toBeInTheDocument();
  });
});
