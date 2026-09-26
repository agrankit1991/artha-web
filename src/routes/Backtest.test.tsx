/** Tests for one kept backtest's page. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { backtestDetail, backtestPeriod, renderPage, stubPlatform } from "@/test/support";

import { Backtest } from "./Backtest";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(id: number): void {
  renderPage(
    <Routes>
      <Route path="/backtest/:id" element={<Backtest />} />
    </Routes>,
    { at: `/backtest/${String(id)}` },
  );
}

describe("Backtest", () => {
  it("leads with the out-of-sample verdict and shows every period, year and rule", async () => {
    const fetched = stubPlatform({ "/api/backtests/7": { body: backtestDetail() } });
    renderAt(7);

    const verdict = await screen.findByRole("region", { name: "Verdict" });
    expect(within(verdict).getByText("Out of sample")).toBeInTheDocument();
    expect(within(verdict).getByText("+12.9 pp")).toBeInTheDocument();
    expect(within(verdict).getByText("random picks: +13.1%")).toBeInTheDocument();
    expect(fetched).toHaveBeenCalledWith("/api/backtests/7", expect.anything());

    const periods = screen.getByRole("table", { name: "Periods" });
    expect(within(periods).getByText("Whole stretch")).toBeInTheDocument();
    expect(within(periods).getByText("+17.5% to +26.1%")).toBeInTheDocument();

    const years = screen.getByRole("table", { name: "Years" });
    expect(within(years).getByText("+10.0 pp")).toBeInTheDocument();

    const rules = screen.getByRole("region", { name: "Rules" });
    expect(within(rules).getByText("lag(close, 21) / lag(close, 252) - 1")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("survived");
  });

  it("links a trade in a listed company to its page and leaves an unlisted one plain", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail() } });
    renderAt(7);

    const trades = await screen.findByRole("table", { name: "Trades" });
    expect(within(trades).getByRole("link", { name: "CLIMBER" })).toHaveAttribute(
      "href",
      "/company/CLIMBER",
    );
    expect(
      within(trades).queryByRole("link", { name: "NSE_EQ|INE999Z01010" }),
    ).not.toBeInTheDocument();
    expect(within(trades).getByText("NSE_EQ|INE999Z01010")).toBeInTheDocument();
    expect(within(trades).getByText("Target")).toBeInTheDocument();
    expect(within(trades).getByText("50%")).toBeInTheDocument();
  });

  it("names each play of a playbook with how long it was in force", async () => {
    const detail = backtestDetail({
      switch: "monthly",
      plays: [
        { name: "Momentum", when: "nifty50 > sma(nifty50, 200)", rules: { rank: "close" } },
        { name: "Calm", when: "1", rules: { rank: "-vol(close, 252)" } },
      ],
      periods: [backtestPeriod({ name: "whole", played: { Momentum: 75.2, Calm: 24.8 } })],
    });
    stubPlatform({ "/api/backtests/7": { body: detail } });
    renderAt(7);

    const momentum = await screen.findByRole("region", { name: "Momentum" });
    expect(within(momentum).getByText("nifty50 > sma(nifty50, 200)")).toBeInTheDocument();
    expect(within(momentum).getByText("In force 75% of the sessions.")).toBeInTheDocument();
    expect(screen.getByText(/read monthly/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Verdict" })).toHaveTextContent("The whole stretch");
  });

  it("sorts every table by any column", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail({ benchmark: "sensex" }) } });
    renderAt(7);
    const trades = await screen.findByRole("table", { name: "Trades" });
    const headers: [string, RegExp[]][] = [
      [
        "Periods",
        [
          /^Period/,
          /^CAGR/,
          /^Median calendar/,
          /^Random picks/,
          /^Edge/,
          /^Index/,
          /^Max drawdown/,
          /^Sharpe/,
          /^Trades/,
          /^Won/,
          /^Invested/,
        ],
      ],
      ["Years", [/^Year/, /^Playbook/, /^Index/, /^Lead/]],
      [
        "Trades",
        [
          /^Symbol/,
          /^Bought$/,
          /^Sold/,
          /^Sessions/,
          /^Bought at/,
          /^Gain/,
          /^Of the holding/,
          /^Why/,
        ],
      ],
    ];
    for (const [label, names] of headers) {
      const table = screen.getByRole("table", { name: label });
      for (const name of names) {
        await userEvent.click(within(table).getByRole("button", { name }));
      }
    }

    expect(within(trades).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("against the sensex")).toBeInTheDocument();
  });

  it("says so when no backtest has the number", async () => {
    stubPlatform({ "/api/backtests/9": { status: 404, body: { detail: "no backtest 9" } } });
    renderAt(9);

    expect(await screen.findByText("No backtest 9")).toBeInTheDocument();
  });

  it("says so when the backtest cannot be read", async () => {
    stubPlatform({ "/api/backtests/7": { status: 500, body: { detail: "backtest broke" } } });
    renderAt(7);

    expect(await screen.findByRole("alert")).toHaveTextContent("backtest broke");
  });
});
