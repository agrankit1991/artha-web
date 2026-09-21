/** Tests for one index or sector's own page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Population } from "./Population";
import {
  type Reply,
  breadth,
  chartPoints,
  member,
  population,
  priceSeries,
  renderPage,
  stubPlatform,
  earnings,
  overview,
  populationValuation,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(
  body: ReturnType<typeof population> = population(),
  extra: Record<string, Reply> = {},
): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    // One prefix for the population and its valuation: a longer prefix for
    // the valuation would also capture a sector's population request.
    "/api/populations": {
      bodyFor: (path) => (path.endsWith("/valuation") ? populationValuation() : body),
    },
    "/api/overviews": { body: [] },
    "/api/overviews/history": { body: [] },
    "/api/sessions": {
      body: [
        { day: "2026-09-16", instruments: 5000 },
        { day: "2026-09-15", instruments: 5000 },
      ],
    },
    "/api/breadth": { body: breadth() },
    "/api/earnings": { body: earnings() },
    "/api/figures": { body: { instrument_key: body.instrument_key, points: chartPoints(30) } },
    "/api/external-symbols": {
      body: [
        {
          instrument_key: body.instrument_key ?? "x",
          symbol: "NSE:BANKNIFTY",
          derived: false,
        },
      ],
    },
    "/api/series": {
      body: [
        priceSeries(body.instrument_key ?? "x", [100, 110]),
        priceSeries("NSE_INDEX|Nifty 500", [200, 210]),
      ],
    },
    ...extra,
  });
}

function show(kind: "index" | "sector" = "index", key = "NSE_INDEX|Nifty Bank"): void {
  renderPage(<Population kind={kind} scopeKey={key} />);
}

describe("Population", () => {
  it("says what the index is, as its exchange describes it", async () => {
    stubEverything();

    show();

    expect(await screen.findByRole("heading", { name: "Nifty Bank" })).toBeInTheDocument();
    expect(screen.getByText(/most liquid and large capitalised/)).toBeInTheDocument();
    expect(screen.getByText("Sectoral")).toBeInTheDocument();
  });

  it("opens on how it is doing against the market", async () => {
    // The reason the page exists: a return on its own says almost nothing,
    // and its own price is one tab away.
    stubEverything();

    show();

    expect(await screen.findByRole("tab", { name: "Relative strength" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("tabpanel")).toHaveTextContent("Nifty 500");
  });

  it("counts how many companies it holds", async () => {
    stubEverything();

    show();

    expect(await screen.findByText("2 companies")).toBeInTheDocument();
  });

  it("draws the index's own price, because an index trades", async () => {
    stubEverything();
    show();
    await screen.findByRole("tab", { name: "Price" });

    await userEvent.click(screen.getByRole("tab", { name: "Price" }));

    expect(await screen.findByText("SMA 200")).toBeInTheDocument();
  });

  it("offers the way out to TradingView from the price chart", async () => {
    // Every price chart carries it; this one had been left without.
    stubEverything();
    show();
    await userEvent.click(await screen.findByRole("tab", { name: "Price" }));

    expect(
      await screen.findByRole("link", { name: /Nifty Bank on TradingView/ }),
    ).toBeInTheDocument();
  });

  it("draws no price for a sector, because a sector does not trade", async () => {
    // It is a grouping rather than a thing that trades.
    // And no description either: an exchange publishes one for an index
    // and nobody publishes one for a sector.
    stubEverything(
      population({
        scope_kind: "sector",
        name: "IT - Software",
        instrument_key: null,
        category: null,
        description: null,
      }),
    );

    show("sector", "IT - Software");

    await screen.findByRole("heading", { name: "IT - Software" });
    expect(screen.queryByRole("tab", { name: "Price" })).not.toBeInTheDocument();
    expect(screen.queryByText(/most liquid/)).not.toBeInTheDocument();
  });

  it("counts the population's breadth for its own scope", async () => {
    const fetchMock = stubEverything();

    show("sector", "IT - Software");

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("/api/breadth") && path.includes("scope_kind=sector")),
      ).toBe(true);
    });
  });

  it("colours every company by how it moved", async () => {
    stubEverything();

    show();

    expect(await screen.findByText("Performance Heatmap")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Companies by move" })).toBeInTheDocument();
  });

  it("lists the companies it holds, sortable by every column", async () => {
    stubEverything();

    show();

    await screen.findByText("Constituents");
    const table = screen.getByRole("table", { name: "Constituents" });
    const headers = within(table).getAllByRole("button");

    for (const header of headers) {
      await userEvent.click(header);
    }

    // Price, change, distance from the high, volume: each is a question
    // somebody asks of a constituent list, so each sorts.
    expect(headers.length).toBeGreaterThan(4);
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("sorts a column where a company has no figures at all", async () => {
    // A company in an index whose figures have not been rebuilt since its
    // bars arrived is still in the index, so it is listed without them.
    stubEverything(
      population({
        members: [
          member(),
          member({
            instrument_key: "NSE_EQ|INE467B01029",
            symbol: "TCS",
            close: null,
            change_percent: null,
            volume: null,
            from_high_percent: null,
            as_of: null,
          }),
        ],
      }),
    );
    show();
    await screen.findByText("Constituents");
    const table = screen.getByRole("table", { name: "Constituents" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("asks for more history when a longer range is chosen", async () => {
    const fetchMock = stubEverything();
    show();
    await screen.findByRole("tab", { name: "Price" });

    await userEvent.click(
      within(screen.getByRole("group", { name: "History" })).getByRole("button", { name: "5Y" }),
    );

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/populations": { status: 404, body: { detail: "no index called that" } },
      "/api/breadth": { body: breadth() },
    });

    show();

    expect(await screen.findByRole("alert")).toHaveTextContent("no index called that");
  });

  it("shows a population with no companies recorded without falling over", async () => {
    stubEverything(population({ members: [], performance: null }));

    show();

    await screen.findByRole("heading", { name: "Nifty Bank" });
    expect(screen.queryByText("Constituents")).not.toBeInTheDocument();
  });

  it("shows every return a full list of constituents needs", async () => {
    // The shape the previous project's indices page settled on.
    stubEverything();

    show();

    await screen.findByText("Constituents");
    const table = screen.getByRole("table", { name: "Constituents" });
    for (const column of ["1W", "1M", "3M", "1Y", "From high", "From low", "From 200-day"]) {
      expect(within(table).getByRole("button", { name: new RegExp(column) })).toBeInTheDocument();
    }
  });

  it("offers no way out when TradingView does not know the instrument", async () => {
    // A link to the wrong chart is worse than none.
    stubPlatform({
      "/api/populations": {
        bodyFor: (path) => (path.endsWith("/valuation") ? populationValuation() : population()),
      },
      "/api/breadth": { body: breadth() },
      "/api/external-symbols": { body: [] },
      "/api/figures": {
        body: { instrument_key: "NSE_INDEX|Nifty Bank", points: chartPoints(10) },
      },
      "/api/series": { body: [] },
    });
    show();

    await userEvent.click(await screen.findByRole("tab", { name: "Price" }));

    expect(await screen.findByText("SMA 200")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /TradingView/ })).not.toBeInTheDocument();
  });

  it("names itself by its key until the platform says what it is called", async () => {
    // The page draws before the fetch lands, and a heading that is blank
    // for a moment reads as a page that has lost its subject.
    stubPlatform({
      "/api/populations": {
        bodyFor: (path) => (path.endsWith("/valuation") ? populationValuation() : population()),
      },
      "/api/breadth": { body: breadth() },
      "/api/external-symbols": { body: [] },
      "/api/figures": { body: { instrument_key: null, points: [] } },
      "/api/series": { body: [] },
    });

    show("index", "NSE_INDEX|Nifty Bank");

    expect(screen.getByRole("heading", { name: "NSE_INDEX|Nifty Bank" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Nifty Bank" })).toBeInTheDocument();
  });

  it("carries an index's own figures, which a sector has none of", async () => {
    stubEverything(population(), {
      "/api/overviews": { body: [overview({ instrument_key: "NSE_INDEX|Nifty 50" })] },
    });
    renderPage(<Population kind="index" scopeKey="NSE_INDEX|Nifty 50" />);

    expect(await screen.findByRole("heading", { name: "The Index Itself" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Valuation & Contribution" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Median price to earnings")).toBeInTheDocument();
  });

  it("values a sector's companies without an index of its own", async () => {
    stubEverything(
      population({ scope_kind: "sector", scope_key: "IT - Software", instrument_key: null }),
    );
    renderPage(<Population kind="sector" scopeKey="IT - Software" />);

    expect(await screen.findByText("Median price to earnings")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Index Itself" })).not.toBeInTheDocument();
  });

  it("reports a valuation that cannot be read without losing the page", async () => {
    // An index key is safe to stub by its longer prefix: only the valuation
    // path carries the suffix.
    stubEverything(population(), {
      "/api/populations/index/NSE_INDEX%7CNifty%2050/valuation": {
        status: 500,
        body: { detail: "no valuation" },
      },
    });
    renderPage(<Population kind="index" scopeKey="NSE_INDEX|Nifty 50" />);

    expect(await screen.findByText(/no valuation/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Earnings" })).toBeInTheDocument();
  });

  it("offers a share card of the index's day", async () => {
    const fetched = stubEverything(population(), {
      "/api/overviews": { body: [overview({ instrument_key: "NSE_INDEX|Nifty Bank" })] },
    });
    renderPage(<Population kind="index" scopeKey="NSE_INDEX|Nifty Bank" />);
    await screen.findByRole("heading", { name: "The Index Itself" });

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByRole("dialog", { name: "Share" })).toBeInTheDocument();
    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("/api/series?sessions=22"))).toBe(true);
    });
  });

  it("reads the population as it stood on a chosen session", async () => {
    const fetched = stubEverything();
    renderPage(<Population kind="index" scopeKey="NSE_INDEX|Nifty 50" />);
    await screen.findByRole("heading", { name: "Earnings" });

    await userEvent.type(screen.getByLabelText("As of"), "2026-09-15");

    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => decodeURIComponent(String(call[0])));
      expect(asked.some((path) => path.includes("Nifty 50?as_of=2026-09-15"))).toBe(true);
    });
  });
});
