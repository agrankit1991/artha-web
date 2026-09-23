/** Tests for one company's own page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

    expect(await screen.findByRole("link", { name: "Refineries" })).toHaveAttribute(
      "href",
      "/sector/refineries",
    );
  });

  it("leads from each index holding it to that index's page", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    // Named in the header's badges and in the full list, and both lead there.
    const links = await screen.findAllByRole("link", { name: "Nifty 50" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/index/nifty-50");
    }
  });

  it("opens on its own price, set above its valuation", async () => {
    // The owner reads a company's price first (2026-09-23); the comparison
    // with its sector and the market is one tab away.
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    const price = await screen.findByRole("region", { name: "Price & Performance" });
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
    await screen.findByText("Price & Performance");

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

    const table = await screen.findByRole("table", { name: "Relative strength" });
    expect(within(table).getByText("Its sector")).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: /Refineries/ })).toHaveAttribute(
      "href",
      "/sector/refineries",
    );
  });

  it("shows what it has reported", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Financials" }));

    // Awaited inside: the table is drawn before its figures arrive, so a
    // query that resolves on the table alone runs against an empty one.
    const table = screen.getByRole("table", { name: "Financial Statements" });
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
    await userEvent.click(await screen.findByRole("tab", { name: "Corporate Actions" }));

    expect(await screen.findByText("Bonus")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Corporate actions" });
    expect(within(table).getByText("1:1")).toBeInTheDocument();
    expect(within(table).getByText(/6.00 per share/)).toBeInTheDocument();
  });

  it("sorts both its tables by any column", async () => {
    // A company's rivals are read for who is ahead on a window, and its
    // benchmarks for which it is furthest behind. Neither is answerable by
    // reading down a name.
    stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByRole("table", { name: "Competitors" });

    for (const name of ["Relative strength", "Competitors"]) {
      const table = screen.getByRole("table", { name });
      for (const header of within(table).getAllByRole("button")) {
        await userEvent.click(header);
      }
    }

    expect(screen.getByRole("table", { name: "Competitors" })).toBeInTheDocument();
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
            }),
            member({ instrument_key: "NSE_EQ|INE467B01029", symbol: "TCS" }),
          ],
        }),
      },
    });

    renderPage(<Company instrumentKey={KEY} />);
    const table = await screen.findByRole("table", { name: "Competitors" });
    expect(within(table).getAllByText("—").length).toBeGreaterThan(1);

    for (const name of ["Relative strength", "Competitors"]) {
      for (const header of within(screen.getByRole("table", { name })).getAllByRole("button")) {
        await userEvent.click(header);
      }
    }

    // Two indices hold it now, so the sentence counting them agrees.
    expect(screen.getByText(/2 indices currently/)).toBeInTheDocument();
  });

  it("leads from a competitor's name to its own page", async () => {
    stubEverything();

    renderPage(<Company instrumentKey={KEY} />);

    const table = await screen.findByRole("table", { name: "Competitors" });
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
    await screen.findByText("Price & Performance");

    const price = screen.getByRole("region", { name: "Price & Performance" });
    await userEvent.click(within(price).getByRole("button", { name: "5Y" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("draws its valuation over its own sessions, as far back as is asked", async () => {
    const fetchMock = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    const history = await screen.findByRole("region", { name: "Valuation History" });

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

    expect(await screen.findByText(/no run/)).toBeInTheDocument();
    expect(screen.getByText("Price & Performance")).toBeInTheDocument();
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
    await screen.findByText("Price & Performance");

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

    expect(await screen.findByRole("alert")).toHaveTextContent("nothing stored for that company");
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
    expect(await screen.findByText("42.79×")).toBeInTheDocument();
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
    expect(await screen.findByText(/Revenue \(consolidated\)/)).toBeInTheDocument();
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
    await userEvent.click(await screen.findByRole("tab", { name: "Corporate Actions" }));
    await screen.findByText("Bonus");

    await userEvent.click(screen.getByRole("button", { name: "Dividends" }));

    expect(screen.queryByText("Bonus")).not.toBeInTheDocument();
    expect(screen.getByText("Dividend")).toBeInTheDocument();
  });

  it("offers a share card of the day", async () => {
    const fetched = stubEverything();
    renderPage(<Company instrumentKey={KEY} />);
    await screen.findByText("Price & Performance");

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
    await screen.findByText("Price & Performance");
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
    expect(await screen.findByText("+2 more")).toHaveAttribute("title", "Nifty 200, Nifty 500");
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

    expect(await screen.findByText("Near 52W low")).toBeInTheDocument();
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
});
