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

  it("writes volume against its average as a multiple", () => {
    render(
      <InstrumentFigures
        overview={overview({ volume: { ...overview().volume, relative_to_average: "1.40" } })}
      />,
    );

    expect(screen.getByText("1.4×")).toBeInTheDocument();
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

    expect(screen.getByText("No figures stored for this instrument yet")).toBeInTheDocument();
  });

  it("shows it is still arriving rather than showing nothing", () => {
    const { container } = render(<InstrumentFigures overview={null} loading />);

    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("reads momentum and risk from the figures already stored", () => {
    render(<InstrumentFigures overview={overview()} />);

    expect(screen.getByText("Momentum & Risk")).toBeInTheDocument();
    expect(screen.getByText("MACD")).toBeInTheDocument();
    expect(screen.getByText("ATR (14)")).toBeInTheDocument();
    // Two consecutive rises in the fixture.
    expect(screen.getByText("2 up")).toBeInTheDocument();
  });

  it("names a falling streak, and no streak at all", () => {
    render(
      <InstrumentFigures
        overview={overview({
          trend: { ...overview().trend, consecutive_rises: 0, consecutive_falls: 3 },
        })}
      />,
    );
    expect(screen.getByText("3 down")).toBeInTheDocument();
  });

  it("dashes momentum figures the platform has not computed", () => {
    render(
      <InstrumentFigures
        overview={overview({
          momentum: { rsi: null, macd: null, macd_signal: null, macd_histogram: null },
          risk: { ...overview().risk, volatility_year: null },
          trend: { ...overview().trend, consecutive_rises: 0, consecutive_falls: 0 },
        })}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(5);
  });

  it("draws each figure's shape from its history, skipping a reading it lacks", () => {
    const base = overview();
    const history = [
      overview({ returns: { ...base.returns, one_week: null } }),
      overview({ returns: { ...base.returns, one_week: "1.00" } }),
      overview({ returns: { ...base.returns, one_week: "2.00" } }),
    ];
    render(
      <InstrumentFigures
        overview={overview({
          trend: { ...base.trend, consecutive_rises: null, consecutive_falls: null },
        })}
        history={history}
      />,
    );

    expect(
      screen.getByRole("img", { name: /^1 week over recent sessions: rising/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^Close over recent sessions: flat/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Streak").nextElementSibling).toHaveTextContent("—");
  });
});
