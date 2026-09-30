/** Tests for what worked each year. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, strategyYear, stubPlatform, yearReview } from "@/test/support";

import { StrategyYears } from "./StrategyYears";

afterEach(() => {
  vi.unstubAllGlobals();
});

const REVIEWS = [
  yearReview(),
  yearReview({
    year: 2024,
    kind: "bad",
    strategies: [strategyYear({ strategy_id: 7, name: "L01 · Low volatility 20", change: -4.0 })],
    led: null,
    lagged: null,
  }),
  yearReview({ year: 2023, kind: null, market: null, strategies: [], led: null, lagged: null }),
];

describe("StrategyYears", () => {
  it("draws each year's best against the market first, then every strategy in every year", async () => {
    stubPlatform({ "/api/strategies/years": { body: REVIEWS } });
    renderPage(<StrategyYears />);

    const bars = await screen.findByRole("list", {
      name: "Each year's best strategy against the Nifty 500",
    });
    const items = within(bars).getAllByRole("listitem");
    // 2023 had no strategy to lead it, so it is not drawn.
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("2025: M23 · Momentum 10 · Nifty gate");
    expect(items[0]).toHaveTextContent("+52.9%");
    expect(items[0]).toHaveTextContent("Nifty 500 +6.7%");

    const grid = screen.getByRole("table", { name: "Return by strategy and year" });
    const [header, market, ...strategies] = within(grid).getAllByRole("row");
    expect(header).toHaveTextContent("Strategy202320242025");
    expect(market).toHaveTextContent("Nifty 500");
    expect(strategies.map((row) => row.querySelector("th")?.textContent)).toEqual([
      "L01 · Low volatility 20",
      "M01 · Momentum 20",
      "M23 · Momentum 10 · Nifty gate",
    ]);
  });

  it("marks the year chosen, and writes the market's year as a move", async () => {
    stubPlatform({ "/api/strategies/years": { body: REVIEWS } });
    renderPage(<StrategyYears />);
    const years = await screen.findByRole("table", { name: "Years" });

    const newest = within(years).getByText("2025").closest("tr");
    expect(newest).toHaveAttribute("aria-current", "true");
    expect(within(newest as HTMLElement).getAllByText("+6.7%")[0]).toHaveClass("text-gain");

    await userEvent.click(within(years).getByText("2024"));
    expect(within(years).getByText("2024").closest("tr")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Every strategy's return in 2024, best first.")).toBeInTheDocument();
    expect(screen.queryByText(/Choose a year above/)).not.toBeInTheDocument();
    await userEvent.click(within(years).getByRole("button", { name: /^Nifty 500(?!')/ }));
  });

  it("lists each year's market and leader, and every strategy in the year chosen", async () => {
    stubPlatform({ "/api/strategies/years": { body: REVIEWS } });
    renderPage(<StrategyYears />);

    const years = await screen.findByRole("table", { name: "Years" });
    expect(within(years).getByText("Average year")).toBeInTheDocument();
    expect(within(years).getByText("a market gate, +13.2 pp")).toBeInTheDocument();
    const latest = screen.getByRole("table", { name: "Strategies in 2025" });
    expect(
      within(latest).getByRole("link", { name: "M23 · Momentum 10 · Nifty gate" }),
    ).toHaveAttribute("href", "/strategy/5");
    expect(screen.getByText(/\bled by/)).toHaveTextContent("a market gate led by +13.2 pp");
    expect(screen.getByText(/trailed by/)).toHaveTextContent("a stop-loss trailed by +9.3 pp");

    await userEvent.click(within(years).getByText("2024"));

    const chosen = await screen.findByRole("table", { name: "Strategies in 2024" });
    expect(within(chosen).getByText("L01 · Low volatility 20")).toBeInTheDocument();
    expect(screen.queryByText(/\bled by/)).not.toBeInTheDocument();
  });

  it("sorts both tables by any column", async () => {
    stubPlatform({ "/api/strategies/years": { body: REVIEWS } });
    renderPage(<StrategyYears />);
    const years = await screen.findByRole("table", { name: "Years" });
    for (const name of [
      /^Year/,
      /^Market/,
      /^Nifty 500's worst fall/,
      /^Large companies/,
      /^Nifty 50 above/,
      /^Best strategy/,
      /^Its return/,
      /^What the leaders had/,
    ]) {
      await userEvent.click(within(years).getByRole("button", { name }));
    }
    const strategies = screen.getByRole("table", { name: /^Strategies in/ });
    for (const name of [/^Strategy/, /^Return/, /^Worst fall/, /^Held on average/]) {
      await userEvent.click(within(strategies).getByRole("button", { name }));
    }

    expect(within(years).getAllByRole("row")).toHaveLength(REVIEWS.length + 1);
  });

  it("says how to begin when no strategy has been backtested", async () => {
    stubPlatform({ "/api/strategies/years": { body: [] } });
    renderPage(<StrategyYears />);

    expect(await screen.findByText("No backtested strategies yet")).toBeInTheDocument();
  });

  it("says so when the years cannot be read", async () => {
    stubPlatform({ "/api/strategies/years": { status: 500, body: { detail: "years broke" } } });
    renderPage(<StrategyYears />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Years broke");
  });
});
