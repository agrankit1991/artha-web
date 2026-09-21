/** Tests for one offering's card. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { IpoCard, daysLeft } from "./IpoCard";
import { offering } from "@/test/support";

const TODAY = new Date(2026, 8, 12);

function draw(one = offering(), linked = true): void {
  render(
    <MemoryRouter>
      <IpoCard offering={one} today={TODAY} linked={linked} />
    </MemoryRouter>,
  );
}

describe("IpoCard", () => {
  it("leads with the status, the board and the industry", () => {
    draw();

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Mainboard")).toBeInTheDocument();
    expect(screen.getByText("Construction - Real Estate")).toBeInTheDocument();
  });

  it("explains what a board is, for the reader who needs it", async () => {
    draw(offering({ issue_type: "SME" }));

    await userEvent.hover(
      screen.getAllByRole("button", { name: "What this means" })[0] as HTMLElement,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent(/small and medium enterprise/);
  });

  it("puts the four deciding figures in tiles", () => {
    draw();

    expect(screen.getByText("₹210.00 cr")).toBeInTheDocument();
    expect(screen.getByText("130.00 – 140.00")).toBeInTheDocument();
    expect(screen.getByText("107 shares")).toBeInTheDocument();
    expect(screen.getByText("14,980.00")).toBeInTheDocument();
  });

  it("draws the subscription against one times, coloured by which side", () => {
    draw(offering({ total_subscription: "0.80" }));

    const meter = screen.getByRole("meter", { name: "Subscription" });
    expect(meter).toHaveAttribute("aria-valuenow", "0.8");
    expect(screen.getByText("0.8×")).toHaveClass("text-loss");
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

  it("offers no documents when none were published", () => {
    draw(offering({ rhp_url: null, drhp_url: null }));

    expect(screen.queryByRole("link", { name: /prospectus/ })).not.toBeInTheDocument();
  });

  it("leads from its name to its own page, unless it is that page", () => {
    draw();
    expect(screen.getByRole("link", { name: /Veegaland/ })).toHaveAttribute(
      "href",
      "/ipo/veegaland-developers-limited-ipo",
    );
  });

  it("names itself plainly on its own page", () => {
    draw(offering(), false);

    expect(screen.queryByRole("link", { name: /Veegaland/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Veegaland/ })).toBeInTheDocument();
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
    expect(screen.getAllByText("—").length).toBeGreaterThan(1);
  });
});

describe("daysLeft", () => {
  it("counts the days to the close, and says so on the last day", () => {
    expect(daysLeft(offering(), new Date(2026, 8, 12))).toBe(3);
    expect(daysLeft(offering(), new Date(2026, 8, 15))).toBe(0);
  });

  it("does not go negative, and says nothing for an offering not open", () => {
    expect(daysLeft(offering(), new Date(2026, 8, 20))).toBe(0);
    expect(daysLeft(offering({ status: "LISTED" }), TODAY)).toBeNull();
    expect(daysLeft(offering({ bidding_end: null }), TODAY)).toBeNull();
  });

  it("says one day left on the day before bidding closes", () => {
    render(
      <MemoryRouter>
        <IpoCard offering={offering()} today={new Date(2026, 8, 14)} />
      </MemoryRouter>,
    );

    expect(screen.getByText("1 day left")).toBeInTheDocument();
  });

  it("states the one end of a band the provider published", () => {
    draw(offering({ maximum_price: null, minimum_price: "72.000000" }));

    expect(screen.getByText("72.00")).toBeInTheDocument();
  });
});
