/** Tests for a bubble floating above the page beside its anchor. */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { placeBeside } from "@/components/Floating";
import { Hint } from "@/components/Hint";
import { renderPage } from "@/test/support";

const SCREEN = { width: 1024, height: 768 };
const BUBBLE = { width: 256, height: 80 };

describe("placeBeside", () => {
  it("lines up with the anchor's right edge from a last column, and keeps inside the screen", () => {
    // A mark in a table's last column, near the screen's right edge.
    const lastColumn = { top: 100, bottom: 116, left: 990, right: 1006 };

    expect(placeBeside(lastColumn, BUBBLE, SCREEN, "start")).toEqual({ top: 120, left: 750 });
    // Opening towards the end would run off the screen: it is pulled back in.
    expect(placeBeside(lastColumn, BUBBLE, SCREEN, "end")).toEqual({ top: 120, left: 760 });
  });

  it("opens above when there is no room below, and below when there is room for neither", () => {
    const low = { top: 700, bottom: 716, left: 100, right: 116 };
    const tiny = { width: 1024, height: 100 };

    expect(placeBeside(low, BUBBLE, SCREEN, "end")).toEqual({ top: 616, left: 100 });
    expect(
      placeBeside({ top: 10, bottom: 26, left: 100, right: 116 }, BUBBLE, tiny, "end"),
    ).toEqual({
      top: 30,
      left: 100,
    });
  });

  it("keeps a margin from the left edge too", () => {
    expect(
      placeBeside({ top: 0, bottom: 16, left: 2, right: 18 }, BUBBLE, SCREEN, "start").left,
    ).toBe(8);
  });
});

describe("Floating", () => {
  it("closes when the page or a box in it scrolls", async () => {
    renderPage(<Hint text="Its deepest fall.">Max drawdown</Hint>);

    await userEvent.hover(screen.getByRole("button", { name: "What Max drawdown means" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Its deepest fall.");
    fireEvent.scroll(window);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
