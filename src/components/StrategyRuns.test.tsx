/** Tests for the list of a strategy's backtest runs. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, strategyRequest } from "@/test/support";

import { StrategyRuns, duration } from "./StrategyRuns";

afterEach(() => {
  vi.unstubAllGlobals();
});

const RUNS = [
  strategyRequest(),
  strategyRequest({
    request_id: 12,
    status: "failed",
    finished_at: "2026-09-26T18:00:35+05:30",
    error: "rank: no series named 'closes'",
    backtest_id: null,
  }),
  strategyRequest({
    request_id: 13,
    status: "running",
    finished_at: null,
    backtest_id: null,
  }),
  strategyRequest({
    request_id: 14,
    status: "queued",
    started_at: null,
    finished_at: null,
    backtest_id: null,
  }),
];

describe("StrategyRuns", () => {
  it("shows how each run went, a finished one leading to its backtest", () => {
    renderPage(<StrategyRuns requests={RUNS} />);

    const table = screen.getByRole("table", { name: "Backtest runs" });
    expect(within(table).getAllByRole("link")).toHaveLength(1);
    expect(within(table).getByRole("link")).toHaveAttribute("href", "/backtest/7");
    expect(within(table).getByText("Backtest 7")).toBeInTheDocument();
    expect(within(table).getByText("1m 40s")).toBeInTheDocument();
    expect(within(table).getByText("30s")).toBeInTheDocument();
    expect(within(table).getByText("rank: no series named 'closes'")).toBeInTheDocument();
    for (const status of ["Done", "Failed", "Running", "Queued"]) {
      expect(within(table).getByText(status)).toBeInTheDocument();
    }
  });

  it("sorts by any column", async () => {
    renderPage(<StrategyRuns requests={RUNS} />);
    const table = screen.getByRole("table", { name: "Backtest runs" });
    for (const name of [/^Asked/, /^Status/, /^Took/, /^Outcome/]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    expect(within(table).getAllByRole("row")).toHaveLength(RUNS.length + 1);
  });

  it("says when it has not been run", () => {
    renderPage(<StrategyRuns requests={[]} />);

    expect(screen.getByText("Not backtested yet")).toBeInTheDocument();
  });
});

describe("duration", () => {
  it("is a dash until the run has finished", () => {
    expect(duration(strategyRequest({ finished_at: null }))).toBe("—");
  });
});
