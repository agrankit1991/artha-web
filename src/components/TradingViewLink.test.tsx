/** Tests for the way out to TradingView. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TradingViewLink } from "./TradingViewLink";

describe("TradingViewLink", () => {
  it("links to the instrument's own chart", () => {
    render(<TradingViewLink label="Nifty 50" symbol="NSE:NIFTY" />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://www.tradingview.com/chart/?symbol=NSE%3ANIFTY",
    );
  });

  it("opens without handing TradingView this page", () => {
    render(<TradingViewLink label="Nifty 50" symbol="NSE:NIFTY" />);

    expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("offers nothing at all when the symbol is unknown", () => {
    // A link to the wrong instrument's chart is worse than none, because
    // nothing about it looks wrong.
    const { container } = render(<TradingViewLink label="Nifty 50" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says when the symbol was guessed rather than confirmed", () => {
    // Two hundred and forty-one were worked out from the ticker, and those
    // are wrong without warning.
    render(<TradingViewLink label="Some Company" symbol="NSE:GUESS" derived />);

    expect(screen.getByRole("link")).toHaveAccessibleName(/symbol unconfirmed/);
    expect(screen.getByRole("link").getAttribute("title")).toContain("may not exist there");
  });

  it("says nothing about confirmation when the symbol is confirmed", () => {
    render(<TradingViewLink label="Nifty 50" symbol="NSE:NIFTY" />);

    expect(screen.getByRole("link")).not.toHaveAccessibleName(/unconfirmed/);
  });
});
