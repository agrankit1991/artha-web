/** Tests for every strategy's return in every year. */

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderPage, strategyYear, yearReview } from "@/test/support";

import { StrategyYearGrid, gridOf } from "./StrategyYearGrid";

const REVIEWS = [
  yearReview(),
  yearReview({
    year: 2024,
    market: null,
    strategies: [strategyYear({ change: -20.0 })],
  }),
];

describe("gridOf", () => {
  it("lays years oldest first, the market first and each strategy once, by name", () => {
    const { years, rows } = gridOf(REVIEWS);

    expect(years).toEqual([2024, 2025]);
    expect(rows.map((row) => row.name)).toEqual([
      "Nifty 500",
      "M01 · Momentum 20",
      "M23 · Momentum 10 · Nifty gate",
    ]);
    expect(rows[2]?.byYear.get(2024)).toBe(-20.0);
    expect(rows[0]?.byYear.get(2024)).toBeNull();
  });
});

describe("StrategyYearGrid", () => {
  it("colours each year by its return, dashes one not tested, and leads to each strategy", () => {
    renderPage(<StrategyYearGrid reviews={REVIEWS} />);

    const grid = screen.getByRole("table", { name: "Return by strategy and year" });
    const rise = within(grid).getByText("+52.9%");
    // No stylesheet in a test: mixed in the stylesheet from the heat tokens.
    expect(rise.style.backgroundColor).toContain("var(--heat-gain)");
    expect(within(grid).getByText("-20.0%").style.backgroundColor).toContain("var(--heat-loss)");
    // The market had no reading for 2024, and M01 no backtest year.
    expect(within(grid).getAllByText("-")).toHaveLength(2);
    expect(within(grid).getByRole("link", { name: "M01 · Momentum 20" })).toHaveAttribute(
      "href",
      "/strategy/6",
    );
  });
});
