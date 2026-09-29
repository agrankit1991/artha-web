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

function renderAt(id: number): ReturnType<typeof renderPage> {
  return renderPage(
    <Routes>
      <Route path="/backtest/:id" element={<Backtest />} />
    </Routes>,
    { at: `/backtest/${String(id)}` },
  );
}

/** Each table on the page and its column headers, to sort by every one. */
const SORTABLE: [string, RegExp[]][] = [
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
  [
    "Years",
    [
      /^Year/,
      /^Playbook/,
      /^Index/,
      /^Lead/,
      /^Worst fall/,
      /^Companies held/,
      /^Trades/,
      /^Large companies/,
    ],
  ],
  ["Risk and streaks", [/^Measure/, /^Out of sample/, /^In-sample/, /^Whole stretch/]],
  [
    "Basket sizes",
    [
      /^Basket/,
      /^CAGR/,
      /^In-sample/,
      /^Out of sample/,
      /^Max drawdown/,
      /^Sharpe/,
      /^Held on average/,
    ],
  ],
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
      /^Shares/,
      /^Weight at entry/,
      /^Weight while held/,
      /^Why/,
    ],
  ],
];

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
    const words = within(rules).getByRole("region", { name: "In plain words" });
    expect(within(words).getByText(/return from a year ago to a month ago/)).toBeInTheDocument();
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

  it("names the companies it would hold today, linking those still listed", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail() } });
    renderAt(7);

    const picks = await screen.findByRole("region", { name: "Picks today" });
    expect(within(picks).getByText(/holding 1 of at most 2/)).toBeInTheDocument();
    expect(within(picks).getByRole("link", { name: "CLIMBER" })).toHaveAttribute(
      "href",
      "/company/CLIMBER",
    );
    expect(
      within(picks).queryByRole("link", { name: "NSE_EQ|INE999Z01010" }),
    ).not.toBeInTheDocument();
    expect(within(picks).getByText("Hold")).toBeInTheDocument();
    expect(within(picks).getByText("Runner-up")).toBeInTheDocument();
    for (const name of [/^Rank$/, /^Symbol/, /^Close/, /^Ranking figure/, /^Today/]) {
      await userEvent.click(within(picks).getByRole("button", { name }));
    }
  });

  it("says why nothing would be held, and has no section for an old backtest", async () => {
    const shut = backtestDetail().picks;
    stubPlatform({
      "/api/backtests/7": {
        body: backtestDetail({ picks: shut && { ...shut, standing: "gate shut", candidates: [] } }),
      },
    });
    const { unmount } = renderAt(7);
    expect(await screen.findByText(/market gate is shut/)).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/backtests/7": { body: backtestDetail({ picks: null }) } });
    renderAt(7);
    await screen.findByRole("region", { name: "Verdict" });
    expect(screen.queryByRole("region", { name: "Picks today" })).not.toBeInTheDocument();
  });

  it("lists what it would buy first while its gate is shut", async () => {
    const buying = backtestDetail().picks;
    stubPlatform({
      "/api/backtests/7": {
        body: backtestDetail({
          picks: buying && {
            ...buying,
            standing: "gate shut",
            slots: 1,
            candidates: buying.candidates.map((one) => ({ ...one, chosen: false })),
          },
        }),
      },
    });
    renderAt(7);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "those marked Next are what it would buy first once it may",
    );
    const picks = screen.getByRole("table", { name: "Picks today" });
    expect(within(picks).getByRole("link", { name: "CLIMBER" })).toBeInTheDocument();
    expect(within(picks).getByText("Next")).toBeInTheDocument();
    expect(within(picks).getByText("Runner-up")).toBeInTheDocument();
    expect(within(picks).queryByText("Hold")).not.toBeInTheDocument();
  });

  it("shows its risk, streaks, basket sizes and each trade's size", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail() } });
    renderAt(7);

    const risk = await screen.findByRole("table", { name: "Risk and streaks" });
    expect(within(risk).getAllByText(/-32.0% \(15 Jan 2020/)).not.toHaveLength(0);
    expect(within(risk).getAllByText("96 sessions")).not.toHaveLength(0);
    expect(within(risk).getAllByText("11 trades, -70.0%")).not.toHaveLength(0);
    expect(within(risk).getAllByText("0-10, 7.4 on average")).not.toHaveLength(0);
    const baskets = screen.getByRole("table", { name: "Basket sizes" });
    expect(within(baskets).getByText("as written")).toBeInTheDocument();
    const years = screen.getByRole("table", { name: "Years" });
    expect(within(years).getByText("9.2 (6-10)")).toBeInTheDocument();
    expect(within(years).getByText("44%")).toBeInTheDocument();
    const trades = screen.getByRole("table", { name: "Trades" });
    expect(within(trades).getByText("1,210")).toBeInTheDocument();
    expect(within(trades).getByText("8.1% - 17.6%")).toBeInTheDocument();
  });

  it("leaves out what a backtest kept before the detailed measures lacks", async () => {
    const older = backtestDetail({
      periods: backtestDetail().periods.map((period) => ({ ...period, detail: null })),
      baskets: [],
      market: [],
      explanation: null,
      plays: [
        ...backtestDetail().plays,
        { name: "Other", when: "1", rules: { rank: "close", slots: 10 } },
      ],
    });
    stubPlatform({ "/api/backtests/7": { body: older } });
    renderAt(7);

    await screen.findByRole("table", { name: "Trades" });
    expect(screen.queryByRole("table", { name: "Risk and streaks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Basket sizes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "In plain words" })).not.toBeInTheDocument();
  });

  // One test per table: all five in one test outgrew the time limit under the full suite.
  it.each(SORTABLE)("sorts the %s table by any column", async (label, names) => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail({ benchmark: "sensex" }) } });
    renderAt(7);
    const table = await screen.findByRole("table", { name: label });

    for (const name of names) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1);
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

    expect(await screen.findByRole("alert")).toHaveTextContent("Backtest broke");
  });
});
