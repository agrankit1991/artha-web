/** Tests for the full ranking of a mover list. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Routes, Route } from "react-router-dom";

import { Movers } from "./Movers";
import { forgetForTests } from "@/lib/preferences";
import { moverRow, panel, renderPage, scopeOptions, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/movers/scopes": { body: scopeOptions() },
    "/api/movers/": {
      body: panel({
        rows: [
          moverRow(),
          moverRow({
            instrument_key: "NSE_EQ|INE467B01029",
            symbol: "TCS",
            rank: 2,
            value: "1.10",
            streak: 3,
          }),
        ],
      }),
    },
  });
}

/** The page under its route, so the address names the list. */
function page(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/movers/:list" element={<Movers />} />
    </Routes>
  );
}

/** The paths asked for, decoded. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map((call) => decodeURIComponent(String(call[0])).replaceAll("+", " "));
}

describe("Movers", () => {
  it("ranks only liquid companies unless asked for all, and remembers the choice", async () => {
    forgetForTests();
    const fetched = stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=companies" });
    await screen.findByRole("table", { name: "Top gainers" });

    expect(asked(fetched).some((path) => path.includes("universe=liquid"))).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "All companies" }));

    await waitFor(() => {
      expect(asked(fetched).at(-1)).toContain("universe=all");
    });
    expect(JSON.parse(window.localStorage.getItem("artha.preferences") ?? "{}")).toMatchObject({
      movers: "all",
    });
    expect(await screen.findByText(/ · 2 companies$/)).toBeInTheDocument();
  });

  it("offers no liquid switch when the indices are ranked, which are not companies", async () => {
    stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=indices" });
    await screen.findByRole("table", { name: "Top gainers" });

    expect(screen.queryByRole("button", { name: "Liquid only" })).not.toBeInTheDocument();
  });

  it("shows a list in full with each streak beside the name, each row leading to the company", async () => {
    const fetched = stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=companies" });

    const table = await screen.findByRole("table", { name: "Top gainers" });
    const tcs = await within(table).findByRole("link", { name: /TCS/ });
    expect(tcs).toHaveAttribute("href", "/company/TCS");
    // The place leads the symbol, inside the way through to the company.
    expect(tcs).toHaveTextContent(/^2\s*TCS$/);
    expect(within(table).getByRole("button", { name: /^Name/ })).toBeInTheDocument();
    // Ranked on the change, so the change is one column, not two.
    expect(within(table).getAllByRole("button", { name: /^Change/ })).toHaveLength(1);
    expect(screen.getByText(/^Ranked on .* · 2 liquid companies$/)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        asked(fetched).some((path) =>
          path.includes("/api/movers/top-gainers?scope_kind=companies&limit=100"),
        ),
      ).toBe(true);
    });
  });

  it("moves between lists and populations, keeping both in the address", async () => {
    const fetched = stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=companies" });
    await screen.findByRole("table", { name: "Top gainers" });

    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) =>
            path.includes("scope_kind=index") && path.includes("scope_key=NSE_INDEX|Nifty 50"),
        ),
      ).toBe(true);
    });
    await userEvent.click(screen.getByRole("tab", { name: "Most active" }));
    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("/api/movers/most-active?"))).toBe(true);
    });
  });

  it("reads an index-or-sector address, and the indices population", async () => {
    const fetched = stubEverything();
    const { unmount } = renderPage(page(), {
      at: "/movers/most-volatile?scope_kind=sector&scope_key=IT%20-%20Software",
    });
    await screen.findByRole("table", { name: "Most volatile" });
    expect(
      asked(fetched).some((path) => path.includes("scope_kind=sector&scope_key=IT - Software")),
    ).toBe(true);
    unmount();

    renderPage(page(), { at: "/movers/most-volatile?scope_kind=indices" });
    await screen.findByRole("table", { name: "Most volatile" });
    expect(await screen.findByText(/2 indices$/)).toBeInTheDocument();
    expect(
      asked(fetched).some((path) => path.includes("/api/movers/most-volatile?scope_kind=indices")),
    ).toBe(true);
  });

  it("names the lists when asked for one that does not exist, and reports a failed read", async () => {
    stubEverything();
    const { unmount } = renderPage(page(), { at: "/movers/nope" });
    expect(await screen.findByText("No such list")).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers/": { status: 500, body: { detail: "movers broke" } },
    });
    renderPage(page(), { at: "/movers/top-losers" });
    expect(await screen.findByText(/Movers broke/)).toBeInTheDocument();
  });

  it("sorts by any column, a row without a figure last", async () => {
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers/": {
        body: panel({
          rows: [
            moverRow(),
            moverRow({
              instrument_key: "NSE_EQ|INE467B01029",
              symbol: "TCS",
              rank: 2,
              close: null,
              change_percent: null,
            }),
          ],
        }),
      },
    });
    renderPage(page(), { at: "/movers/unusual-volume" });
    const table = await screen.findByRole("table", { name: "Unusual volume" });
    await within(table).findByRole("link", { name: /TCS/ });
    for (const name of [/^Symbol/, /^Name/, /^Price/, /^Change/, /^vs average/]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent("TCS");
  });

  it("leads each row of a list of indices to that index's page", async () => {
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers/": {
        body: panel({
          rows: [
            moverRow({
              instrument_key: "NSE_INDEX|Nifty Bank",
              symbol: "NIFTY BANK",
              name: "Nifty Bank",
            }),
          ],
        }),
      },
    });
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=indices" });

    const table = await screen.findByRole("table", { name: "Top gainers" });
    expect(await within(table).findByRole("link", { name: /NIFTY BANK/ })).toHaveAttribute(
      "href",
      "/index/nifty-bank",
    );
  });

  it("lays a list out as cards, each with its place and the figure it was ranked by", async () => {
    stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=companies" });
    await screen.findByRole("table", { name: "Top gainers" });

    await userEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const tcs = screen.getByRole("link", { name: /TCS/ });
    expect(tcs).toHaveAttribute("href", "/company/TCS");
    expect(tcs).toHaveTextContent("#2");
    expect(tcs).toHaveTextContent("3d");
    // A gainer's ranked figure is its change, already on the card once.
    expect(tcs).not.toHaveTextContent("Change");

    await userEvent.click(screen.getByRole("tab", { name: "Unusual volume" }));
    expect(await screen.findByRole("link", { name: /TCS.*vs average/ })).toBeInTheDocument();
  });

  it("holds room for the cards while they load, and says when nothing was ranked", async () => {
    const rememberCards = (): void => {
      window.localStorage.setItem(
        "artha.preferences",
        JSON.stringify({ views: { movers: "cards" } }),
      );
      forgetForTests();
    };
    rememberCards();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const { unmount } = renderPage(page(), { at: "/movers/top-gainers" });
    expect(document.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
    unmount();

    rememberCards();
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers/": { body: panel({ rows: [] }) },
    });
    renderPage(page(), { at: "/movers/top-gainers" });
    expect(await screen.findByText("Nothing ranked")).toBeInTheDocument();
  });
});
