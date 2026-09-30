/** Tests for one offering's card, and the parts it is built from. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { Offering } from "@/api/client";
import { offering } from "@/test/support";

import { IpoCard } from "./IpoCard";

/** A day inside the fixture's bidding window, which closes on the 15th. */
const TODAY = new Date(2026, 8, 12);

function draw(one: Offering = offering(), today: Date = TODAY): void {
  render(
    <MemoryRouter>
      <IpoCard offering={one} today={today} />
    </MemoryRouter>,
  );
}

describe("IpoCard", () => {
  it("leads with the status, the board and the industry, the status in words", () => {
    draw();

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Mainboard")).toBeInTheDocument();
    expect(screen.getByText("Construction - Real Estate")).toBeInTheDocument();
    // In the brand's teal, not the colour of a rise.
    expect(screen.getByText("Open").closest("[data-slot=badge]")).not.toHaveClass("text-gain");
  });

  it("explains what a board is, for the reader who needs it", async () => {
    draw(offering({ issue_type: "SME" }));

    await userEvent.hover(
      screen.getAllByRole("button", { name: /^What .+ means$/ })[0] as HTMLElement,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent(/small and medium enterprise/);
  });

  it("puts the four figures that decide an application in tiles, with their units", () => {
    draw();

    expect(screen.getByText("₹210 cr")).toBeInTheDocument();
    expect(screen.getByText("₹130.00 - ₹140.00")).toBeInTheDocument();
    // The lot in its tile, and the minimum quantity in the details.
    expect(screen.getAllByText("107 shares")).toHaveLength(2);
    expect(screen.getByText("₹14,980.00")).toBeInTheDocument();
    expect(screen.getByText("Face value ₹10.00")).toBeInTheDocument();
  });

  it("reads a listed offering by its price, its first price and the gain between", () => {
    draw(offering({ status: "LISTED", cut_off_price: "140.000000", listing_price: "175.00" }));

    expect(screen.getByText("Priced at")).toBeInTheDocument();
    expect(screen.getByText("₹175.00")).toBeInTheDocument();
    expect(screen.getByText("+25.00%")).toBeInTheDocument();
    expect(screen.queryByText("Minimum investment")).not.toBeInTheDocument();
    // The band moves to the details, the tiles holding the prices.
    expect(screen.getByText("Price band")).toBeInTheDocument();
    expect(screen.queryByText("Cut-off price")).not.toBeInTheDocument();
  });

  it("draws the subscription in one colour either side of one times, and says which side", () => {
    draw(offering({ total_subscription: "0.80" }));

    const meter = screen.getByRole("meter", { name: "Subscription" });
    expect(meter).toHaveAttribute("aria-valuenow", "0.8");
    expect(screen.getByText("not fully taken up")).toBeInTheDocument();
    expect(meter.firstElementChild).toHaveClass("bg-primary");
  });

  it("fills the meter at ten times, and states the figure however far past it", () => {
    draw(offering({ total_subscription: "352.62" }));

    const meter = screen.getByRole("meter", { name: "Subscription" });
    expect(meter).toHaveAttribute("aria-valuenow", "10");
    expect(meter).toHaveAttribute("aria-valuetext", "352.6× subscribed");
    expect(screen.getByText("oversubscribed")).toBeInTheDocument();
  });

  it("shows no subscription for an offering that has not opened", () => {
    draw(offering({ total_subscription: null }));

    expect(screen.queryByRole("meter", { name: "Subscription" })).not.toBeInTheDocument();
  });

  it("lists every date the platform holds, and the exchanges it lists on", () => {
    draw();

    expect(screen.getByText("Allotment")).toBeInTheDocument();
    expect(screen.getByText("Refunds begin")).toBeInTheDocument();
    expect(screen.getByText("Mandate ends")).toBeInTheDocument();
    expect(screen.getByText("BSE")).toBeInTheDocument();
    expect(screen.getByText("NSE")).toBeInTheDocument();
  });

  it("links the prospectus where it was published", () => {
    draw(offering({ drhp_url: "https://example.test/drhp.pdf" }));

    expect(screen.getByRole("link", { name: /Red herring prospectus/ })).toHaveAttribute(
      "href",
      "https://example.test/rhp.pdf",
    );
    expect(screen.getByRole("link", { name: /Draft prospectus/ })).toBeInTheDocument();
  });

  it("offers no documents, and no rule over them, when none were published", () => {
    draw(offering({ rhp_url: null, drhp_url: null }));

    expect(screen.queryByRole("link", { name: /prospectus/ })).not.toBeInTheDocument();
    expect(document.querySelector(".border-t")).toBeNull();
  });

  it("leads from its name to its own page", () => {
    draw();

    expect(screen.getByRole("link", { name: /Veegaland/ })).toHaveAttribute(
      "href",
      "/ipo/veegaland-developers-limited-ipo",
    );
  });

  it("dashes what has not been published", () => {
    draw(
      offering({
        symbol: null,
        isin: null,
        face_value: null,
        listing_exchange: null,
        minimum_quantity: null,
      }),
    );

    expect(screen.getByText("ISIN not yet assigned")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(1);
  });

  it("counts the days left, and says so on the last day", () => {
    draw();
    expect(screen.getByText("3 days left")).toBeInTheDocument();
  });

  it("says one day left on the day before bidding closes, and the last day on it", () => {
    draw(offering(), new Date(2026, 8, 14));
    expect(screen.getByText("1 day left")).toBeInTheDocument();
  });

  it("never tells a reader to bid on an offering whose close has passed", () => {
    // The provider's status still says open; the calendar says otherwise.
    draw(offering(), new Date(2026, 8, 20));

    const card = screen.getByRole("heading", { name: /Veegaland/ }).closest("[data-slot=card]");
    expect(within(card as HTMLElement).queryByText(/left|Last day/)).not.toBeInTheDocument();
  });

  it("names the last day to bid", () => {
    draw(offering(), new Date(2026, 8, 15));
    expect(screen.getByText("Last day to bid")).toBeInTheDocument();
  });

  it("states the one end of a band the provider published", () => {
    draw(offering({ maximum_price: null, minimum_price: "72.000000" }));

    expect(screen.getByText("₹72.00")).toBeInTheDocument();
  });
});
