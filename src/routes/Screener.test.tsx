/** Tests for the screener. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Screener } from "./Screener";
import { figureAt } from "@/lib/figures";
import {
  overview,
  renderPage,
  scopeOptions,
  screenFields,
  screenHit,
  screenPage,
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

    await userEvent.click(screen.getByRole("button", { name: "Oversold" }));

    expect(screen.getByRole("combobox", { name: "Figure" })).toHaveValue("rsi");
    expect(screen.getByRole("spinbutton", { name: "Value" })).toHaveValue(30);
    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("where=rsi:lt:30"))).toBe(true);
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
    await userEvent.click(screen.getByRole("button", { name: "Above 200-day and rising" }));
    expect(screen.getAllByRole("group", { name: "Condition" })).toHaveLength(3);

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
      /^Change/,
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
});
