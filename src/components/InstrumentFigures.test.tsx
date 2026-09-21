/** Tests for the derived figures panel. */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstrumentFigures } from "./InstrumentFigures";
import { overview } from "@/test/support";

describe("InstrumentFigures", () => {
  it("groups the figures by the question each answers", () => {
    // A reader arrives with one of four questions and should not have to
    // scan the other fifteen figures to find it.
    render(<InstrumentFigures overview={overview()} />);

    expect(screen.getByText("Latest Session")).toBeInTheDocument();
    expect(screen.getByText("Returns")).toBeInTheDocument();
    expect(screen.getByText("52-Week Range")).toBeInTheDocument();
    expect(screen.getByText("Trend & Volume")).toBeInTheDocument();
  });

  it("dates the high and the low, because when matters as much as what", () => {
    render(<InstrumentFigures overview={overview()} />);

    const row = screen.getByText("52-week high").closest("div")?.parentElement;
    expect(within(row as HTMLElement).getByText(/4 Aug 2026/)).toBeInTheDocument();
  });

  it("dashes a figure the platform has not computed", () => {
    // A company too young to have a two-hundred-session average is not a
    // company sitting exactly on one.
    render(
      <InstrumentFigures
        overview={overview({
          trend: { ...overview().trend, sessions_above_sma_200: null },
          volume: { ...overview().volume, relative_to_average: null },
          momentum: { ...overview().momentum, rsi: null },
        })}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("says nothing is stored rather than drawing a panel of dashes", () => {
    render(<InstrumentFigures overview={null} />);

    expect(screen.getByText("No figures stored for this instrument yet.")).toBeInTheDocument();
  });

  it("shows it is still arriving rather than showing nothing", () => {
    const { container } = render(<InstrumentFigures overview={null} loading />);

    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});
