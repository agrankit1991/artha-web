/** Tests for choosing one line's colour and width. */

import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LineStyleEditor } from "./LineStyleEditor";
import type { LineStyleChange } from "@/api/client";
import { SWATCHES } from "@/lib/chartPalette";
import { renderPage } from "@/test/support";

type Change = (change: LineStyleChange) => void;

function edit(
  own: LineStyleChange,
  fallbackColour = "var(--chart-1)",
): ReturnType<typeof vi.fn<Change>> {
  const onChange = vi.fn<Change>();
  renderPage(
    <LineStyleEditor
      label="SMA 50"
      own={own}
      fallbackColour={fallbackColour}
      onChange={onChange}
    />,
  );
  return onChange;
}

const RED = SWATCHES[0].colour;

describe("LineStyleEditor", () => {
  it("offers the default, every swatch and a colour of one's own, the one set marked", async () => {
    const onChange = edit({ colour: RED, width: 2 });
    const colours = screen.getByRole("group", { name: "SMA 50 colour" });

    expect(within(colours).getAllByRole("button")).toHaveLength(SWATCHES.length + 1);
    expect(within(colours).getByRole("button", { name: "Red" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(colours).getByRole("button", { name: "The chart's own" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(within(colours).getByRole("button", { name: "Teal" }));
    expect(onChange).toHaveBeenLastCalledWith({ colour: SWATCHES[7].colour, width: 2 });
    await userEvent.click(within(colours).getByRole("button", { name: "The chart's own" }));
    expect(onChange).toHaveBeenLastCalledWith({ colour: null, width: 2 });
  });

  it("chooses a width, or Auto for the chart's own", async () => {
    const onChange = edit({ colour: null, width: null });
    const widths = screen.getByRole("group", { name: "SMA 50 thickness" });

    await userEvent.click(within(widths).getByRole("button", { name: "3px" }));
    expect(onChange).toHaveBeenLastCalledWith({ colour: null, width: 3 });
  });

  it("goes back to Auto from a width of one's own", async () => {
    const onChange = edit({ colour: null, width: 4 });

    await userEvent.click(screen.getByRole("button", { name: "Auto" }));
    expect(onChange).toHaveBeenLastCalledWith({ colour: null, width: null });
  });

  it("keeps a colour of one's own when the picker closes, written one way", () => {
    const onChange = edit({ colour: null, width: 1 });
    const custom = screen.getByLabelText("A colour of your own");

    fireEvent.change(custom, { target: { value: "#ABCDEF" } });

    expect(onChange).toHaveBeenLastCalledWith({ colour: "#abcdef", width: 1 });
  });

  it("opens the picker on the colour set, else the default's where it is a colour", () => {
    edit({ colour: "#123456", width: null });
    expect(screen.getByLabelText("A colour of your own")).toHaveValue("#123456");
  });

  it("opens the picker on the default where it is a colour, else on the grey", () => {
    edit({ colour: null, width: null }, "#0d9488");
    expect(screen.getByLabelText("A colour of your own")).toHaveValue("#0d9488");
  });

  it("opens the picker on the grey where the default is a token it cannot read", () => {
    edit({ colour: null, width: null });
    expect(screen.getByLabelText("A colour of your own")).toHaveValue(SWATCHES[17].colour);
  });
});
