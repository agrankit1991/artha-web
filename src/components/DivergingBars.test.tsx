/** Tests for a ranked list drawn either side of nought. */

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DivergingBars } from "./DivergingBars";

describe("DivergingBars", () => {
  it("prints every figure, links what has a page, and grows each bar from nought", () => {
    render(
      <MemoryRouter>
        <DivergingBars
          label="Sectors"
          rows={[
            { label: "Metals", value: 2, href: "/sector/metals" },
            { label: "Banks", value: -1 },
          ]}
        />
      </MemoryRouter>,
    );

    const list = screen.getByRole("list", { name: "Sectors" });
    expect(within(list).getByRole("link", { name: "Metals" })).toHaveAttribute(
      "href",
      "/sector/metals",
    );
    // Nothing to open, so a name rather than a link to nowhere.
    expect(within(list).queryByRole("link", { name: "Banks" })).not.toBeInTheDocument();
    expect(within(list).getByText("+2.00%")).toBeInTheDocument();
    expect(within(list).getByText("-1.00%")).toBeInTheDocument();

    // The largest move reaches the edge; the rest are read against it.
    const bars = [...list.querySelectorAll<HTMLElement>(".bg-gain, .bg-loss")];
    expect(bars.map((bar) => bar.style.width)).toEqual(["50%", "25%"]);
  });
});
