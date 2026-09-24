/** Tests for the screener. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Screener } from "./Screener";
import type { ScreenField } from "@/api/client";
import { figureAt } from "@/lib/figures";
import { type Scan, SCANS, scanPath } from "@/lib/scans";
import {
  companySnapshot,
  niftyFifty,
  overview,
  renderPage,
  scopeOptions,
  screenFields,
  screenHit,
  screenPage,
  strategyFields,
  stubPlatform,
} from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(page = screenPage()): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/screen/fields": { body: screenFields() },
    "/api/screen?": { body: page },
    "/api/movers/scopes": { body: scopeOptions() },
  });
}

/** The platform with the strategies' figures, and the Nifty 50 above its 150-day average. */
function stubStrategies(page = screenPage()): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/screen/fields": { body: [...screenFields(), ...strategyFields()] },
    "/api/screen?": { body: page },
    "/api/movers/scopes": { body: scopeOptions() },
    "/api/overviews": { body: [niftyFifty("3.10")] },
  });
}

/** A scan from the catalogue by key. */
function scanNamed(key: string): Scan {
  const found = SCANS.find((one) => one.key === key);
  if (found === undefined) {
    throw new Error(`the ${key} scan is missing from the catalogue`);
  }
  return found;
}

/** The paths the platform was asked for, decoded. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map((call) => decodeURIComponent(String(call[0])).replaceAll("+", " "));
}

describe("Screener", () => {
  it("screens the whole market with no conditions, showing the default columns", async () => {
    const fetched = stubEverything();
    renderPage(<Screener />);

    const table = await screen.findByRole("table", { name: "Screen results" });
    expect(await within(table).findByRole("link", { name: /RELIANCE/ })).toHaveAttribute(
      "href",
      "/company/RELIANCE",
    );
    expect(within(table).getByText("Refineries")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /RSI \(14\)/ })).toBeInTheDocument();
    expect(screen.getByText("1 company meets every condition")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) => path.includes("/api/screen?scope_kind=companies") && !path.includes("where="),
        ),
      ).toBe(true);
    });
  });

  it("applies a preset, keeps it in the address, and shows its figure as a column", async () => {
    const fetched = stubEverything();
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.click(screen.getByRole("button", { name: "Oversold in an uptrend" }));

    // The scan's first condition, then its context: above the 200-day and liquid.
    expect(screen.getAllByRole("combobox", { name: "Figure" })[0]).toHaveValue("rsi");
    expect(screen.getAllByRole("spinbutton", { name: "Value" })[0]).toHaveValue(35);
    expect(screen.getAllByRole("group", { name: "Condition" })).toHaveLength(3);
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("where=rsi:lt:35") && path.includes("where=from_sma_200_percent:gt:0"),
        ),
      ).toBe(true);
    });
    const table = screen.getByRole("table", { name: "Screen results" });
    expect(within(table).getByRole("button", { name: /RSI \(14\)/ })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /1 year/ })).not.toBeInTheDocument();
  });

  it("builds a condition by hand, and does not send one without a value", async () => {
    const fetched = stubEverything();
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.click(screen.getByRole("button", { name: /Add condition/ }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Figure" }), "one_month");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Comparison" }), "gte");
    // Nothing typed yet: the hint says why nothing is applied.
    expect(screen.getByRole("button", { name: "What this means" })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("spinbutton", { name: "Value" }), "5");

    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("where=one_month:gte:5"))).toBe(true);
    });
    expect(asked(fetched).some((path) => path.includes("where=one_month:gte&"))).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Remove condition" }));
    expect(screen.queryByRole("combobox", { name: "Figure" })).not.toBeInTheDocument();
  });

  it("clears every condition at once", async () => {
    stubEverything();
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });
    await userEvent.click(screen.getByRole("button", { name: "Leaders near their highs" }));
    expect(screen.getAllByRole("group", { name: "Condition" })).toHaveLength(4);

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByRole("group", { name: "Condition" })).not.toBeInTheDocument();
  });

  it("sorts by a figure either way and screens one population", async () => {
    const fetched = stubEverything();
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "one_year");
    await userEvent.click(screen.getByRole("button", { name: "Largest first" }));
    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));

    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("scope_kind=index") &&
            path.includes("scope_key=NSE_INDEX|Nifty 50") &&
            path.includes("sort=one_year") &&
            path.includes("order=asc"),
        ),
      ).toBe(true);
    });
    expect(screen.getByRole("button", { name: "Smallest first" })).toBeInTheDocument();
    // Back to the symbol order, and to the whole market.
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "");
    await userEvent.click(screen.getByRole("button", { name: "Companies" }));
    await waitFor(() => {
      const last = asked(fetched).at(-1) ?? "";
      expect(last).toContain("scope_kind=companies");
      expect(last).not.toContain("scope_key=");
      expect(last).not.toContain("sort=");
    });
  });

  it("asks for more when there is more", async () => {
    const fetched = stubEverything(screenPage({ total: 120 }));
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.click(await screen.findByRole("button", { name: /more/i }));

    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("limit=100"))).toBe(true);
    });
  });

  it("reads a screen out of the address, malformed parts and all", async () => {
    const fetched = stubEverything();
    renderPage(<Screener />, {
      at: "/screen?where=rsi:lt:30&where=broken&where=one_year:sideways:5&scope_kind=sector&scope_key=Cement&sort=nope",
    });
    await screen.findByRole("table", { name: "Screen results" });

    // Three conditions are shown, the broken one included so it can be
    // mended or removed; a comparison nobody has heard of reads as "<".
    expect(screen.getAllByRole("group", { name: "Condition" })).toHaveLength(3);
    expect(screen.getAllByRole("combobox", { name: "Comparison" })[2]).toHaveValue("lt");
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("scope_kind=sector") &&
            path.includes("scope_key=Cement") &&
            path.includes("where=rsi:lt:30") &&
            !path.includes("where=broken"),
        ),
      ).toBe(true);
    });
  });

  it("says when nothing meets the conditions, and reports a failed screen", async () => {
    stubEverything(screenPage({ total: 0, items: [], as_of: null }));
    const { unmount } = renderPage(<Screener />);
    expect(await screen.findByText("No company meets every condition")).toBeInTheDocument();
    expect(screen.getByText("0 companies meet every condition")).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({
      "/api/screen/fields": { body: screenFields() },
      "/api/screen?": { status: 500, body: { detail: "screen broke" } },
      "/api/movers/scopes": { body: scopeOptions() },
    });
    const failed = renderPage(<Screener />);
    expect(await screen.findByText(/screen broke/)).toBeInTheDocument();
    failed.unmount();

    vi.unstubAllGlobals();
    stubPlatform({
      "/api/screen/fields": { status: 500, body: { detail: "no fields" } },
      "/api/screen?": { body: screenPage() },
      "/api/movers/scopes": { body: scopeOptions() },
    });
    renderPage(<Screener />);
    expect(await screen.findByText(/no fields/)).toBeInTheDocument();
  });

  it("writes each figure by its unit", async () => {
    const hit = screenHit({
      figures: overview({
        instrument_key: "NSE_EQ|INE002A01018",
        volume: { ...overview().volume, relative_to_average: "2.5" },
      }),
    });
    stubEverything(screenPage({ items: [hit] }));
    renderPage(<Screener />, {
      at: "/screen?where=relative_volume:gt:2&where=volume:gt:0&where=close:gt:1&where=average_true_range:gt:1",
    });
    const table = await screen.findByRole("table", { name: "Screen results" });

    expect(await within(table).findByText("2.50×")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /^Volume/ })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /Average true range/ })).toBeInTheDocument();
    // Every column sorts, the fixed ones and the ones the screen is about.
    for (const name of [
      /^Symbol/,
      /^Name/,
      /^Sector/,
      /^Price/,
      /^1D/,
      /^1W/,
      /^1M/,
      /^3M/,
      /^6M/,
      /^1Y/,
      /^YTD/,
      /^Volume/,
      /Relative volume/,
      /Average true range/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    // A hit missing the figure a column shows gets a dash; walking past a
    // scalar or a null stops.
    expect(figureAt(hit.figures, ["momentum", "nowhere"])).toBeNull();
    expect(figureAt(hit.figures, ["day", "close", "deeper"])).toBeNull();
    expect(figureAt(hit.figures, ["sessions"])).toBe(hit.figures.sessions);
  });

  it("applies a scan's order with its conditions, reading standing from the snapshot", async () => {
    const fields: ScreenField[] = [
      ...screenFields(),
      {
        name: "profit_ttm",
        label: "Profit (TTM)",
        group: "Valuation & standing",
        unit: "crore",
        record: "snapshot",
        path: ["profit_ttm"],
      },
      {
        name: "revenue_growth",
        label: "Revenue growth (1Y)",
        group: "Valuation & standing",
        unit: "percent",
        record: "snapshot",
        path: ["revenue_growth"],
      },
      {
        name: "traded_value",
        label: "Value traded",
        group: "Session",
        unit: "crore",
        record: "figures",
        path: ["day", "traded_value"],
      },
    ];
    const hit = screenHit({ snapshot: companySnapshot() });
    const fetched = stubPlatform({
      "/api/screen/fields": { body: fields },
      "/api/screen?": { body: screenPage({ items: [hit] }) },
    });
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.click(screen.getByRole("button", { name: "Profitable and growing" }));

    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("where=profit_ttm:gt:0") &&
            path.includes("where=revenue_growth:gte:5") &&
            path.includes("sort=traded_value") &&
            path.includes("order=desc"),
        ),
      ).toBe(true);
    });
    const table = screen.getByRole("table", { name: "Screen results" });
    expect(await within(table).findByText("79,020")).toBeInTheDocument();
    expect(within(table).getByText("+7.10%")).toBeInTheDocument();
  });

  it("shows every return as its own column, once even when a condition names one", async () => {
    stubEverything();
    renderPage(<Screener />, { at: "/screen?where=one_month:gt:10" });
    const table = await screen.findByRole("table", { name: "Screen results" });

    for (const header of ["1D", "1W", "1M", "3M", "6M", "1Y", "YTD"]) {
      expect(within(table).getAllByRole("button", { name: new RegExp(`^${header}`) })).toHaveLength(
        1,
      );
    }
    // The fixture's month: +2.40% on its figures.
    expect(await within(table).findByText("+2.40%")).toBeInTheDocument();
  });

  it("opens a strategy's screen with the strategy above its rows", async () => {
    const fetched = stubStrategies();
    renderPage(<Screener />, { at: scanPath(scanNamed("momentum-12-1-near-high")) });

    const panel = screen.getByRole("region", { name: "Strategy" });
    expect(
      within(panel).getByRole("heading", { name: "12-1 momentum near the 52-week high" }),
    ).toBeInTheDocument();
    expect(within(panel).getByText("S0010")).toBeInTheDocument();
    expect(within(panel).getByText(/still close to their 52-week high/)).toBeInTheDocument();
    expect(
      within(panel).getByText(
        "While the market switch is on, the 20 with the highest 12-1 momentum on a re-pick day. While it is off, none of them: it holds gold.",
      ),
    ).toBeInTheDocument();
    expect(await within(panel).findByRole("group", { name: "Market switch" })).toHaveTextContent(
      "On: invested",
    );
    expect(within(panel).getByText("Picks")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /tested record and caveats/ })).toHaveAttribute(
      "href",
      "/scans",
    );
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("where=from_high_percent:gte:-15") &&
            path.includes("where=traded_value_average_20:gte:10") &&
            path.includes("sort=momentum_12_1") &&
            path.includes("order=desc"),
        ),
      ).toBe(true);
    });
  });

  it("keeps the panel when a condition changes, says so, and restores the strategy's screen", async () => {
    const fetched = stubStrategies();
    renderPage(<Screener />, { at: scanPath(scanNamed("momentum-12-1-near-high")) });
    const panel = screen.getByRole("region", { name: "Strategy" });

    // A condition with no value is not sent, so the screen is still the strategy's.
    await userEvent.click(screen.getByRole("button", { name: /Add condition/ }));
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();

    const nearness = screen.getAllByRole("spinbutton", { name: "Value" })[0] as HTMLElement;
    await userEvent.clear(nearness);
    await userEvent.type(nearness, "-25");
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "The screen has been changed from the strategy's, so the rows below are not its candidates.",
    );
    expect(within(panel).queryByText(/the 20 with the highest/)).not.toBeInTheDocument();

    await userEvent.click(within(panel).getByRole("button", { name: /Restore the strategy/ }));

    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Condition" })).toHaveLength(3);
    expect(screen.getAllByRole("spinbutton", { name: "Value" })[0]).toHaveValue(-15);
    await waitFor(() => {
      expect(asked(fetched).at(-1)).toContain("where=from_high_percent:gte:-15");
    });
  });

  it("calls a narrowed population or a reversed order a different screen, and restores the whole market", async () => {
    const fetched = stubStrategies();
    renderPage(<Screener />, { at: scanPath(scanNamed("momentum-12-1-near-high")) });
    const panel = screen.getByRole("region", { name: "Strategy" });

    await userEvent.click(screen.getByRole("button", { name: "Largest first" }));
    expect(within(panel).getByRole("status")).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: /Restore the strategy/ }));
    expect(screen.getByRole("button", { name: "Largest first" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));
    expect(within(panel).getByRole("status")).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: /Restore the strategy/ }));

    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => {
      const last = asked(fetched).at(-1) ?? "";
      expect(last).toContain("scope_kind=companies");
      expect(last).not.toContain("scope_key=");
      expect(last).toContain("order=desc");
    });
  });

  it("names the rows it holds by their figure, so re-sorting the results changes nothing", async () => {
    stubStrategies();
    renderPage(<Screener />, { at: scanPath(scanNamed("momentum-12-1-near-high")) });
    const panel = screen.getByRole("region", { name: "Strategy" });
    await screen.findByRole("table", { name: "Screen results" });

    await userEvent.click(
      within(screen.getByRole("columnheader", { name: /1Y/ })).getByRole("button"),
    );

    expect(within(panel).getByText(/the 20 with the highest 12-1 momentum/)).toBeInTheDocument();
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
  });

  it("brings a strategy's chip over the whole market, as its restore does", async () => {
    const fetched = stubStrategies();
    renderPage(<Screener />);
    await userEvent.click(await screen.findByRole("button", { name: "Nifty 50" }));

    await userEvent.click(
      screen.getByRole("button", { name: "12-1 momentum near the 52-week high" }),
    );

    const panel = screen.getByRole("region", { name: "Strategy" });
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => {
      const last = asked(fetched).at(-1) ?? "";
      expect(last).toContain("sort=momentum_12_1");
      expect(last).toContain("scope_kind=companies");
      expect(last).not.toContain("scope_key=");
    });
  });

  it("says rows screened on an earlier session's delivery are not yet signals", async () => {
    const late = screenHit({
      figures: overview({ instrument_key: "NSE_EQ|INE002A01018", as_of: "2026-09-23" }),
      snapshot: companySnapshot({ as_of: "2026-09-22", delivery_as_of: "2026-09-22" }),
    });
    stubStrategies(screenPage({ items: [late] }));
    renderPage(<Screener />, { at: scanPath(scanNamed("volume-delivery-surge")) });
    const panel = screen.getByRole("region", { name: "Strategy" });

    const warning = await within(panel).findByRole("status");
    expect(warning).toHaveTextContent(
      /^The delivery figure for every row below is from 22 Sept? 2026, not the session of 23 Sept? 2026, so none of them is a signal yet\./,
    );
    // The rule itself still stands above the warning.
    expect(within(panel).getByText(/Every row is a signal/)).toBeInTheDocument();
  });

  it("names the rows on another session's delivery when only some are", async () => {
    const session = overview({ instrument_key: "NSE_EQ|INE467B01029", as_of: "2026-09-23" });
    const current = screenHit({
      instrument_key: "NSE_EQ|INE467B01029",
      symbol: "TCS",
      name: "Tata Consultancy Services",
      figures: session,
      snapshot: companySnapshot({ as_of: "2026-09-23", delivery_as_of: "2026-09-23" }),
    });
    const behind = screenHit({
      figures: { ...session, instrument_key: "NSE_EQ|INE002A01018" },
      snapshot: companySnapshot({ as_of: "2026-09-23", delivery_as_of: "2026-09-19" }),
    });
    stubStrategies(screenPage({ total: 2, items: [current, behind] }));
    renderPage(<Screener />, { at: scanPath(scanNamed("volume-delivery-surge")) });

    const warning = await within(screen.getByRole("region", { name: "Strategy" })).findByRole(
      "status",
    );
    expect(warning).toHaveTextContent(
      /^The delivery figure for RELIANCE is from 19 Sept? 2026, not the session of 23 Sept? 2026, so those rows are not signals yet\./,
    );
  });

  it("raises nothing when each row's delivery is its own session's", async () => {
    const hit = screenHit({
      figures: overview({ instrument_key: "NSE_EQ|INE002A01018", as_of: "2026-09-22" }),
      snapshot: companySnapshot(),
    });
    stubStrategies(screenPage({ items: [hit] }));
    renderPage(<Screener />, { at: scanPath(scanNamed("volume-delivery-surge")) });

    const table = await screen.findByRole("table", { name: "Screen results" });
    expect(await within(table).findByText("RELIANCE")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Strategy" })).queryByRole("status"),
    ).not.toBeInTheDocument();
  });

  it("brings the featured strategy as a preset, panel and all", async () => {
    stubStrategies();
    renderPage(<Screener />);
    await screen.findByRole("table", { name: "Screen results" });
    expect(screen.queryByRole("region", { name: "Strategy" })).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "12-1 momentum near the 52-week high" }),
    );

    const panel = screen.getByRole("region", { name: "Strategy" });
    expect(within(panel).getByText("S0010")).toBeInTheDocument();
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
  });

  it("says what a strategy without a market switch does with the rows, and draws no switch", async () => {
    stubStrategies();
    renderPage(<Screener />, { at: scanPath(scanNamed("volume-delivery-surge")) });
    const panel = screen.getByRole("region", { name: "Strategy" });

    expect(within(panel).getByText(/Every row is a signal/)).toBeInTheDocument();
    expect(
      within(panel).getByText("None: it never steps out of the market as a whole."),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("group", { name: "Market switch" })).not.toBeInTheDocument();
    await screen.findByRole("table", { name: "Screen results" });
  });

  it("shows no strategy for a plain scan or a key no scan has", async () => {
    stubStrategies();
    const { unmount } = renderPage(<Screener />, { at: scanPath(scanNamed("oversold-uptrend")) });
    await screen.findByRole("table", { name: "Screen results" });
    expect(screen.queryByRole("region", { name: "Strategy" })).not.toBeInTheDocument();
    unmount();

    renderPage(<Screener />, { at: "/screen?scan=no-such-scan" });
    await screen.findByRole("table", { name: "Screen results" });
    expect(screen.queryByRole("region", { name: "Strategy" })).not.toBeInTheDocument();
  });
});
