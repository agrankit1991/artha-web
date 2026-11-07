/** Tests for the line naming the kept lists a company is in today. */

import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KeptListsHolding } from "./KeptListsHolding";
import { forgetForTests } from "@/lib/preferences";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  forgetForTests();
});

const KEY = "NSE_EQ|INE002A01018";

const HOLDING = [
  { kind: "index", key: "NSE_INDEX|Nifty 50", name: "Nifty 50", rank: null, held: false },
  { kind: "sector", key: "Refineries", name: "Refineries", rank: null, held: false },
  { kind: "movers", key: "top-gainers", name: null, rank: 2, held: false },
  { kind: "strategy", key: "4", name: "Momentum", rank: 1, held: true },
  { kind: "strategy", key: "9", name: "Pullback", rank: 12, held: false },
];

/** The paths asked for, decoded, spaces restored. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(([path]) => decodeURIComponent(path).replaceAll("+", " "));
}

describe("KeptListsHolding", () => {
  it("names the rankings and the strategies' picks it is in, each leading to that list", async () => {
    const fetched = stubPlatform({ "/api/kept-lists/holding": { body: HOLDING } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    const gainers = await screen.findByRole("link", { name: "Top gainers, place 2" });
    expect(gainers).toHaveAttribute("href", "/watchlists?kept=movers&key=top-gainers");
    expect(
      screen.getByRole("link", { name: "Momentum's picks, place 1, held today" }),
    ).toHaveAttribute("href", "/watchlists?kept=strategy&key=4");
    expect(screen.getByRole("link", { name: "Pullback's picks, place 12" })).toBeVisible();
    expect(screen.getByText("Also in today:")).toBeVisible();
    // The header names the sector and the indices already.
    expect(screen.queryByRole("link", { name: /Nifty 50|Refineries/ })).toBeNull();
    expect(asked(fetched)).toContain(
      `/api/kept-lists/holding?instrument_key=${KEY}&universe=liquid`,
    );
  });

  it("asks for the rankings in the universe the reader chose", async () => {
    window.localStorage.setItem("artha.preferences", JSON.stringify({ movers: "all" }));
    forgetForTests();
    const fetched = stubPlatform({ "/api/kept-lists/holding": { body: [] } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    await waitFor(() => {
      expect(asked(fetched)).toContain(
        `/api/kept-lists/holding?instrument_key=${KEY}&universe=all`,
      );
    });
    expect(screen.queryByText("Also in today:")).toBeNull();
  });

  it("says nothing while the company is only in its sector and indices", async () => {
    const fetched = stubPlatform({ "/api/kept-lists/holding": { body: HOLDING.slice(0, 2) } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    await waitFor(() => {
      expect(fetched).toHaveBeenCalled();
    });
    expect(screen.queryByText("Also in today:")).toBeNull();
  });

  it("says when the lists could not be read", async () => {
    stubPlatform({ "/api/kept-lists/holding": { status: 500 } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    expect(await screen.findByText("The lists kept today could not be read.")).toBeVisible();
  });
});
