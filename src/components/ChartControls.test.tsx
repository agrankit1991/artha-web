/** Tests for the chart's own controls. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartControls, type Overlay } from "./ChartControls";

function show(props: Partial<Parameters<typeof ChartControls>[0]> = {}): {
  style: ReturnType<typeof vi.fn>;
  overlays: ReturnType<typeof vi.fn>;
} {
  const style = vi.fn();
  const overlays = vi.fn();
  render(
    <ChartControls
      style="candles"
      overlays={["sma_50"]}
      onStyle={style}
      onOverlays={overlays}
      {...props}
    />,
  );
  return { style, overlays };
}

describe("ChartControls", () => {
  it("offers the three shapes a price can take", () => {
    show();

    for (const shape of ["Candles", "Line", "Area"]) {
      expect(screen.getByRole("button", { name: shape })).toBeInTheDocument();
    }
  });

  it("marks the shape being drawn", () => {
    show();

    expect(screen.getByRole("button", { name: "Candles" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the shape chosen", async () => {
    const { style } = show();

    await userEvent.click(screen.getByRole("button", { name: "Area" }));

    expect(style).toHaveBeenCalledWith("area");
  });

  it("marks which indicators are showing", () => {
    show();

    expect(screen.getByRole("button", { name: "SMA 50" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "RSI" })).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an indicator to the ones already showing", async () => {
    const { overlays } = show();

    await userEvent.click(screen.getByRole("button", { name: "RSI" }));

    expect(overlays).toHaveBeenCalledWith(["sma_50", "rsi"]);
  });

  it("takes one away without disturbing the rest", async () => {
    const { overlays } = show({ overlays: ["sma_50", "volume"] });

    await userEvent.click(screen.getByRole("button", { name: "Volume" }));

    expect(overlays).toHaveBeenCalledWith(["sma_50"]);
  });

  it("always reports them in the same order", async () => {
    // Reported in the offered order rather than the order they were
    // pressed, so the same set always draws the same way round.
    const { overlays } = show({ overlays: ["rsi"] });

    await userEvent.click(screen.getByRole("button", { name: "SMA 20" }));

    expect(overlays).toHaveBeenCalledWith(["sma_20", "rsi"]);
  });

  it("clears everything at once", async () => {
    const { overlays } = show({ overlays: ["sma_20", "sma_50", "rsi"] as Overlay[] });

    await userEvent.click(screen.getByRole("button", { name: "Clean" }));

    expect(overlays).toHaveBeenCalledWith([]);
  });

  it("offers nothing to clear when nothing is drawn", () => {
    show({ overlays: [] });

    expect(screen.queryByRole("button", { name: "Clean" })).not.toBeInTheDocument();
  });

  it("says what each indicator is, since the labels are abbreviations", () => {
    show();

    expect(screen.getByRole("button", { name: "SMA 200" })).toHaveAttribute(
      "title",
      "Two-hundred-session moving average",
    );
  });
});
