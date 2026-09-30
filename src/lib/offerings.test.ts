/** Tests for what an offering's figures mean. */

import { describe, expect, it } from "vitest";

import { offering } from "@/test/support";

import { daysLeft, listingGain, minimumInvestment, priceBand } from "./offerings";

describe("daysLeft", () => {
  // The fixture's bidding closes on 15 Sept 2026.
  it("counts the days to the close, and nought on the last day", () => {
    expect(daysLeft(offering(), new Date(2026, 8, 12))).toBe(3);
    expect(daysLeft(offering(), new Date(2026, 8, 14))).toBe(1);
    expect(daysLeft(offering(), new Date(2026, 8, 15))).toBe(0);
  });

  it("says nothing once the close has passed, whatever the status still says", () => {
    expect(daysLeft(offering(), new Date(2026, 8, 20))).toBeNull();
  });

  it("says nothing for an offering not open, or with no close published", () => {
    expect(daysLeft(offering({ status: "LISTED" }), new Date(2026, 8, 12))).toBeNull();
    expect(daysLeft(offering({ bidding_end: null }), new Date(2026, 8, 12))).toBeNull();
  });
});

describe("minimumInvestment", () => {
  it("is a lot at the top of the band", () => {
    expect(minimumInvestment(offering())).toBe(14_980);
    expect(minimumInvestment(offering({ lot_size: null }))).toBeNull();
    expect(minimumInvestment(offering({ maximum_price: null }))).toBeNull();
  });
});

describe("priceBand", () => {
  it("writes both ends in rupees, or the one price a band without width has", () => {
    expect(priceBand(offering())).toBe("₹130.00 - ₹140.00");
    expect(priceBand(offering({ minimum_price: "72.000000", maximum_price: "72.000000" }))).toBe(
      "₹72.00",
    );
    expect(priceBand(offering({ minimum_price: "72.000000", maximum_price: null }))).toBe("₹72.00");
    expect(priceBand(offering({ minimum_price: null, maximum_price: null }))).toBe("-");
  });
});

describe("listingGain", () => {
  it("measures the first price against the price it was sold at", () => {
    const gain = listingGain(offering({ cut_off_price: "140.000000", listing_price: "181.50" }));
    expect(Number(gain)).toBeCloseTo(29.642857, 5);
  });

  it("waits for both prices", () => {
    expect(listingGain(offering())).toBeNull();
    expect(listingGain(offering({ cut_off_price: "0", listing_price: "10" }))).toBeNull();
  });
});
