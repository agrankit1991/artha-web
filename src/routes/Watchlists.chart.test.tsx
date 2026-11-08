/** Tests for the watchlist page's Chart view. */

import { screen, waitFor, within } from "@testing-library/react";
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

  it("takes the page's width, the lists opening from the list's name to chart another", async () => {
    stubPlatform({
      "/api/watchlists/2": {
        body: watchlistPage({
          watchlist_id: 2,
          name: "Swing",
          items: [
            watchedInstrument({
              item_id: 21,
              instrument_key: "NSE_EQ|INE467B01029",
              symbol: "TCS",
            }),
          ],
        }),
      },
      "/api/watchlists/1": { body: watchlistPage() },
      "/api/watchlists": {
        body: [watchlistSummary(), watchlistSummary({ watchlist_id: 2, name: "Swing", items: 1 })],
      },
      "/api/figures": { body: { points: chartPoints(10) } },
      "/api/price-bands": { status: 404 },
    });
    renderPage(<Watchlists />, { at: "/watchlists?list=1&view=chart" });

    const opener = await screen.findByRole("button", { name: "Long term, choose another list" });
    // No column of lists beside the charts, and the frame's width lifted.
    expect(screen.queryByRole("navigation", { name: "Watchlists" })).toBeNull();
    expect(document.querySelector("[data-page-width='full']")).not.toBeNull();

    await userEvent.click(opener);
    const lists = screen.getByRole("region", { name: "Your lists" });
    await userEvent.click(within(lists).getByRole("button", { name: /Swing/ }));

    expect(
      await screen.findByRole("button", { name: "Swing, choose another list" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(await screen.findByRole("link", { name: "TCS" })).toBeVisible();
  });

  it("fills the window with the chart where the list stands beside it", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query === "(min-width: 1280px)",
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?list=1&view=chart" });

    const chart = await screen.findByTestId("chart");
    // Nothing is laid out under test, so the cell measures nought tall and
    // its whole share of the window goes to the chart: more than the 360
    // it is drawn at where the view does not fill.
    await waitFor(() => {
      expect(Number.parseInt(chart.style.height, 10)).toBeGreaterThan(360);
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

describe("Watchlists, several charts", () => {
  it("lays out two charts, the list feeding the active one, and fills the view with one", async () => {
    window.localStorage.setItem("artha.preferences", JSON.stringify({ watchlistView: "chart" }));
    stub();
    renderPage(<Watchlists />);
    await screen.findByRole("list", { name: "Long term" });

    await userEvent.click(screen.getByRole("button", { name: "2 side by side" }));
    expect(readPreferences().chartLayout).toBe("2");
    const first = await screen.findByRole("group", { name: "Chart 1" });
    const second = screen.getByRole("group", { name: "Chart 2" });
    expect(first).toHaveAttribute("aria-current", "true");
    // Each takes the next company on the list.
    expect(await within(first).findByRole("link", { name: "RELIANCE" })).toBeVisible();
    expect(within(second).getByRole("link", { name: "TCS" })).toBeVisible();

    // The second chart made active, the list's choice goes there.
    await userEvent.click(second);
    expect(second).toHaveAttribute("aria-current", "true");
    await userEvent.click(
      within(screen.getByRole("list", { name: "Long term" })).getByRole("button", {
        name: /RELIANCE/,
      }),
    );
    expect(
      await within(screen.getByRole("group", { name: "Chart 2" })).findByRole("link", {
        name: "RELIANCE",
      }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Fill the view with chart 1" }));
    expect(screen.queryByRole("group", { name: "Chart 2" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show every chart" }));
    expect(screen.getByRole("group", { name: "Chart 2" })).toBeVisible();

    // Another layout chosen in the header shows every chart again.
    await userEvent.click(screen.getByRole("button", { name: "Fill the view with chart 1" }));
    await userEvent.click(screen.getByRole("button", { name: "2 stacked" }));
    expect(await screen.findByRole("group", { name: "Chart 2" })).toBeVisible();
  });

  it("keeps the charts in step unless told not to", async () => {
    window.localStorage.setItem(
      "artha.preferences",
      JSON.stringify({ watchlistView: "chart", chartLayout: "4" }),
    );
    stub();
    renderPage(<Watchlists />);
    await screen.findByRole("group", { name: "Chart 1" });

    const crosshair = screen.getByRole("button", { name: "Crosshair" });
    expect(crosshair).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(crosshair);
    expect(crosshair).toHaveAttribute("aria-pressed", "false");
    // Four asked, two on the list: two charts drawn.
    expect(screen.queryByRole("group", { name: "Chart 3" })).toBeNull();
  });
});

describe("Watchlists, charts the address names", () => {
  it("fills the other charts from the list without charting the address's company again", async () => {
    window.localStorage.setItem(
      "artha.preferences",
      JSON.stringify({ watchlistView: "chart", chartLayout: "3" }),
    );
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?chart=NSE_EQ%7CINE467B01029" });

    const first = await screen.findByRole("group", { name: "Chart 1" });
    expect(await within(first).findByRole("link", { name: "TCS" })).toBeVisible();
    expect(
      await within(screen.getByRole("group", { name: "Chart 2" })).findByRole("link", {
        name: "RELIANCE",
      }),
    ).toBeVisible();
    // The list's own TCS is already charted, and the list holds no third.
    expect(screen.queryByRole("group", { name: "Chart 3" })).toBeNull();
  });

  it("charts an index the list does not hold, named from its key", async () => {
    window.localStorage.setItem("artha.preferences", JSON.stringify({ watchlistView: "chart" }));
    stub();
    renderPage(<Watchlists />, { at: "/watchlists?chart=NSE_INDEX%7CNifty%2050" });

    expect(await screen.findByRole("link", { name: "Nifty 50" })).toHaveAttribute(
      "href",
      "/index/nifty-50",
    );
  });
});
