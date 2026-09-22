/** Tests for the full ranking of a mover list. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Routes, Route } from "react-router-dom";

import { Movers } from "./Movers";
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
  it("shows a list in full with each streak beside the name, each row leading to the company", async () => {
    const fetched = stubEverything();
    renderPage(page(), { at: "/movers/top-gainers?scope_kind=companies" });

    const table = await screen.findByRole("table", { name: "Top gainers" });
    const tcs = await within(table).findByRole("link", { name: /TCS/ });
    expect(tcs).toHaveAttribute("href", "/company/NSE_EQ%7CINE467B01029");
    expect(within(table).getByRole("button", { name: /^Name/ })).toBeInTheDocument();
    expect(screen.getByText(/2 instruments/)).toBeInTheDocument();
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
    expect(await screen.findByText(/movers broke/)).toBeInTheDocument();
  });

  it("sorts by any column", async () => {
    stubEverything();
    renderPage(page(), { at: "/movers/unusual-volume" });
    const table = await screen.findByRole("table", { name: "Unusual volume" });
    await within(table).findByRole("link", { name: /TCS/ });
    for (const name of [/^#/, /^Symbol/, /^Name/, /^Price/, /^Change/, /^vs average/]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });
});
