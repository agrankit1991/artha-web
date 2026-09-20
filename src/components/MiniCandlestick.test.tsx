/** Tests for the session candle. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MiniCandlestick } from "./MiniCandlestick";

describe("MiniCandlestick", () => {
  it("says which way the session closed, for a reader who cannot see it", () => {
    render(<MiniCandlestick open="100" high="110" low="95" close="108" />);

    expect(screen.getByRole("img")).toHaveAccessibleName("Session closed at or above its open");
  });

  it("reads as a fall when the close is below the open", () => {
    render(<MiniCandlestick open="108" high="110" low="95" close="100" />);

    expect(screen.getByRole("img")).toHaveAccessibleName("Session closed below its open");
  });

  it("draws the body between the open and the close", () => {
    // The wick spans the whole range and the body only the middle of it,
    // which is the entire point of the shape.
    const { container } = render(<MiniCandlestick open="100" high="110" low="90" close="105" />);

    const body = container.querySelector("rect");
    expect(Number(body?.getAttribute("height"))).toBeCloseTo(34 * 0.25, 5);
  });

  it("still draws a body for a session that opened and closed level", () => {
    // Nought height would render nothing at all, and a doji is a shape
    // worth seeing rather than an absence.
    const { container } = render(<MiniCandlestick open="100" high="104" low="96" close="100" />);

    expect(Number(container.querySelector("rect")?.getAttribute("height"))).toBeGreaterThan(0);
  });

  it("survives a session that never moved", () => {
    // Every price equal would divide by a range of nought.
    const { container } = render(<MiniCandlestick open="50" high="50" low="50" close="50" />);

    expect(container.querySelector("rect")).toBeInTheDocument();
  });

  it("draws nothing rather than guessing when a price is missing", () => {
    render(<MiniCandlestick open="100" high={null} low="95" close="108" />);

    expect(screen.getByRole("img")).toHaveAccessibleName("Session shape unavailable");
  });
});
