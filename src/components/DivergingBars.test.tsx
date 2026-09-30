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

  it("draws to a reach it is given, so lists side by side share one scale", () => {
    render(
      <MemoryRouter>
        <DivergingBars label="Slowest" reach={8} rows={[{ label: "Paper", value: 2 }]} />
      </MemoryRouter>,
    );

    const bar = screen
      .getByRole("list", { name: "Slowest" })
      .querySelector<HTMLElement>(".bg-gain");
    expect(bar?.style.width).toBe("12.5%");
  });

  it("draws a second figure thin and neutral under the first, with a legend", () => {
    render(
      <MemoryRouter>
        <DivergingBars
          label="Best against the market"
          legend={{ value: "Best strategy", against: "Nifty 500" }}
          rows={[
            { label: "2025", value: 30, against: -10 },
            { label: "2024", value: -5, against: null },
          ]}
        />
      </MemoryRouter>,
    );

    const [first, second] = within(
      screen.getByRole("list", { name: "Best against the market" }),
    ).getAllByRole("listitem");
    expect(first).toHaveTextContent("Nifty 500 -10.00%");
    expect(second).toHaveTextContent("Nifty 500 -");
    expect(screen.getByText("Best strategy")).toBeInTheDocument();
    // Scaled to the larger of either figure: 30 fills a half-track.
    const bars = first?.querySelectorAll<HTMLElement>("[style]") ?? [];
    expect(bars[0]?.style.width).toBe("50%");
    expect(bars[1]?.style.width).toBe(`${String((10 / 30) * 50)}%`);
  });
});
