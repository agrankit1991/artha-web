/** Tests for a reader's list kept updated from a list the platform keeps. */

import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Watchlists } from "./Watchlists";
import { chartPoints, renderPage, stubPlatform, watchlistSummary } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

/** Falling IT companies, every one of them, ten deep: kept updated. */
const FOLLOWED = watchlistSummary({
  watchlist_id: 3,
  name: "Falling IT",
  description: null,
  items: 1,
  source: {
    kind: "movers",
    key: "top-losers",
    scope_kind: "sector",
    scope_key: "IT - Software",
    universe: "all",
    depth: 10,
  },
});

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/watchlists/membership": { body: {} },
    "/api/watchlists": { body: [FOLLOWED] },
    "/api/watchlist-folders": { body: [] },
    "/api/kept-lists/rows": {
      body: {
        kind: "movers",
        key: "top-losers",
        name: null,
        rows: [
          {
            instrument_key: "NSE_EQ|INE467B01029",
            symbol: "TCS",
            name: "Tata Consultancy",
            is_index: false,
            constituents: null,
            rank: 1,
            held: false,
            close: "4000",
            change_percent: "-2.5",
            one_month: null,
            one_year: null,
            volume: null,
            as_of: null,
          },
        ],
      },
    },
    "/api/figures": { body: { points: chartPoints(10) } },
    "/api/price-bands": { status: 404 },
  });
}

/** The requests made, decoded, spaces restored. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(([path]) => decodeURIComponent(path).replaceAll("+", " "));
}

describe("Watchlists, a list kept updated", () => {
  it("shows its source's rows as it was saved, and takes no companies of its own", async () => {
    const fetched = stub();
    renderPage(<Watchlists />, { at: "/watchlists?list=3" });

    const table = await screen.findByRole("table", { name: "Falling IT" });
    expect(await within(table).findByRole("link", { name: "TCS" })).toBeVisible();
    expect(
      screen.getByText(/Kept updated from Top losers \(every company\), read afresh each time\./),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add company" })).toBeNull();
    expect(asked(fetched)).toContain(
      "/api/kept-lists/rows?kind=movers&key=top-losers&universe=all&scope_kind=sector&scope_key=IT - Software&depth=10",
    );
    // Its own items are never read: it has none.
    expect(asked(fetched)).not.toContain("/api/watchlists/3");
  });

  it("charts its source's rows in the Chart view", async () => {
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?list=3&view=chart" });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "TCS" })).toBeVisible();
    });
  });
});

describe("Watchlists, a screen kept updated", () => {
  it("reads the screen in its own words, and names it as the screener's matches", async () => {
    const fetched = stubPlatform({
      "/api/watchlists/membership": { body: {} },
      "/api/watchlists": {
        body: [
          watchlistSummary({
            watchlist_id: 5,
            name: "Oversold",
            description: null,
            source: {
              kind: "screen",
              key: "",
              scope_kind: "companies",
              scope_key: null,
              universe: "liquid",
              depth: 500,
              where: ["rsi:lt:30", "market_cap:gte:1000"],
              sort: "rsi",
              order: "asc",
            },
          }),
        ],
      },
      "/api/watchlist-folders": { body: [] },
      "/api/kept-lists/rows": { body: { kind: "screen", key: "", name: null, rows: [] } },
    });
    renderPage(<Watchlists />, { at: "/watchlists?list=5" });

    expect(
      await screen.findByText(/Kept updated from Screener matches, read afresh each time\./),
    ).toBeVisible();
    await waitFor(() => {
      expect(asked(fetched)).toContain(
        "/api/kept-lists/rows?kind=screen&key=&universe=liquid&scope_kind=companies&depth=500&where=rsi:lt:30&where=market_cap:gte:1000&sort=rsi&order=asc",
      );
    });
  });
});
