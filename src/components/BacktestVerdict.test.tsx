/** Tests for the verdict tiles both backtest pages share. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { backtestPeriod } from "@/test/support";

import { VerdictTiles, periodName, verdictPeriod } from "./BacktestVerdict";

describe("verdictPeriod", () => {
  it("judges out of sample where there is one, else the whole stretch", () => {
    const whole = backtestPeriod({ name: "whole" });
    const unseen = backtestPeriod({ name: "out-of-sample" });

    expect(verdictPeriod([whole, unseen])).toBe(unseen);
    expect(verdictPeriod([backtestPeriod({ name: "in-sample" }), whole])).toBe(whole);
    expect(verdictPeriod([])).toBeUndefined();
    expect(periodName(whole)).toBe("The whole stretch");
    expect(periodName(backtestPeriod({ name: "in-sample" }))).toBe("In sample");
  });
});

describe("VerdictTiles", () => {
  it("names the median start day the edge is measured from, where it is not the CAGR shown", () => {
    // 26.1 less 13.1 is the edge; 30.4 less 13.1 is not.
    render(<VerdictTiles period={backtestPeriod()} index="Nifty 500" />);

    expect(screen.getByText("+30.4%")).toBeInTheDocument();
    expect(screen.getByText("Nifty 500: +10.7%")).toBeInTheDocument();
    expect(screen.getByText("+12.9 pp")).toBeInTheDocument();
    expect(
      screen.getByText("Median start day +26.1% against random picks' +13.1%"),
    ).toBeInTheDocument();
    expect(screen.getByText("-32.0%")).toBeInTheDocument();
    expect(screen.getByText("1.33")).toBeInTheDocument();
  });

  it("says only what random picks made where the strategy has one schedule", () => {
    render(<VerdictTiles period={backtestPeriod({ judged_cagr: 30.4 })} index="Nifty 50" />);

    expect(screen.getByText("Against random picks' +13.1%")).toBeInTheDocument();
  });

  it("dashes a figure the backtest did not measure", () => {
    render(
      <VerdictTiles
        period={backtestPeriod({ cagr: null, edge: null, judged_cagr: null })}
        index="Nifty 50"
      />,
    );

    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^Against random picks'/)).toBeInTheDocument();
  });

  it("holds each tile's place while the backtest loads", () => {
    const { container } = render(<VerdictTiles period={undefined} index="" />);

    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThanOrEqual(4);
  });
});
