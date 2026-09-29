/** Tests for the derived figures panel. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstrumentFigures } from "./InstrumentFigures";
import { overview } from "@/test/support";

describe("InstrumentFigures", () => {
  it("groups what the header does not already give, three across", () => {
    // The header carries the close, the day's move and both ranges; met
    // again here, a reader checks whether they differ.
    render(<InstrumentFigures overview={overview()} />);

    expect(screen.getByText("Returns")).toBeInTheDocument();
    expect(screen.getByText("Trend & volume")).toBeInTheDocument();
    expect(screen.getByText("Momentum & risk")).toBeInTheDocument();
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
    expect(screen.queryByText(/range/i)).not.toBeInTheDocument();
    expect(screen.getByText("YTD")).toBeInTheDocument();
  });

  it("writes distances plainly and the RSI as a level", () => {
    render(<InstrumentFigures overview={overview()} />);

    // 1.15% under the year's high is where it stands, not a fall.
    const fromHigh = screen.getByText("-1.15%");
    expect(fromHigh).toHaveClass("text-muted-foreground");
    expect(screen.getByText("+15.90%")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("-8.20%")).toHaveClass("text-muted-foreground");
    // A level from nought to a hundred, not a move: "58.2", never "+58.20".
    expect(screen.getByText("58.2")).toBeInTheDocument();
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

    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(3);
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

    expect(screen.getByText("Momentum & risk")).toBeInTheDocument();
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

    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(5);
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
    // A reading with no history drawn has no shape beside it.
    expect(screen.queryByRole("img", { name: /^YTD over recent sessions/ })).toBeNull();
    expect(screen.getByText("Streak").nextElementSibling).toHaveTextContent("-");
  });
});
