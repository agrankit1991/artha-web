/** Tests for the public offerings page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Ipos } from "./Ipos";
import { offering, renderPage, stubPlatform } from "@/test/support";

/** A day inside the fixture's bidding window. */
const TODAY = new Date(2026, 8, 12);

afterEach(() => {
  vi.unstubAllGlobals();
});

async function asTable(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "Table" }));
  return screen.getByRole("table", { name: "Offerings" });
}

describe("Ipos", () => {
  it("opens on what is taking bids now, as cards", async () => {
    // The only list with a deadline, and an offering is decided on rather
    // than scanned, which a row cannot carry.
    stubPlatform({
      "/api/ipos": {
        body: [offering(), offering({ ipo_id: "next", name: "Next IPO", status: "UPCOMING" })],
      },
    });

    renderPage(<Ipos today={TODAY} />);

    expect(
      await screen.findByRole("heading", { name: /Veegaland Developers IPO/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Next IPO")).not.toBeInTheDocument();
    expect(screen.getByText("Minimum investment")).toBeInTheDocument();
  });

  it("says how long an open offering has left", async () => {
    // Bidding closes on the 15th; read on the 12th, three days remain.
    stubPlatform({ "/api/ipos": { body: [offering()] } });

    renderPage(<Ipos today={TODAY} />);

    expect(await screen.findByText("3 days left")).toBeInTheDocument();
  });

  it("counts each list after the search, not before it", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering(),
          offering({ ipo_id: "other", name: "Other Builders IPO", symbol: "OTHERBLD" }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await screen.findByRole("tab", { name: "Open (2)" });

    await userEvent.type(screen.getByLabelText("Search offerings"), "veegaland");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Open (1)" })).toBeInTheDocument();
    });
  });

  it("narrows to one board, and to one industry", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering(),
          offering({
            ipo_id: "sme",
            name: "Small Co IPO",
            issue_type: "SME",
            industry: "Textiles",
          }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await screen.findByRole("heading", { name: /Small Co IPO/ });

    await userEvent.click(screen.getByRole("button", { name: "SME" }));
    expect(screen.queryByRole("heading", { name: /Veegaland/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All boards" }));
    await userEvent.click(screen.getByLabelText("Industry"));
    await userEvent.click(await screen.findByRole("option", { name: "Textiles" }));

    expect(screen.getByRole("heading", { name: /Small Co IPO/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Veegaland/ })).not.toBeInTheDocument();
  });

  it("orders the list by size, subscription or name", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({
            ipo_id: "small",
            name: "Alpha Small IPO",
            issue_size: "10.00",
            total_subscription: "0.50",
          }),
          offering({
            ipo_id: "big",
            name: "Zeta Big IPO",
            issue_size: "900.00",
            total_subscription: "40.00",
          }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await screen.findByRole("heading", { name: /Alpha Small IPO/ });

    await userEvent.click(screen.getByRole("button", { name: "By size" }));
    let names = screen.getAllByRole("heading", { level: 3 }).map((one) => one.textContent);
    expect(names[0]).toContain("Zeta Big IPO");

    await userEvent.click(screen.getByRole("button", { name: "By name" }));
    names = screen.getAllByRole("heading", { level: 3 }).map((one) => one.textContent);
    expect(names[0]).toContain("Alpha Small IPO");
  });

  it("states the least anybody can put in, in the table too", async () => {
    // 140 times 107: a band alone says nothing about the cheque.
    stubPlatform({ "/api/ipos": { body: [offering()] } });
    renderPage(<Ipos today={TODAY} />);
    await screen.findByRole("heading", { name: /Veegaland/ });
    expect(screen.getAllByText("14,980.00").length).toBeGreaterThan(0);

    const table = await asTable();

    expect(within(table).getByText("14,980.00")).toBeInTheDocument();
  });

  it("reads a listed offering by what it priced at and what it opened at", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({ status: "LISTED", cut_off_price: "140.000000", listing_price: "181.500000" }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Listed (1)" }));

    const table = await asTable();

    expect(within(table).getByText("140.00")).toBeInTheDocument();
    expect(within(table).getByText("181.50")).toBeInTheDocument();
  });

  it("shows an offering yet to price rather than withholding it", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({
            status: "UPCOMING",
            symbol: null,
            isin: null,
            minimum_price: null,
            maximum_price: null,
            lot_size: null,
            total_subscription: null,
          }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Upcoming (1)" }));

    expect(screen.getByText("ISIN not yet assigned")).toBeInTheDocument();
    await asTable();
    expect(screen.getByText(/Symbol not yet assigned/)).toBeInTheDocument();
  });

  it("sorts the table by any column, with unpublished figures last", async () => {
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
    renderPage(<Ipos today={TODAY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Upcoming (2)" }));
    const table = await asTable();

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("sorts listed offerings in the table by any column", async () => {
    stubPlatform({
      "/api/ipos": {
        body: [
          offering({ status: "LISTED", cut_off_price: "140.000000", listing_price: "181.50" }),
          offering({ ipo_id: "second", name: "Second IPO", symbol: "SECOND", status: "LISTED" }),
        ],
      },
    });
    renderPage(<Ipos today={TODAY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Listed (2)" }));
    const table = await asTable();

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByRole("row").length).toBe(3);
  });

  it("states one price when the band has no width", async () => {
    stubPlatform({
      "/api/ipos": { body: [offering({ minimum_price: "72.000000", maximum_price: "72.000000" })] },
    });
    renderPage(<Ipos today={TODAY} />);
    await screen.findByRole("heading", { name: /Veegaland/ });

    expect(screen.getByText("72.00")).toBeInTheDocument();
    expect(screen.queryByText(/72.00 – 72.00/)).not.toBeInTheDocument();
  });

  it("says a list is empty and why", async () => {
    stubPlatform({ "/api/ipos": { body: [offering({ status: "LISTED" })] } });
    renderPage(<Ipos today={TODAY} />);

    expect(await screen.findByText("No offerings in this list")).toBeInTheDocument();
    expect(screen.getByText("Nothing is open right now.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search offerings"), "zzz");
    await userEvent.click(screen.getByRole("tab", { name: "Listed (0)" }));

    expect(screen.getByText("Nothing matches the search and filters above.")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({ "/api/ipos": { status: 500, body: { detail: "the feed is down" } } });

    renderPage(<Ipos today={TODAY} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the feed is down");
  });
});
