/** Tests for a company's valuation drawn over its own sessions. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ValuationHistoryChart } from "./ValuationHistoryChart";
import { renderPage, valuationHistory, valuationSession } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

describe("ValuationHistoryChart", () => {
  it("says where today sits in the run, for both ratios", () => {
    renderPage(
      <ValuationHistoryChart
        history={valuationHistory()}
        years={10}
        onYears={() => {
          /* not under test */
        }}
      />,
    );

    expect(screen.getByRole("meter", { name: "Price to earnings" })).toHaveAttribute(
      "aria-valuenow",
      "38.27",
    );
    expect(screen.getByRole("meter", { name: "Price to book" })).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByText(/33\.95× – 38\.27×, median 36\.11×/)).toBeInTheDocument();
    // At the hundredth percentile it has never been dearer; that is a loss tone.
    const [dearest] = screen.getAllByText("Cheaper than 0% of its past");
    expect(dearest).toHaveClass("text-loss");
    // A session before the figures were public draws nothing.
    expect(screen.getAllByText(/Price to earnings/).length).toBeGreaterThan(0);
  });

  it("colours a cheap reading as a gain and a middling one as neither", () => {
    const cheap = valuationHistory({
      pe: { sample: 4, low: "10", high: "40", median: "25", latest: "12", percentile: "20.00" },
      pb: { sample: 4, low: "1", high: "4", median: "2", latest: "2", percentile: "50.00" },
    });
    renderPage(
      <ValuationHistoryChart
        history={cheap}
        years={10}
        onYears={() => {
          /* not under test */
        }}
      />,
    );

    expect(screen.getByText("Cheaper than 80% of its past")).toHaveClass("text-gain");
    const middling = screen.getByText("Cheaper than 50% of its past");
    expect(middling).not.toHaveClass("text-gain");
    expect(middling).not.toHaveClass("text-loss");
  });

  it("offers the span and reports the choice", async () => {
    const onYears = vi.fn();
    renderPage(<ValuationHistoryChart history={valuationHistory()} years={10} onYears={onYears} />);

    await userEvent.click(screen.getByRole("button", { name: "1Y" }));

    expect(onYears).toHaveBeenCalledWith(1);
  });

  it("holds the meters while loading and when nothing has a reading", () => {
    const waiting = renderPage(
      <ValuationHistoryChart
        history={null}
        loading
        years={10}
        onYears={() => {
          /* not under test */
        }}
      />,
    );
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    waiting.unmount();

    // Every session before the first public year: a price, no ratio.
    const blank = valuationHistory({
      sessions: [
        valuationSession({ year_end: null, eps: null, pe: null, book_per_share: null, pb: null }),
      ],
      pe: { sample: 0, low: null, high: null, median: null, latest: null, percentile: null },
      pb: { sample: 0, low: null, high: null, median: null, latest: null, percentile: null },
    });
    renderPage(
      <ValuationHistoryChart
        history={blank}
        years={10}
        onYears={() => {
          /* not under test */
        }}
      />,
    );
    expect(screen.getByRole("meter", { name: "Price to earnings" })).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(screen.getAllByText(/— – —, median —/)).toHaveLength(2);
    expect(screen.queryByText(/of its past/)).not.toBeInTheDocument();
  });
});
