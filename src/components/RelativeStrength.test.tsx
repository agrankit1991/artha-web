/** Tests for reading something against what it should be measured by. */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RelativeStrength } from "./RelativeStrength";
import { comparison, performance } from "@/test/support";

describe("RelativeStrength", () => {
  it("shows the subject's own return as well as the gap", () => {
    // A reader still wants to know whether the thing itself went up.
    render(<RelativeStrength performance={performance()} name="Nifty Bank" />);

    const [, subject] = screen.getAllByRole("row");
    expect(within(subject as HTMLElement).getByText("Nifty Bank")).toBeInTheDocument();
    expect(within(subject as HTMLElement).getByText("+6.00%")).toBeInTheDocument();
  });

  it("states the gap in points rather than as a percentage of a percentage", () => {
    render(<RelativeStrength performance={performance()} name="Nifty Bank" />);

    expect(screen.getByText("+4.0")).toBeInTheDocument();
  });

  it("calls falling less than the market being ahead", () => {
    // Which is most of what relative strength is for.
    render(
      <RelativeStrength
        name="Nifty Bank"
        performance={performance({
          against: [
            comparison({
              returns: { ...comparison().returns, one_month: "-8" },
              relative: { ...comparison().relative, one_month: "6.7" },
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText("+6.7")).toHaveClass("text-gain");
    expect(screen.getByText("-8.00%")).toBeInTheDocument();
  });

  it("colours a shortfall as a shortfall", () => {
    render(
      <RelativeStrength
        name="Nifty Bank"
        performance={performance({
          against: [comparison({ relative: { ...comparison().relative, one_month: "-3" } })],
        })}
      />,
    );

    expect(screen.getByText("-3.0")).toHaveClass("text-loss");
  });

  it("says which benchmark each row is, and what it stands for", () => {
    render(<RelativeStrength performance={performance()} name="Nifty Bank" />);

    expect(screen.getByText("Nifty 500")).toBeInTheDocument();
    expect(screen.getByText("Whole market")).toBeInTheDocument();
  });

  it("says a sector stands on its companies rather than on a price", () => {
    render(
      <RelativeStrength performance={performance({ basis: "members" })} name="IT - Software" />,
    );

    expect(screen.getByText(/median company/)).toBeInTheDocument();
  });

  it("shows a dash where a window has no gap to report", () => {
    render(
      <RelativeStrength
        name="Nifty Bank"
        performance={performance({
          against: [comparison({ relative: { ...comparison().relative, one_year: null } })],
        })}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("says there is nothing to compare rather than showing an empty table", () => {
    render(<RelativeStrength performance={null} name="Nifty Bank" />);

    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
  });

  it("holds its shape while the figures are on their way", () => {
    const { container } = render(<RelativeStrength performance={null} name="Nifty Bank" loading />);

    expect(screen.queryByText("Nothing to compare yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
