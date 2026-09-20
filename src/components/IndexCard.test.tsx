/** Tests for one index, as a card. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IndexCard } from "./IndexCard";
import { overview } from "@/test/support";

describe("IndexCard", () => {
  it("shows where an index closed and how it moved", () => {
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(screen.getByText("Nifty 50")).toBeInTheDocument();
    expect(screen.getAllByText("24,812.40").length).toBeGreaterThan(0);
    expect(screen.getByText(/\+0.62%/)).toBeInTheDocument();
  });

  it("names the close among the prices, as well as printing it large", () => {
    // The headline figure says where the session ended; the grid says it
    // again beside the three prices it means nothing without.
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(screen.getByText("Close")).toBeInTheDocument();
    // Once as the headline figure, once in the grid.
    expect(screen.getAllByText("24,812.40")).toHaveLength(2);
  });

  it("shows the whole session, not only where it ended", () => {
    // A close and a percentage cannot tell a session that rose all day from
    // one that gave back everything it made.
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("24,700.00")).toBeInTheDocument();
    expect(screen.getByText("24,850.00")).toBeInTheDocument();
    expect(screen.getByText("24,690.00")).toBeInTheDocument();
    expect(screen.getByText(/Previous close 24,659.00/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Session closed/);
  });

  it("holds its shape while the figures are on their way", () => {
    // Cards that appear one by one make the whole page jump as it loads.
    render(<IndexCard name="Sensex" overview={undefined} />);

    expect(screen.getByText("Sensex")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("is only clickable when choosing it means something", () => {
    const { rerender } = render(<IndexCard name="Nifty 50" overview={overview()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<IndexCard name="Nifty 50" overview={overview()} onSelect={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("passes on the index that was chosen", async () => {
    const chosen = vi.fn();
    render(<IndexCard name="Nifty 50" overview={overview()} onSelect={chosen} />);

    await userEvent.click(screen.getByRole("button"));

    expect(chosen).toHaveBeenCalledWith("NSE_INDEX|Nifty 50");
  });

  it("can be chosen from the keyboard as well as the pointer", async () => {
    // A card made clickable with a div is unreachable without this.
    const chosen = vi.fn();
    render(<IndexCard name="Nifty 50" overview={overview()} onSelect={chosen} />);

    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(chosen).toHaveBeenCalledTimes(2);
  });

  it("names the session it is showing", async () => {
    // Indices do not all publish on the same schedule: two cards side by
    // side can be a day apart, and unlabelled they read as the same day.
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(await screen.findByText(/18 Sept? 2026/)).toBeInTheDocument();
  });

  it("offers the way out to TradingView when the symbol is known", () => {
    render(
      <IndexCard
        name="Nifty 50"
        overview={overview()}
        symbol={{ instrument_key: "NSE_INDEX|Nifty 50", symbol: "NSE:NIFTY", derived: false }}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://www.tradingview.com/chart/?symbol=NSE%3ANIFTY",
    );
  });

  it("offers no link when nothing is known about the symbol", () => {
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not choose the card when the link is followed", async () => {
    // Leaving for TradingView and choosing the card are different
    // intentions, and the link sits inside the card.
    const chosen = vi.fn();
    render(
      <IndexCard
        name="Nifty 50"
        overview={overview()}
        symbol={{ instrument_key: "NSE_INDEX|Nifty 50", symbol: "NSE:NIFTY", derived: false }}
        onSelect={chosen}
      />,
    );

    await userEvent.click(screen.getByRole("link"));

    expect(chosen).not.toHaveBeenCalled();
  });
});
