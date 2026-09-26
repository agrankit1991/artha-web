/** Tests for the list of kept backtests. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { backtestSummary, renderPage, stubPlatform } from "@/test/support";

import { Backtests } from "./Backtests";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Backtests", () => {
  it("lists each kept backtest with its verdict, leading to its record", async () => {
    stubPlatform({
      "/api/backtests": {
        body: [
          backtestSummary(),
          backtestSummary({
            backtest_id: 8,
            name: "Unsplit",
            out_of_sample_cagr: null,
            out_of_sample_edge: null,
          }),
        ],
      },
    });
    renderPage(<Backtests />);

    const table = await screen.findByRole("table", { name: "Kept backtests" });
    expect(
      await within(table).findByRole("link", { name: "Momentum near the high" }),
    ).toHaveAttribute("href", "/backtest/7");
    expect(within(table).getByText("+12.9 pp")).toBeInTheDocument();
    expect(within(table).getByText("+30.4%")).toBeInTheDocument();
    expect(screen.getByText("2 backtests")).toBeInTheDocument();
  });

  it("sorts by any column", async () => {
    stubPlatform({
      "/api/backtests": {
        body: [backtestSummary(), backtestSummary({ backtest_id: 8, name: "Other", cagr: 9 })],
      },
    });
    renderPage(<Backtests />);
    const table = await screen.findByRole("table", { name: "Kept backtests" });
    await within(table).findByRole("link", { name: "Other" });
    for (const name of [
      /^Playbook/,
      /^Traded/,
      /^CAGR/,
      /^Out of sample/,
      /^Edge vs random/,
      /^Max drawdown/,
      /^Sharpe/,
      /^Run/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    expect(within(table).getAllByRole("link")).toHaveLength(2);
  });

  it("says how to keep one when none is kept", async () => {
    stubPlatform({ "/api/backtests": { body: [] } });
    renderPage(<Backtests />);

    expect(await screen.findByText("No backtests kept yet")).toBeInTheDocument();
  });

  it("says so when the backtests cannot be read", async () => {
    stubPlatform({ "/api/backtests": { status: 500, body: { detail: "backtests broke" } } });
    renderPage(<Backtests />);

    expect(await screen.findByRole("alert")).toHaveTextContent("backtests broke");
  });
});
