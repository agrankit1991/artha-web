/** Tests for the list of saved strategies. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, strategyRequest, strategySummary, stubPlatform } from "@/test/support";

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
    latest: strategyRequest({ status: "running", finished_at: null, backtest_id: null }),
    result: null,
  }),
  strategySummary({ strategy_id: 8, name: "Unrun", latest: null, result: null }),
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

describe("Strategies", () => {
  it("lists each strategy with how its latest backtest went", async () => {
    stubPlatform({ "/api/strategies": { body: LIST } });
    renderPage(<Strategies />);

    const table = await screen.findByRole("table", { name: "Strategies" });
    expect(await within(table).findByRole("link", { name: "Trend or calm" })).toHaveAttribute(
      "href",
      "/strategy/6",
    );
    expect(within(table).getByText("Combination")).toBeInTheDocument();
    expect(within(table).getByText("+12.9 pp")).toBeInTheDocument();
    for (const status of ["Done", "Running", "Not run", "Failed", "Queued"]) {
      expect(within(table).getByText(status)).toBeInTheDocument();
    }
    expect(screen.getByText("5 strategies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New strategy/ })).toHaveAttribute(
      "href",
      "/strategy/new",
    );
  });

  it("sorts by any column", async () => {
    stubPlatform({ "/api/strategies": { body: LIST } });
    renderPage(<Strategies />);
    const table = await screen.findByRole("table", { name: "Strategies" });
    await within(table).findByRole("link", { name: "Unrun" });
    for (const name of [
      /^Strategy/,
      /^Kind/,
      /^Latest run/,
      /^Out of sample/,
      /^Edge vs random/,
      /^CAGR/,
      /^Max drawdown/,
      /^Changed/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    expect(within(table).getAllByRole("link")).toHaveLength(LIST.length);
  });

  it("says how to start when none is saved", async () => {
    stubPlatform({ "/api/strategies": { body: [] } });
    renderPage(<Strategies />);

    expect(await screen.findByText("No strategies yet")).toBeInTheDocument();
  });

  it("says so when the strategies cannot be read", async () => {
    stubPlatform({ "/api/strategies": { status: 500, body: { detail: "strategies broke" } } });
    renderPage(<Strategies />);

    expect(await screen.findByRole("alert")).toHaveTextContent("strategies broke");
  });
});
