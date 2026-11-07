/** Tests for the watchlist page's Chart view. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Watchlists } from "./Watchlists";
import { readPreferences } from "@/lib/preferences";
import {
  chartPoints,
  renderPage,
  stubPlatform,
  watchedInstrument,
  watchlistPage,
  watchlistSummary,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/watchlists/1": {
      body: watchlistPage({
        items: [
          watchedInstrument(),
          watchedInstrument({ item_id: 12, instrument_key: "NSE_EQ|INE467B01029", symbol: "TCS" }),
        ],
      }),
    },
    "/api/watchlists": { body: [watchlistSummary()] },
    "/api/kept-lists/rows": {
      body: {
        kind: "sector",
        key: "IT",
        name: "IT - Software",
        rows: [
          {
            instrument_key: "NSE_EQ|INE467B01029",
            symbol: "TCS",
            name: "Tata Consultancy",
            is_index: false,
            constituents: null,
            rank: null,
            held: false,
            close: "4000",
            change_percent: "0.5",
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

/** The requests made, decoded. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  // URLSearchParams writes a space as "+".
  return fetched.mock.calls.map(([path]) => decodeURIComponent(path).replaceAll("+", " "));
}

describe("Watchlists, the Chart view", () => {
  it("charts the list's first company beside the list, and remembers the choice", async () => {
    stub();
    renderPage(<Watchlists />);
    await screen.findByRole("heading", { name: "Long term" });

    await userEvent.click(screen.getByRole("button", { name: "Chart" }));

    expect(await screen.findByRole("link", { name: "RELIANCE" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Long term" })).toBeVisible();
    expect(readPreferences().watchlistView).toBe("chart");
  });

  it("charts the company chosen in the list, and opens on the chart the reader left", async () => {
    window.localStorage.setItem("artha.preferences", JSON.stringify({ watchlistView: "chart" }));
    const fetched = stub();
    renderPage(<Watchlists />);

    await userEvent.click(await screen.findByRole("button", { name: /^TCS/ }));

    expect(await screen.findByRole("link", { name: "TCS" })).toBeVisible();
    await waitFor(() => {
      expect(
        asked(fetched).some((path) => path.includes("/api/figures?key=NSE_EQ|INE467B01029")),
      ).toBe(true);
    });
  });

  it("charts a kept list's companies too", async () => {
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?kept=sector&key=IT&view=chart" });

    expect(await screen.findByRole("list", { name: "IT - Software" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "TCS" })).toBeVisible();
  });

  it("returns to the table", async () => {
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?view=chart" });
    await screen.findByRole("list", { name: "Long term" });

    await userEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(await screen.findByRole("heading", { name: "Long term" })).toBeVisible();
    expect(readPreferences().watchlistView).toBe("table");
  });
});
