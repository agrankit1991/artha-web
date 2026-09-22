/** Tests for participation over time, as a grid. */

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { breadthSession } from "@/test/support";

import { BreadthHeatmap, type HeatmapRow } from "./BreadthHeatmap";

function draw(rows: HeatmapRow[]): void {
  render(
    <MemoryRouter>
      <BreadthHeatmap rows={rows} measure="above_sma_50" measureLabel="50-day" />
    </MemoryRouter>,
  );
}

describe("BreadthHeatmap", () => {
  it("colours each session by its share, and says it in words", () => {
    draw([
      {
        key: "NSE_INDEX|Nifty 50",
        label: "Nifty 50",
        href: "/index/nifty-50",
        sessions: [
          breadthSession({ as_of: "2026-09-21", above_sma_50: "12.0" }),
          breadthSession({ as_of: "2026-09-22", above_sma_50: "85.0" }),
        ],
      },
      {
        key: "NSE_INDEX|Nifty Bank",
        label: "Bank Nifty",
        href: "/index/nifty-bank",
        sessions: [breadthSession({ as_of: "2026-09-22", above_sma_50: "50.0" })],
      },
      // A population with nothing counted, like India VIX, is left out.
      { key: "NSE_INDEX|India VIX", label: "India VIX", href: "/index/india-vix", sessions: [] },
    ]);

    const table = screen.getByRole("table", { name: "Share above the 50-day average" });
    expect(within(table).getByRole("link", { name: "Nifty 50" })).toHaveAttribute(
      "href",
      "/index/nifty-50",
    );
    expect(within(table).queryByText("India VIX")).not.toBeInTheDocument();
    expect(
      within(table).getByLabelText(/Nifty 50, 21 Sept? 2026: 12% above the 50-day average/),
    ).toHaveClass("bg-loss/80");
    expect(
      within(table).getByLabelText(/Nifty 50, 22 Sept? 2026: 85% above the 50-day average/),
    ).toHaveClass("bg-gain/80");
    expect(within(table).getByLabelText(/Bank Nifty, 22 Sept? 2026: 50%/)).toHaveClass(
      "bg-caution/45",
    );
    // Bank Nifty has no count on the 21st.
    expect(within(table).getByLabelText(/Bank Nifty, 21 Sept? 2026: not counted/)).toHaveClass(
      "bg-muted",
    );
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("80% and over");
  });

  it("holds a place while the first rows load", () => {
    const { container } = render(
      <MemoryRouter>
        <BreadthHeatmap rows={[]} measure="above_sma_20" measureLabel="20-day" loading />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
