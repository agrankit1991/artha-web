/** Tests for one company's own page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "react-router-dom";

import { Company } from "./Company";
import {
  chartPoints,
  blankReturns,
  company,
  comparison,
  corporateAction,
  member,
  newsPage,
  overview,
  priceSeries,
  renderPage,
  statement,
  stubPlatform,
  trailing,
  valuation,
  valuationHistory,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

const KEY = "NSE_EQ|INE002A01018";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(replies: Record<string, unknown> = {}): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/companies/NSE_EQ%7CINE002A01018/fundamentals": { body: [statement()] },
    "/api/companies/NSE_EQ%7CINE002A01018/delivery": { body: [] },
    "/api/deals": { body: [] },
    "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": { body: [corporateAction()] },
    "/api/companies/NSE_EQ%7CINE002A01018/valuation": { body: valuation() },
    "/api/companies/NSE_EQ%7CINE002A01018/valuation/history": { body: valuationHistory() },
    "/api/watchlists/holding": { body: [] },
    "/api/sessions": {
      body: [
        { day: "2026-09-16", instruments: 5000 },
        { day: "2026-09-15", instruments: 5000 },
      ],
    },
    "/api/overviews/history": {
      body: [overview({ instrument_key: KEY }), overview({ instrument_key: KEY })],
    },
    "/api/watchlists": { body: [] },
    "/api/companies/NSE_EQ%7CINE002A01018": { body: company() },
    "/api/overviews": { body: [overview({ instrument_key: KEY })] },
    "/api/figures": { body: { instrument_key: KEY, points: chartPoints(40) } },
    "/api/series": { body: [priceSeries(KEY, [100, 101, 103])] },
    "/api/external-symbols": {
      body: { [KEY]: { symbol: "NSE:RELIANCE", derived: false } },
    },
    "/api/news": { body: newsPage() },
    ...(replies as Record<string, { body?: unknown; status?: number }>),
  });
}

describe("Company", () => {
  it("opens with what the company is", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByText("Reliance Industries")).toBeInTheDocument();
    expect(screen.getByText(/INE002A01018/)).toBeInTheDocument();
    expect(
      screen.getByText("Refining, petrochemicals, retail and telecommunications."),
    ).toBeInTheDocument();
  });

  it("names every exchange it trades on", async () => {
    // Which is the only way a reader knows to look for it on the other.
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByText("NSE: RELIANCE")).toBeInTheDocument();
    expect(screen.getByText("Large cap")).toHaveTextContent("Large cap#1");
    expect(screen.getByText("Momentum 72")).toHaveClass("text-gain");
    expect(screen.getByText("BSE: RELIANCE")).toBeInTheDocument();
  });

  it("leads from its sector to that sector's page", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    // Its badge in the header, and its bars against the market.
    const links = await screen.findAllByRole("link", { name: "Refineries" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/sector/refineries");
    }
  });

  it("leads from each index holding it to that index's page", async () => {
    stubEverything();

    renderPage(
      <Routes>
        <Route path="/" element={<Company instrumentKey={KEY} />} />
        <Route path="/index/:ref" element={<p>The index page</p>} />
      </Routes>,
    );

    // One chip in the header, where two names, "+N more" and a card lower
    // down said the same thing three ways.
    await userEvent.click(await screen.findByRole("button", { name: /In 1 index/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Nifty 50" }));

    expect(await screen.findByText("The index page")).toBeInTheDocument();
  });

  it("opens on its own price, set above its valuation", async () => {
    // The owner reads a company's price first (2026-09-23); the comparison
    // with its sector and the market is one tab away.
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    const price = await screen.findByRole("region", { name: "Price & performance" });
    expect(screen.getByRole("tab", { name: "Price" })).toHaveAttribute("aria-selected", "true");
    expect(await within(price).findByLabelText("Series drawn")).toBeInTheDocument();
    const valuation = screen.getByRole("region", { name: "Valuation" });
    expect(
      price.compareDocumentPosition(valuation) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("turns to relative strength and back", async () => {
    stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & performance");

    await userEvent.click(screen.getByRole("tab", { name: "Relative strength" }));
    expect(screen.getByRole("tab", { name: "Relative strength" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // And back, because a reader comparing two things looks at each in turn.
    await userEvent.click(screen.getByRole("tab", { name: "Price" }));
    expect(screen.getByRole("tab", { name: "Price" })).toHaveAttribute("aria-selected", "true");
  });

  it("states the gap against its sector, which cannot be drawn", async () => {
    // A sector is a grouping of companies rather than something with a
    // price, so it has no line. Leaving it out of both would drop the one
    // benchmark a company is most usefully read against.
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    const bars = await screen.findByRole("list", { name: "Ahead of or behind Refineries" });
    const card = bars.closest("[data-slot=card]") as HTMLElement;
    expect(card).toHaveTextContent("Its sector");
    expect(within(card).getByRole("link", { name: "Refineries" })).toHaveAttribute(
      "href",
      "/sector/refineries",
    );
    // Gaps in percentage points, not per cent.
    expect(within(bars).getAllByText(/ pp$/).length).toBeGreaterThan(0);
  });

  it("shows what it has reported", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Financials" }));

    // Awaited inside: the table is drawn before its figures arrive, so a
    // query that resolves on the table alone runs against an empty one.
    const table = screen.getByRole("table", { name: "Financial statements" });
    expect(await within(table).findByText("Revenue")).toBeInTheDocument();
    expect(within(table).getByText("Profit After Tax")).toBeInTheDocument();
  });

  it("shows each corporate event in the units its own kind is measured in", async () => {
    // A dividend is an amount per share and a bonus is a ratio, so the
    // column cannot be a number. The order is the platform's.
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": {
        body: [
          corporateAction({ kind: "BONUS", label: "Bonus 1:1", ratio: "1:1", amount: null }),
          corporateAction(),
        ],
      },
    });

    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Corporate actions" }));

    expect(await screen.findByText("Bonus")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Corporate actions" });
    expect(within(table).getByText("1:1")).toBeInTheDocument();
    expect(within(table).getByText(/6.00 per share/)).toBeInTheDocument();
  });

  it("sorts its peers by any column", async () => {
    // A company's rivals are read for who is ahead on a window, which is
    // not answerable by reading down a name.
    stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    const table = await screen.findByRole("table", { name: "Peers" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(screen.getByRole("table", { name: "Peers" })).toBeInTheDocument();
  });

  it("dashes a figure it has none of, and still sorts on that column", async () => {
    // A company listed this month has no year, and a nought there would
    // read as a year of going nowhere -- including when the column is
    // sorted, where a nought would place it among the flat performers.
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018": {
        body: company({
          indices: [
            { instrument_key: "NSE_INDEX|Nifty 50", name: "Nifty 50" },
            { instrument_key: "NSE_INDEX|Nifty 500", name: "Nifty 500" },
          ],
          performance: {
            basis: "company",
            returns: trailing(),
            against: [comparison({ relative: blankReturns() })],
          },
          peers: [
            member({
              instrument_key: "NSE_EQ|INE029A01011",
              symbol: "BPCL",
              close: null,
              volume: null,
              one_year: null,
              change_percent: null,
              from_high_percent: null,
            }),
            member({ instrument_key: "NSE_EQ|INE467B01029", symbol: "TCS" }),
          ],
        }),
      },
    });

    renderPage(<Company instrumentKey={KEY} />);
    const table = await screen.findByRole("table", { name: "Peers" });
    expect(within(table).getAllByText("-").length).toBeGreaterThan(1);

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }
    // A benchmark with no gap on any window says so, rather than a row of noughts.
    expect(screen.getByText("Nothing to measure it against yet")).toBeInTheDocument();

    // Two indices hold it now, and the header's chip counts them.
    expect(screen.getByRole("button", { name: "In 2 indices" })).toBeInTheDocument();
  });

  it("leads from a peer's name to its own page", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    const table = await screen.findByRole("table", { name: "Peers" });
    expect(within(table).getByRole("link", { name: /BPCL/ })).toHaveAttribute(
      "href",
      "/company/BPCL",
    );
  });

  it("asks the platform for the company behind whichever listing it was given", async () => {
    // Either exchange's key reaches the same company, and everything below
    // keys off the preferred listing the platform answers with rather than
    // the one in the address bar.
    const fetchMock = stubEverything();

    renderPage(<Company instrumentKey="BSE_EQ|INE002A01018" />);

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("BSE_EQ%7CINE002A01018"))).toBe(true);
    });
  });

  it("asks for more history when a longer range is chosen", async () => {
    const fetchMock = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & performance");

    const price = screen.getByRole("region", { name: "Price & performance" });
    await userEvent.click(within(price).getByRole("button", { name: "5Y" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("draws its valuation over its own sessions, as far back as is asked", async () => {
    const fetchMock = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    // One section with the tiles: what it trades at, and how that has run.
    const history = await screen.findByRole("region", { name: "Valuation" });

    expect(
      await within(history).findByRole("meter", { name: "Price to earnings" }),
    ).toHaveAttribute("aria-valuenow", "38.27");
    await userEvent.click(within(history).getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("/valuation/history?years=1"))).toBe(true);
    });
  });

  it("reports a valuation history that cannot be read without losing the page", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/valuation/history": {
        status: 500,
        body: { detail: "no run" },
      },
    });
    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByText(/No run/)).toBeInTheDocument();
    expect(screen.getByText("Price & performance")).toBeInTheDocument();
  });

  it("offers the whole feed when there is more news than it shows", async () => {
    stubEverything({ "/api/news": { body: newsPage({ total: 40 }) } });

    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "News" }));

    expect(await screen.findByRole("link", { name: /All news for RELIANCE/ })).toHaveAttribute(
      "href",
      "/news?instrument=NSE_EQ%7CINE002A01018&symbol=RELIANCE",
    );
  });

  it("still draws the page when the charts have nothing to draw", async () => {
    // A company listed this week has a page, a description and no
    // sessions. Every chart on it is empty, and none of that is a fault.
    stubPlatform({
      "/api/companies/NSE_EQ%7CINE002A01018/fundamentals": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018/valuation": { body: null },
      "/api/companies/NSE_EQ%7CINE002A01018/delivery": { body: [] },
      "/api/deals": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018": { body: company() },
      "/api/overviews": { body: [overview({ instrument_key: KEY })] },
      "/api/figures": { status: 500, body: { detail: "no sessions" } },
      "/api/series": { status: 500, body: { detail: "no sessions" } },
      "/api/external-symbols": { status: 500, body: { detail: "not known" } },
      "/api/news": { body: newsPage({ items: [], total: 0 }) },
    });

    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & performance");

    await userEvent.click(screen.getByRole("tab", { name: "Price" }));
    expect(await screen.findByText("Reliance Industries")).toBeInTheDocument();
    expect(screen.getByText("No valuation yet")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "News" }));
    expect(screen.queryByRole("link", { name: /All news/ })).not.toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/companies/NSE_EQ%7CINE002A01018": {
        status: 404,
        body: { detail: "nothing stored for that company" },
      },
    });

    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing stored for that company");
  });

  it("says a company has no figures rather than drawing an empty panel", async () => {
    // A company listed last week has a page and no history, which is a
    // fact about the company rather than a fault.
    stubEverything({ "/api/overviews": { body: [] } });

    renderPage(<Company instrumentKey={KEY} />);

    expect(
      await screen.findByText("No figures stored for this instrument yet"),
    ).toBeInTheDocument();
  });

  it("leaves out the competitors section when none are recorded", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018": { body: company({ peers: [], indices: [] }) },
    });

    renderPage(<Company instrumentKey={KEY} />);

    await screen.findByText("Reliance Industries");
    expect(screen.queryByText("Peer Companies")).not.toBeInTheDocument();
    expect(screen.queryByText("Index Membership")).not.toBeInTheDocument();
  });

  it("still draws the page for a company with no performance stored", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018": { body: company({ performance: null }) },
    });

    renderPage(<Company instrumentKey={KEY} />);

    await screen.findByText("Reliance Industries");
    expect(screen.queryByText("Relative Performance")).not.toBeInTheDocument();
  });

  it("values the company, with every derivation a hover away", async () => {
    stubEverything();
    renderPage(<Company instrumentKey={KEY} />);

    // Awaited on a tile: the section heading is drawn before the figures
    // arrive.
    expect(await screen.findByText("42.8×")).toBeInTheDocument();
    expect(screen.getByText("₹16.78 lakh cr")).toBeInTheDocument();
    expect(screen.getByText("Valuation")).toBeInTheDocument();
  });

  it("draws who has owned it and how it has grown, each on its own tab", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/fundamentals": {
        body: [
          statement(),
          statement({
            statement: "SHAREHOLDING",
            basis: "NOT_APPLICABLE",
            frequency: "QUARTERLY",
            line_items: ["promoters"],
            periods: [
              {
                period_end: "2026-06-30",
                figures: [{ line_item: "promoters", value: "50.48", units: "percent" }],
              },
            ],
          }),
        ],
      },
    });
    renderPage(<Company instrumentKey={KEY} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Shareholding" }));
    expect(await screen.findByText("Promoters")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Financials" }));
    expect(await screen.findByText(/Revenue, ₹ cr \(consolidated\)/)).toBeInTheDocument();
  });

  it("narrows the corporate events to one kind", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": {
        body: [
          corporateAction(),
          corporateAction({ kind: "BONUS", label: "Bonus 1:1", ratio: "1:1", amount: null }),
        ],
      },
    });
    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Corporate actions" }));
    await screen.findByText("Bonus");

    await userEvent.click(screen.getByRole("button", { name: "Dividends" }));

    expect(screen.queryByText("Bonus")).not.toBeInTheDocument();
    expect(screen.getByText("Dividend")).toBeInTheDocument();
  });

  it("offers a share card of the day", async () => {
    const fetched = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & performance");

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByRole("dialog", { name: "Share" })).toBeInTheDocument();
    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("/api/series?sessions=22"))).toBe(true);
    });
  });

  it("reads its figures as they stood on a chosen session, and draws each figure's shape", async () => {
    const fetched = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & performance");
    // Two sessions of history: every reading with a shape carries a sparkline.
    expect(
      (await screen.findAllByRole("img", { name: /over recent sessions/ })).length,
    ).toBeGreaterThan(3);

    await userEvent.type(screen.getByLabelText("As of"), "2026-09-15");

    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => decodeURIComponent(String(call[0])));
      expect(asked.some((path) => path.includes("/api/overviews?as_of=2026-09-15"))).toBe(true);
    });
    expect(screen.getByText(/Read as it stood on/)).toBeInTheDocument();
  });

  it("badges where it trades, the indices holding it, and a 52-week extreme", async () => {
    // The fixture's close sits 1.15% under its yearly high.
    const names = ["Nifty 50", "Nifty 100", "Nifty 200", "Nifty 500"];
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018": {
        body: company({
          indices: names.map((name) => ({ instrument_key: `NSE_INDEX|${name}`, name })),
        }),
      },
    });

    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByText("NSE: RELIANCE")).toBeInTheDocument();
    expect(screen.getByText("BSE: RELIANCE")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /In 4 indices/ }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(names);
    expect(await screen.findByText("Near 52W high")).toBeInTheDocument();
    expect(screen.queryByText("Near 52W low")).not.toBeInTheDocument();
  });

  it("badges a close near its 52-week low", async () => {
    const base = overview({ instrument_key: KEY });
    stubEverything({
      "/api/overviews": {
        body: [
          {
            ...base,
            year_range: { ...base.year_range, from_high_percent: "-30.0", from_low_percent: "1.2" },
          },
        ],
      },
    });

    renderPage(<Company instrumentKey={KEY} />);

    // Worth a look, like a high: not painted as a fall.
    expect(await screen.findByText("Near 52W low")).toHaveClass("text-caution");
    expect(screen.queryByText("Near 52W high")).not.toBeInTheDocument();
  });

  it("sets what is still to come above the history, soonest first", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": {
        body: [
          corporateAction({ ex_date: "2099-03-01", kind: "BONUS", amount: null, ratio: "1:1" }),
          corporateAction({ ex_date: "2020-01-01" }),
          corporateAction({ ex_date: "2099-01-15", kind: "OTHER", amount: null, ratio: null }),
        ],
      },
    });
    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: /Corporate actions/i }));

    const upcoming = await screen.findByRole("table", { name: "Upcoming corporate actions" });
    const rows = within(upcoming).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Other");
    expect(rows[1]).toHaveTextContent("Bonus");

    await userEvent.click(screen.getByRole("button", { name: "Other" }));
    const history = screen.getByRole("table", { name: "Corporate actions" });
    expect(within(history).getAllByRole("row").slice(1)).toHaveLength(1);
  });

  it("shows how much traded for delivery and the deals disclosed in it", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/delivery": {
        body: [
          {
            session_date: "2026-09-22",
            traded_quantity: 1000000,
            delivered_quantity: 600000,
            delivery_percent: "60.00",
          },
          {
            session_date: "2026-09-21",
            traded_quantity: 1000000,
            delivered_quantity: 400000,
            delivery_percent: "40.00",
          },
        ],
      },
      "/api/deals": {
        body: [
          {
            kind: "BULK",
            session_date: "2026-09-22",
            symbol: "RELIANCE",
            security_name: "Reliance Industries",
            client_name: "SOME FUND LLP",
            side: "SELL",
            quantity: 2500000,
            price: "1240.00",
            value_crore: "310.00",
            instrument_key: KEY,
          },
        ],
      },
    });

    renderPage(<Company instrumentKey={KEY} />);

    expect(await screen.findByText("60.00%")).toBeInTheDocument();
    // Averaged over both sessions: (60 + 40) / 2.
    expect(screen.getByText("50.00%")).toBeInTheDocument();
    expect(screen.getByText("1.20×")).toBeInTheDocument();
    const deals = await screen.findByRole("table", { name: "Company deals" });
    expect(within(deals).getByText("SOME FUND LLP")).toBeInTheDocument();
    expect(within(deals).getByText("Sell")).toHaveClass("text-loss");
    expect(within(deals).getByText("310.00")).toBeInTheDocument();
  });

  it("reads a tab's data only when the tab is first opened", async () => {
    // Fourteen requests on arrival was mostly for tabs never opened.
    const fetched = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByRole("region", { name: "Key figures" });
    const asked = (): string[] => fetched.mock.calls.map((call) => String(call[0]));
    expect(asked().some((path) => path.includes("/fundamentals"))).toBe(false);
    expect(asked().some((path) => path.includes("/corporate-actions"))).toBe(false);

    await userEvent.click(screen.getByRole("tab", { name: "Financials" }));
    await waitFor(() => {
      expect(asked().some((path) => path.includes("/fundamentals"))).toBe(true);
    });
    const once = asked().filter((path) => path.includes("/fundamentals")).length;

    // Kept: back to the overview and on to the shareholding reads nothing again.
    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.click(screen.getByRole("tab", { name: "Shareholding" }));
    expect(asked().filter((path) => path.includes("/fundamentals"))).toHaveLength(once);
  });

  it("opens on the tab in its address", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />, { at: "/company/RELIANCE?tab=financials" });

    expect(await screen.findByRole("tab", { name: "Financials" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("table", { name: "Financial statements" })).toBeInTheDocument();
  });

  it("says what a past session re-dates, and what stays the latest", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />, { at: "/company/RELIANCE?as_of=2026-09-15" });

    expect(await screen.findByText(/Read as of 15 Sept? 2026/)).toHaveTextContent(
      "valuation, trading activity and peers show the latest",
    );
  });

  it("reports a section that cannot be read in that section alone", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/fundamentals": {
        status: 500,
        body: { detail: "statements broke" },
      },
    });
    renderPage(<Company instrumentKey={KEY} />, { at: "/company/RELIANCE?tab=financials" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Statements broke");
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
  });

  it("reports each overview section that cannot be read in that section", async () => {
    const broke = (what: string): { status: number; body: { detail: string } } => ({
      status: 500,
      body: { detail: `${what} broke` },
    });
    stubEverything({
      "/api/overviews": broke("figures"),
      "/api/companies/NSE_EQ%7CINE002A01018/valuation": broke("valuation"),
      "/api/companies/NSE_EQ%7CINE002A01018/delivery": broke("delivery"),
      "/api/deals": broke("deals"),
      "/api/figures": broke("chart"),
      "/api/series": broke("comparison"),
    });
    renderPage(<Company instrumentKey={KEY} />);

    for (const said of ["Figures broke", "Valuation broke", "Delivery broke", "Deals broke"]) {
      expect(await screen.findByText(said)).toBeInTheDocument();
    }
    expect(await screen.findByText("Chart broke")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Relative strength" }));
    expect(await screen.findByText("Comparison broke")).toBeInTheDocument();
    // The page around them stands.
    expect(screen.getByRole("heading", { name: "Key figures" })).toBeInTheDocument();
  });

  it("reports a tab that cannot be read, and reads an unknown tab as the overview", async () => {
    stubEverything({
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": {
        status: 500,
        body: { detail: "events broke" },
      },
      "/api/news": { status: 500, body: { detail: "news broke" } },
    });
    const { unmount } = renderPage(<Company instrumentKey={KEY} />, {
      at: "/company/RELIANCE?tab=actions",
    });
    expect(await screen.findByText("Events broke")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "News" }));
    expect(await screen.findByText("News broke")).toBeInTheDocument();
    unmount();

    renderPage(<Company instrumentKey={KEY} />, { at: "/company/RELIANCE?tab=nope" });
    expect(await screen.findByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("goes back to the latest session when the chosen one is cleared", async () => {
    const fetched = stubEverything();
    renderPage(<Company instrumentKey={KEY} />, { at: "/company/RELIANCE?as_of=2026-09-15" });
    await screen.findByText(/Read as of/);

    await userEvent.clear(screen.getByLabelText("As of"));

    await waitFor(() => {
      expect(screen.queryByText(/Read as of/)).not.toBeInTheDocument();
    });
    const asked = fetched.mock.calls.map((call) => String(call[0]));
    expect(
      asked.some((path) => path.startsWith("/api/overviews?") && !path.includes("as_of")),
    ).toBe(true);
  });
});
