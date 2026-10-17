/** Tests for the list of saved strategies. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  marketPhaseView,
  phaseReview,
  renderPage,
  strategyRequest,
  strategyResult,
  strategySummary,
  stubPlatform,
} from "@/test/support";

import { Strategies } from "./Strategies";

afterEach(() => {
  vi.unstubAllGlobals();
});

const LIST = [
  strategySummary(),
  strategySummary({
    strategy_id: 6,
    name: "Trend or calm",
    combines: true,
    style: "combination",
    latest: strategyRequest({ status: "running", finished_at: null, backtest_id: null }),
    result: null,
  }),
  strategySummary({
    strategy_id: 8,
    name: "Unrun",
    style: "low_volatility",
    latest: null,
    result: null,
  }),
  strategySummary({
    strategy_id: 9,
    name: "Broken",
    latest: strategyRequest({ status: "failed", error: "no", backtest_id: null }),
    result: null,
  }),
  strategySummary({
    strategy_id: 10,
    name: "Waiting",
    latest: strategyRequest({ status: "queued", started_at: null, finished_at: null }),
    result: null,
  }),
];

/** The platform: the strategies, and the market's phase for Start today. */
function platform(strategies: unknown): void {
  stubPlatform({
    "/api/strategies": { body: strategies },
    "/api/market/phase/strategies": { body: phaseReview() },
    "/api/market/phase/calls": { body: [] },
    "/api/market/phase": { body: marketPhaseView() },
  });
}

describe("Strategies", () => {
  it("lists each strategy with how its latest backtest went", async () => {
    platform(LIST);
    renderPage(<Strategies />);

    const table = await screen.findByRole("table", { name: "Strategies" });
    expect(await within(table).findByRole("link", { name: "Trend or calm" })).toHaveAttribute(
      "href",
      "/strategy/6",
    );
    expect(within(table).getByText("Combination")).toBeInTheDocument();
    // Every style and risk is a badge, and a return reads as a move up or down.
    expect(within(table).getAllByText("Momentum", { selector: "[data-slot=badge]" }).length).toBe(
      3,
    );
    expect(
      within(table).getByText("Low volatility", { selector: "[data-slot=badge]" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Fall 25-35%", { selector: "[data-slot=badge]" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("+12.9 pp")).toHaveClass("text-gain");
    for (const status of ["Done", "Running", "Not run", "Failed", "Queued"]) {
      expect(within(table).getByText(status)).toBeInTheDocument();
    }
    expect(screen.getByText("5 strategies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New strategy/ })).toHaveAttribute(
      "href",
      "/strategy/new",
    );
    expect(screen.getByRole("link", { name: /By year/ })).toHaveAttribute(
      "href",
      "/strategies/years",
    );
  });

  it("sorts by any column", async () => {
    platform(LIST);
    renderPage(<Strategies />);
    const table = await screen.findByRole("table", { name: "Strategies" });
    await within(table).findByRole("link", { name: "Unrun" });
    for (const name of [
      /^Strategy/,
      /^Style/,
      /^Risk/,
      /^Latest run/,
      /^Out of sample/,
      /^Edge vs random/,
      /^CAGR/,
      /^Balance/,
      /^vs Nifty 500/,
      /^Max drawdown/,
      /^Changed/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    expect(within(table).getAllByRole("link")).toHaveLength(LIST.length);
  });

  it("filters the list and Start today by style and by risk, in the address", async () => {
    platform([
      ...LIST,
      strategySummary({
        strategy_id: 11,
        name: "Deep faller",
        result: strategyResult({ max_drawdown: -41.2 }),
      }),
    ]);
    renderPage(<Strategies />);
    const table = await screen.findByRole("table", { name: "Strategies" });
    await within(table).findByRole("link", { name: "Deep faller" });
    // Only the styles present are offered.
    const styles = screen.getByRole("group", { name: "Style" });
    expect(within(styles).queryByRole("button", { name: "Rebound" })).toBeNull();

    await userEvent.click(within(styles).getByRole("button", { name: "Low volatility" }));
    expect(
      within(table)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Unrun"]);
    await userEvent.click(within(styles).getByRole("button", { name: "Every style" }));
    await userEvent.click(
      within(screen.getByRole("group", { name: "Risk" })).getByRole("button", {
        name: "Fall over 35%",
      }),
    );

    expect(
      within(table)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Deep faller"]);
    // Start today keeps only those too: neither of its strategies is in the band.
    const ranked = screen.getByRole("table", { name: "Strategies for this phase" });
    expect(within(ranked).queryAllByRole("link")).toHaveLength(0);
  });

  it("says how to start when none is saved", async () => {
    stubPlatform({ "/api/strategies": { body: [] } });
    renderPage(<Strategies />);

    expect(await screen.findByText("No strategies yet")).toBeInTheDocument();
  });

  it("says so when the strategies cannot be read", async () => {
    stubPlatform({ "/api/strategies": { status: 500, body: { detail: "strategies broke" } } });
    renderPage(<Strategies />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Strategies broke");
  });
});

describe("Strategies' order", () => {
  it("opens best balanced first, unrun last, and keeps only those beating the Nifty 500 when asked", async () => {
    platform([
      strategySummary({ strategy_id: 1, name: "Unrun", latest: null, result: null }),
      strategySummary({
        strategy_id: 2,
        name: "Steep",
        result: strategyResult({ balance: 0.7, benchmark_lead: 25 }),
      }),
      strategySummary({
        strategy_id: 3,
        name: "Balanced",
        result: strategyResult({ balance: 1.2, benchmark_lead: 21 }),
      }),
      strategySummary({
        strategy_id: 4,
        name: "Trailing",
        result: strategyResult({ balance: 0.5, benchmark_lead: -1.5 }),
      }),
    ]);
    renderPage(<Strategies />);
    const table = await screen.findByRole("table", { name: "Strategies" });
    await within(table).findByRole("link", { name: "Balanced" });
    const names = (): (string | null)[] =>
      within(table)
        .getAllByRole("link")
        .map((link) => link.textContent);

    expect(names()).toEqual(["Balanced", "Steep", "Trailing", "Unrun"]);
    expect(within(table).getByText("-1.5 pp")).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("group", { name: "Index" })).getByRole("button", {
        name: "Beats the Nifty 500",
      }),
    );

    expect(names()).toEqual(["Balanced", "Steep"]);
  });
});
