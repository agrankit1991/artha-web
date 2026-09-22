/** Tests for the regime banner. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegimeBanner } from "./RegimeBanner";

describe("RegimeBanner", () => {
  it("names the band and says what it means", () => {
    // "65%" is not a reading anybody can act on; "risk-on" is.
    render(<RegimeBanner regime="risk-on" share={65} rank={71} sessions={6621} />);

    expect(screen.getByText("Risk-on")).toBeInTheDocument();
    expect(screen.getByText(/Broad uptrend/)).toBeInTheDocument();
    expect(screen.getByText("65.0%")).toBeInTheDocument();
  });

  it("does not paint a nearly-extended market as the best news", () => {
    // Above seventy per cent is where money rotates out of risk, so it is
    // neither green nor red.
    render(<RegimeBanner regime="over-extended" share={82} rank={97} sessions={6621} />);

    expect(screen.getByText("Over-extended")).toHaveClass("text-caution");
    expect(screen.getByText(/rotates out of risk/)).toBeInTheDocument();
  });

  it("places the reading in the population's own history", () => {
    render(<RegimeBanner regime="mixed" share={43} rank={12} sessions={6621} />);

    expect(screen.getByText(/Higher than 12% of its own history/)).toBeInTheDocument();
  });

  it("describes a reading near the bottom by what it is under", () => {
    // "Lower than 95%" lands harder than "5th percentile", and neither
    // phrasing needs an ordinal suffix generated at runtime.
    render(<RegimeBanner regime="risk-off" share={22} rank={5} sessions={6621} />);

    expect(screen.getByText(/Lower than 95% of its own history/)).toBeInTheDocument();
  });

  it("says nothing about history when there is none to rank against", () => {
    // A percentile over no sessions is not a percentile.
    render(<RegimeBanner regime="mixed" share={43} rank={null} sessions={0} />);

    expect(screen.queryByText(/percentile/)).not.toBeInTheDocument();
    expect(screen.getByText(/above their 200-day/)).toBeInTheDocument();
  });

  it("says a population is uncounted rather than calling it a bear market", () => {
    render(<RegimeBanner regime={null} share={null} rank={null} />);

    expect(screen.getByText("Nothing counted for this population yet")).toBeInTheDocument();
  });

  it("holds its shape while the counts are on their way", () => {
    const { container } = render(<RegimeBanner regime={null} share={null} rank={null} loading />);

    expect(screen.queryByText(/Nothing counted/)).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
