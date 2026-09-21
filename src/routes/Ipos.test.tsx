/** Tests for the public offerings page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Ipos } from "./Ipos";
import { offering, renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Ipos", () => {
  it("opens on what is taking bids now", async () => {
    // The only list with a deadline. The rest are a diary and a record.
    stubPlatform({
      "/api/ipos": {
        body: [offering(), offering({ ipo_id: "next", name: "Next IPO", status: "UPCOMING" })],
      },
    });

    renderPage(<Ipos />);

    expect(await screen.findByText("Veegaland Developers IPO")).toBeInTheDocument();
    expect(screen.queryByText("Next IPO")).not.toBeInTheDocument();
  });

  it("counts each list after the search, not before it", async () => {
    // A tab reading "Open 8" beside a filtered list of two is a count of
    // something else.
    stubPlatform({
      "/api/ipos": {
        body: [
          offering(),
          offering({ ipo_id: "other", name: "Other Builders IPO", symbol: "OTHERBLD" }),
        ],
      },
    });
    renderPage(<Ipos />);
    await screen.findByText("Veegaland Developers IPO");
    expect(screen.getByRole("tab", { name: "Open (2)" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search offerings"), "veegaland");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Open (1)" })).toBeInTheDocument();
    });
  });

  it("searches the symbol and the industry as well as the name", async () => {
    stubPlatform({ "/api/ipos": { body: [offering()] } });
    renderPage(<Ipos />);
    await screen.findByText("Veegaland Developers IPO");

    await userEvent.type(screen.getByLabelText("Search offerings"), "real estate");

    expect(screen.getByText("Veegaland Developers IPO")).toBeInTheDocument();
  });

  it("narrows to one board", async () => {
    // The SME board is a different market with different lot sizes, and
    // mixing the two makes both lists harder to read.
    stubPlatform({
      "/api/ipos": {
        body: [offering(), offering({ ipo_id: "sme", name: "Small Co IPO", issue_type: "SME" })],
      },
    });
    renderPage(<Ipos />);
    await screen.findByText("Small Co IPO");

    await userEvent.click(screen.getByRole("button", { name: "SME" }));

    expect(screen.getByText("Small Co IPO")).toBeInTheDocument();
    expect(screen.queryByText("Veegaland Developers IPO")).not.toBeInTheDocument();
  });

  it("states the least anybody can put in", async () => {
    // A band alone says nothing about the cheque: shares are bought a lot
    // at a time, and 140 times 107 is what an application costs.
    stubPlatform({ "/api/ipos": { body: [offering()] } });

    renderPage(<Ipos />);

    const table = await screen.findByRole("table", { name: "Offerings" });
    expect(within(table).getByText("14,980.00")).toBeInTheDocument();
  });

  it("reads a listed offering by what it priced at and what it opened at", async () => {
    // The two figures that say whether applying would have been worth it.
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({
            status: "LISTED",
            cut_off_price: "140.000000",
            listing_price: "181.500000",
          }),
        ],
      },
    });
    renderPage(<Ipos />);
    await screen.findByRole("tab", { name: "Listed (1)" });

    await userEvent.click(screen.getByRole("tab", { name: "Listed (1)" }));

    const table = screen.getByRole("table", { name: "Offerings" });
    expect(within(table).getByText("140.00")).toBeInTheDocument();
    expect(within(table).getByText("181.50")).toBeInTheDocument();
  });

  it("shows an offering yet to price rather than withholding it", async () => {
    // An announced offering is the thing a reader is watching for.
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({
            status: "UPCOMING",
            symbol: null,
            minimum_price: null,
            maximum_price: null,
            lot_size: null,
            total_subscription: null,
          }),
        ],
      },
    });
    renderPage(<Ipos />);
    await screen.findByRole("tab", { name: "Upcoming (1)" });

    await userEvent.click(screen.getByRole("tab", { name: "Upcoming (1)" }));

    expect(screen.getByText(/Symbol not yet assigned/)).toBeInTheDocument();
  });

  it("sorts by any column, not only by date", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering(),
          offering({ ipo_id: "other", name: "Other Builders IPO", symbol: "OTHERBLD" }),
        ],
      },
    });
    renderPage(<Ipos />);
    const table = await screen.findByRole("table", { name: "Offerings" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("states one price when the band has no width", async () => {
    // A fixed-price offering has a band whose ends are equal, and printing
    // "72 – 72" invites a reader to look for a difference there is none of.
    stubPlatform({
      "/api/ipos": {
        body: [offering({ minimum_price: "72.000000", maximum_price: "72.000000" })],
      },
    });

    renderPage(<Ipos />);

    const table = await screen.findByRole("table", { name: "Offerings" });
    expect(within(table).getByText("72.00")).toBeInTheDocument();
  });

  it("sorts a column an offering has no figure for", async () => {
    // An upcoming offering has no band, no lot and no subscription, and a
    // nought in any of them would place it among the cheapest, smallest
    // and least wanted rather than among the unpublished.
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({ status: "UPCOMING" }),
          offering({
            ipo_id: "bare",
            name: "Bare IPO",
            symbol: null,
            status: "UPCOMING",
            issue_size: null,
            minimum_price: null,
            maximum_price: null,
            lot_size: null,
            total_subscription: null,
            bidding_start: null,
            bidding_end: null,
            listing_date: null,
          }),
        ],
      },
    });
    renderPage(<Ipos />);
    await userEvent.click(await screen.findByRole("tab", { name: "Upcoming (2)" }));
    const table = screen.getByRole("table", { name: "Offerings" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("searches an offering that has neither a symbol nor an industry", async () => {
    // Announced and nothing else published: it should not match every
    // search by having empty fields, nor blow up on them.
    stubPlatform({
      "/api/ipos": {
        body: [offering({ status: "UPCOMING", symbol: null, industry: null })],
      },
    });
    renderPage(<Ipos />);
    await screen.findByRole("tab", { name: "Upcoming (1)" });

    await userEvent.type(screen.getByLabelText("Search offerings"), "zzz");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Upcoming (0)" })).toBeInTheDocument();
    });
  });

  it("goes back to every board", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [offering(), offering({ ipo_id: "sme", name: "Small Co IPO", issue_type: "SME" })],
      },
    });
    renderPage(<Ipos />);
    await screen.findByText("Small Co IPO");
    await userEvent.click(screen.getByRole("button", { name: "SME" }));

    await userEvent.click(screen.getByRole("button", { name: "All boards" }));

    expect(screen.getByText("Veegaland Developers IPO")).toBeInTheDocument();
    expect(screen.getByText("Small Co IPO")).toBeInTheDocument();
  });

  it("dashes a band that is not published yet", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({
            status: "UPCOMING",
            minimum_price: null,
            maximum_price: null,
            industry: null,
            total_subscription: null,
          }),
        ],
      },
    });
    renderPage(<Ipos />);
    await screen.findByRole("tab", { name: "Upcoming (1)" });

    await userEvent.click(screen.getByRole("tab", { name: "Upcoming (1)" }));

    const table = screen.getByRole("table", { name: "Offerings" });
    expect(within(table).getAllByText("—").length).toBeGreaterThan(1);
  });

  it("sorts a list of listed offerings by any column", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({ status: "LISTED", cut_off_price: "140.000000", listing_price: "181.50" }),
          offering({
            ipo_id: "second",
            name: "Second IPO",
            symbol: "SECOND",
            status: "LISTED",
            cut_off_price: "90.000000",
            listing_price: "84.20",
          }),
        ],
      },
    });
    renderPage(<Ipos />);
    await userEvent.click(await screen.findByRole("tab", { name: "Listed (2)" }));
    const table = screen.getByRole("table", { name: "Offerings" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("says a list is empty rather than looking broken", async () => {
    stubPlatform({ "/api/ipos": { body: [] } });

    renderPage(<Ipos />);

    expect(await screen.findByText("No offerings in this list")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({ "/api/ipos": { status: 500, body: { detail: "the feed is down" } } });

    renderPage(<Ipos />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the feed is down");
  });
});
