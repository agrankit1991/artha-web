/** Tests for a list the platform keeps, as the watchlist page shows it. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KeptListView, keptTitle } from "./KeptListView";
import type { KeptListPage, ListedInstrument } from "@/api/client";
import type { KeptChoice } from "@/lib/keptLists";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

function listed(overrides: Partial<ListedInstrument> = {}): ListedInstrument {
  return {
    instrument_key: "NSE_EQ|INE002A01018",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    is_index: false,
    constituents: null,
    rank: null,
    held: false,
    close: "1412.30",
    change_percent: "1.20",
    one_month: "4.10",
    one_year: "12.00",
    volume: 1_200_000,
    as_of: "2026-11-06",
    ...overrides,
  };
}

function page(overrides: Partial<KeptListPage> = {}): KeptListPage {
  return {
    kind: "index",
    key: "NSE_INDEX|Nifty 50",
    name: "Nifty 50",
    rows: [listed()],
    ...overrides,
  };
}

function show(choice: KeptChoice): {
  onOpen: ReturnType<typeof vi.fn>;
  onBack: ReturnType<typeof vi.fn>;
} {
  const handlers = { onOpen: vi.fn(), onBack: vi.fn() };
  renderPage(<KeptListView choice={choice} {...handlers} />);
  return handlers;
}

describe("KeptListView", () => {
  it("shows an index's companies under its name, with their figures and the save menu", async () => {
    stubPlatform({ "/api/kept-lists/rows": { body: page() } });
    show({ source: { kind: "index", key: "NSE_INDEX|Nifty 50" }, from: null });

    expect(await screen.findByRole("heading", { name: "Nifty 50" })).toBeVisible();
    expect(screen.getByText(/Its companies today, by symbol\. Figures as of/)).toBeVisible();
    expect(screen.getByRole("link", { name: "RELIANCE" })).toHaveAttribute(
      "href",
      "/company/RELIANCE",
    );
    expect(screen.getByRole("button", { name: "Save or export Nifty 50" })).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: /Rank/ })).toBeNull();
  });

  it("opens an index of a category into its companies, and leaves one holding none shut", async () => {
    stubPlatform({
      "/api/kept-lists/rows": {
        body: page({
          kind: "indices",
          key: "SECTORAL",
          name: null,
          rows: [
            listed({
              instrument_key: "NSE_INDEX|Nifty Bank",
              symbol: "Nifty Bank",
              is_index: true,
              constituents: 12,
            }),
            listed({
              instrument_key: "NSE_INDEX|India VIX",
              symbol: "India VIX",
              is_index: true,
              constituents: 0,
            }),
          ],
        }),
      },
    });
    const { onOpen } = show({ source: { kind: "indices", key: "SECTORAL" }, from: null });

    expect(await screen.findByRole("heading", { name: "Sectoral indices" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Open Nifty Bank's 12 companies" }));
    expect(onOpen).toHaveBeenCalledWith(
      { kind: "index", key: "NSE_INDEX|Nifty Bank" },
      { kind: "indices", key: "SECTORAL" },
    );
    expect(screen.queryByRole("button", { name: /Open India VIX/ })).toBeNull();
  });

  it("goes back to the list it was opened from", async () => {
    stubPlatform({ "/api/kept-lists/rows": { body: page({ name: "Nifty Bank" }) } });
    const { onBack } = show({
      source: { kind: "index", key: "NSE_INDEX|Nifty Bank" },
      from: { kind: "indices", key: "SECTORAL" },
    });

    await screen.findByRole("heading", { name: "Nifty Bank" });
    await userEvent.click(screen.getByRole("button", { name: "Sectoral indices" }));
    expect(onBack).toHaveBeenCalledWith({ kind: "indices", key: "SECTORAL" });
  });

  it("ranks a mover list, liquid or not as the reader prefers", async () => {
    const platform = stubPlatform({
      "/api/kept-lists/rows": {
        body: page({ kind: "movers", key: "top-gainers", name: null, rows: [listed({ rank: 1 })] }),
      },
    });
    show({ source: { kind: "movers", key: "top-gainers" }, from: null });

    expect(await screen.findByRole("heading", { name: "Top gainers" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: /Rank/ })).toBeVisible();
    expect(platform.mock.calls[0]?.[0]).toContain("universe=liquid");
    await userEvent.click(screen.getByRole("button", { name: /All companies|All/ }));
    expect(platform.mock.calls.some(([path]) => path.includes("universe=all"))).toBe(true);
  });

  it("marks what a strategy holds, and says when it picks nothing", async () => {
    stubPlatform({
      "/api/kept-lists/rows": {
        bodyFor: (path) =>
          path.includes("key=305")
            ? page({
                kind: "strategy",
                key: "305",
                name: "M147",
                rows: [
                  listed({ rank: 1, held: true }),
                  listed({ instrument_key: "NSE_EQ|B", symbol: "TCS", rank: 2 }),
                ],
              })
            : page({ kind: "strategy", key: "306", name: "Idle", rows: [] }),
      },
    });
    show({ source: { kind: "strategy", key: "305" }, from: null });

    expect(await screen.findByRole("heading", { name: "M147" })).toBeVisible();
    expect(screen.getAllByText("Held")).toHaveLength(2); // the column and the one held
  });

  it("says when a strategy picks nothing today", async () => {
    stubPlatform({
      "/api/kept-lists/rows": {
        bodyFor: (path) =>
          path.includes("strategy")
            ? page({ kind: "strategy", key: "1", name: "Idle", rows: [] })
            : {},
        statusFor: (path) => (path.includes("sector") ? 500 : 200),
      },
    });
    show({ source: { kind: "strategy", key: "1" }, from: null });
    expect(await screen.findByText("It picks nothing today.")).toBeVisible();
  });

  it("shows why a list could not be read", async () => {
    stubPlatform({
      "/api/kept-lists/rows": { status: 500, body: { detail: "no sector called x" } },
    });
    show({ source: { kind: "sector", key: "x" }, from: null });
    expect(await screen.findByText(/no sector called x/i)).toBeVisible();
  });
});

describe("keptTitle", () => {
  it("prefers the platform's name, else names a category or a ranking in words", () => {
    expect(keptTitle({ kind: "sector", key: "IT" }, "IT - Software")).toBe("IT - Software");
    expect(keptTitle({ kind: "indices", key: "BROAD_MARKET" }, null)).toBe("Broad market indices");
    expect(keptTitle({ kind: "movers", key: "most-active" }, null)).toBe("Most active");
    expect(keptTitle({ kind: "movers", key: "best-ever" }, null)).toBe("best-ever");
  });
});

/** Sort by a column through its header's button, and check the table says it sorted. */
async function sortBy(header: string): Promise<void> {
  const cell = screen.getByRole("columnheader", { name: new RegExp(`^${header}`) });
  await userEvent.click(within(cell).getByRole("button"));
  expect(cell).toHaveAttribute("aria-sort");
}

