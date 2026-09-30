/** Tests for a strategy's latest verdict and picks. */

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { backtestDetail, renderPage, strategyResult, stubPlatform } from "@/test/support";

import { StrategyResultPanel } from "./StrategyResult";

afterEach(() => {
  vi.unstubAllGlobals();
});

const RESULT = strategyResult();

describe("StrategyResultPanel", () => {
  it("shows the verdict and the companies the backtest would hold today", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail() } });
    renderPage(<StrategyResultPanel result={RESULT} />);

    // The verdict is the backtest's own, drawn as the Backtest page draws it.
    expect(await screen.findByText("+30.4%")).toBeInTheDocument();
    expect(screen.getByText("+12.9 pp")).toBeInTheDocument();
    expect(screen.getByText(/Out of sample: 1 Jan 2018 - /)).toBeInTheDocument();
    expect(screen.queryByText(/is from 2018/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /The whole record/ })).toHaveAttribute(
      "href",
      "/backtest/7",
    );
    expect(await screen.findByRole("link", { name: "CLIMBER" })).toBeInTheDocument();
  });

  it("says so when the backtest kept no picks", async () => {
    stubPlatform({ "/api/backtests/7": { body: backtestDetail({ picks: null }) } });
    renderPage(<StrategyResultPanel result={RESULT} />);

    expect(await screen.findByText("This backtest kept no picks.")).toBeInTheDocument();
  });

  it("says so when the backtest cannot be read", async () => {
    stubPlatform({ "/api/backtests/7": { status: 500, body: { detail: "backtest broke" } } });
    renderPage(<StrategyResultPanel result={RESULT} />);

    expect(await screen.findByText("Backtest broke")).toBeInTheDocument();
  });
});
