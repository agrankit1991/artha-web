/** Tests for the measure tile. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Statistic } from "./Statistic";

describe("Statistic", () => {
  it("shows the reading with the sentence explaining it", () => {
    // The number alone is unreadable, which is why the sentence is not
    // optional.
    render(<Statistic label="McClellan oscillator" value="42" hint="More stocks joining" />);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("More stocks joining")).toBeInTheDocument();
    expect(screen.getByText("McClellan oscillator")).toBeInTheDocument();
  });

  it("colours a good reading and a bad one differently", () => {
    const { rerender } = render(<Statistic label="A" value="1" hint="up" tone="good" />);
    expect(screen.getByText("1")).toHaveClass("text-gain");

    rerender(<Statistic label="A" value="1" hint="down" tone="bad" />);
    expect(screen.getByText("1")).toHaveClass("text-loss");
  });
});
