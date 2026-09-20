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

/** Open one of the two menus. */
async function open(name: "Chart style" | "Indicators"): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name }));
}

describe("ChartControls", () => {
  it("shows the shape being drawn without being opened", () => {
    // The point of a menu over a row of buttons: the choice made is
    // visible, the rest is out of the way.
    show();

    expect(screen.getByRole("button", { name: "Chart style" })).toHaveTextContent("Candles");
  });

  it("counts what is drawn over the price without being opened", () => {
    show({ overlays: ["sma_50", "rsi"] });

    expect(screen.getByRole("button", { name: "Indicators" })).toHaveTextContent("(2)");
  });

  it("offers the three shapes a price can take", async () => {
    show();

    await open("Chart style");

    for (const shape of ["Candles", "Line", "Area"]) {
      expect(screen.getByRole("menuitem", { name: new RegExp(shape) })).toBeInTheDocument();
    }
  });

  it("reports the shape chosen and shuts behind it", async () => {
    // One shape at a time, so there is nothing else to choose.
    const { style } = show();
    await open("Chart style");

    await userEvent.click(screen.getByRole("menuitem", { name: /Area/ }));

    expect(style).toHaveBeenCalledWith("area");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("marks which indicators are showing", async () => {
    show();

    await open("Indicators");

    expect(screen.getByRole("menuitem", { name: /^SMA 50\b/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: /^RSI\b/ })).not.toHaveAttribute("aria-current");
  });

  it("adds an indicator to the ones already showing", async () => {
    const { overlays } = show();
    await open("Indicators");

    await userEvent.click(screen.getByRole("menuitem", { name: /^RSI\b/ }));

    expect(overlays).toHaveBeenCalledWith(["sma_50", "rsi"]);
  });

  it("stays open while several are chosen", async () => {
    // Choosing indicators is usually choosing more than one, and a menu
    // that shuts after each has to be opened once per choice.
    show();
    await open("Indicators");

    await userEvent.click(screen.getByRole("menuitem", { name: /^RSI\b/ }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("takes one away without disturbing the rest", async () => {
    const { overlays } = show({ overlays: ["sma_50", "volume"] });
    await open("Indicators");

    await userEvent.click(screen.getByRole("menuitem", { name: /^Volume\b/ }));

    expect(overlays).toHaveBeenCalledWith(["sma_50"]);
  });

  it("always reports them in the same order", async () => {
    // Reported in the offered order rather than the order they were
    // pressed, so the same set always draws the same way round.
    const { overlays } = show({ overlays: ["rsi"] });
    await open("Indicators");

    await userEvent.click(screen.getByRole("menuitem", { name: /^SMA 20\b/ }));

    expect(overlays).toHaveBeenCalledWith(["sma_20", "rsi"]);
  });

  it("clears everything at once", async () => {
    const { overlays } = show({ overlays: ["sma_20", "sma_50", "rsi"] as Overlay[] });
    await open("Indicators");

    await userEvent.click(screen.getByRole("menuitem", { name: "Clear all" }));

    expect(overlays).toHaveBeenCalledWith([]);
  });

  it("offers nothing to clear when nothing is drawn", async () => {
    show({ overlays: [] });

    await open("Indicators");

    expect(screen.queryByRole("menuitem", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("says what each indicator is, since the labels are abbreviations", async () => {
    show();

    await open("Indicators");

    expect(screen.getByText("Two-hundred-session average")).toBeInTheDocument();
  });
});
