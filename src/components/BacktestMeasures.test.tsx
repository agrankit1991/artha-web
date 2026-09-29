/** Tests for a backtest's risk and streaks table. */

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { backtestPeriod, periodDetail, renderPage } from "@/test/support";

import { BacktestBaskets } from "./BacktestBaskets";
import { BacktestMeasures } from "./BacktestMeasures";

describe("BacktestMeasures", () => {
  it("says so when a fall never recovered, and leaves out what a stretch lacks", () => {
    const unrecovered = periodDetail({
      deepest: {
        depth: -20,
        peak: "2026-01-02",
        trough: "2026-03-02",
        recovered: null,
        sessions_down: 40,
        sessions_to_recover: null,
      },
      months: null,
    });
    renderPage(
      <BacktestMeasures
        periods={[
          backtestPeriod({ detail: unrecovered }),
          backtestPeriod({ name: "whole", detail: periodDetail({ deepest: null }) }),
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Risk and streaks" });
    const recovery = within(table).getByText("It recovered in").closest("tr");
    expect(recovery).toHaveTextContent("not recovered");
    const month = within(table).getByText("Best month").closest("tr");
    expect(month).toHaveTextContent("-");
    const rising = within(table).getByText("Longest run of falling months").closest("tr");
    expect(rising).toHaveTextContent("-");
  });

  it("draws nothing for a backtest without detailed measures", () => {
    const { container } = renderPage(
      <BacktestMeasures periods={[backtestPeriod({ detail: null })]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("BacktestBaskets", () => {
  it("marks no size when the playbook's plays hold different numbers", () => {
    renderPage(
      <BacktestBaskets
        baskets={[
          {
            slots: 10,
            cagr: 20,
            max_drawdown: -30,
            sharpe: null,
            holdings: 9,
            in_sample_cagr: null,
            out_of_sample_cagr: null,
          },
        ]}
        written={null}
      />,
    );

    expect(screen.queryByText("as written")).not.toBeInTheDocument();
    expect(screen.getByText("10 companies")).toBeInTheDocument();
  });
});
