/** Tests for the line naming the kept lists a company is in today. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
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

/** Where the page is, so a test can see a choice lead somewhere. */
function Where(): React.JSX.Element {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

/** The paths asked for, decoded, spaces restored. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(([path]) => decodeURIComponent(path).replaceAll("+", " "));
}

describe("KeptListsHolding", () => {
  it("names the rankings it places in, each leading to that list", async () => {
    const fetched = stubPlatform({ "/api/kept-lists/holding": { body: HOLDING } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    const gainers = await screen.findByRole("link", { name: "Top gainers, place 2" });
    expect(gainers).toHaveAttribute("href", "/watchlists?kept=movers&key=top-gainers");
    expect(screen.getByText("Also in today:")).toBeVisible();
    // The header names the sector and the indices already.
    expect(screen.queryByText(/Nifty 50|Refineries/)).toBeNull();
    expect(asked(fetched)).toContain(
      `/api/kept-lists/holding?instrument_key=${KEY}&universe=liquid`,
    );
  });

  it("counts the strategies picking it in one chip, listing them held first", async () => {
    stubPlatform({ "/api/kept-lists/holding": { body: HOLDING } });
    renderPage(
      <>
        <KeptListsHolding instrumentKey={KEY} />
        <Where />
      </>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "In 2 strategies' picks, held by 1" }),
    );
    const menu = screen.getByRole("menu", { name: "In 2 strategies' picks, held by 1" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((one) => one.textContent),
    ).toEqual(["Momentum - held, #1", "Pullback - waiting, #12"]);
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Pullback/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/watchlists?kept=strategy&key=9");
  });

  it("says one strategy's picks without saying held when none would buy it", async () => {
    stubPlatform({ "/api/kept-lists/holding": { body: [HOLDING[4]] } });
    renderPage(<KeptListsHolding instrumentKey={KEY} />);

    expect(await screen.findByRole("button", { name: "In 1 strategy's picks" })).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
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