describe("KeptListView, sorting", () => {
  it("sorts by every column, rows with nothing to show sorting last", async () => {
    stubPlatform({
      "/api/kept-lists/rows": {
        body: page({
          kind: "indices",
          key: "SECTORAL",
          name: null,
          rows: [
            listed({
              instrument_key: "NSE_INDEX|Nifty Bank",
              symbol: "Nifty Bank",
              is_index: true,
              constituents: 12,
              rank: 2,
              held: true,
            }),
            listed({
              instrument_key: "NSE_INDEX|Nifty IT",
              symbol: "Nifty IT",
              is_index: true,
              constituents: null,
              rank: null,
              close: null,
              change_percent: null,
              one_month: null,
              one_year: null,
              volume: null,
            }),
          ],
        }),
      },
    });
    show({ source: { kind: "indices", key: "SECTORAL" }, from: null });
    await screen.findByRole("heading", { name: "Sectoral indices" });

    for (const header of ["Rank", "Price", "Today", "1M", "1Y", "Volume", "Companies"]) {
      await sortBy(header);
    }
  });

  it("sorts a strategy's picks by whether each is held", async () => {
    stubPlatform({
      "/api/kept-lists/rows": {
        body: page({
          kind: "strategy",
          key: "305",
          name: "M147",
          rows: [
            listed({ rank: 1 }),
            listed({ instrument_key: "NSE_EQ|B", symbol: "TCS", rank: 2, held: true }),
          ],
        }),
      },
    });
    show({ source: { kind: "strategy", key: "305" }, from: null });
    await screen.findByRole("heading", { name: "M147" });

    await sortBy("Held");
  });
});
