import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListShortcut } from "@/components/ListShortcut";
import { forgetForTests, readPreferences, writePreferences } from "@/lib/preferences";
import { renderPage, stubPlatform, watchlistChoice } from "@/test/support";

const KEY = "NSE_EQ|INE002A01018";
const CHOICES = [
  watchlistChoice(),
  watchlistChoice({ watchlist_id: 2, name: "Swing", items: 5 }),
  watchlistChoice({ watchlist_id: 5, name: "Liquid Companies", followed: true, items: null }),
];

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/watchlists/choices": { body: CHOICES },
    "/api/watchlists/holding": { body: [] },
    "/api/watchlists/1/items": { body: {} },
    "/api/watchlists/2/items": { body: {} },
  });
}

beforeEach(() => {
  forgetForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ListShortcut", () => {
  it("offers the list last added to, and puts the company on it in one click", async () => {
    writePreferences({ lastWatchlist: 2 });
    const fetched = stub();
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    const shortcut = await screen.findByRole("button", { name: "Swing" });
    expect(shortcut).toHaveAttribute("aria-pressed", "false");
    expect(shortcut).toHaveAttribute("title", "Put RELIANCE on Swing");

    await userEvent.click(shortcut);

    expect(
      fetched.mock.calls.some(
        ([path, init]) => path === "/api/watchlists/2/items" && init?.method === "POST",
      ),
    ).toBe(true);
  });

  it("says Add to list before any list has been added to", async () => {
    stub();
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    expect(await screen.findByRole("button", { name: "RELIANCE's lists" })).toHaveTextContent(
      "Add to list",
    );
    expect(screen.queryByRole("button", { name: "Long term" })).toBeNull();
  });

  it("never offers a list kept updated, which takes no adds", async () => {
    writePreferences({ lastWatchlist: 5 });
    stub();
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    expect(await screen.findByRole("button", { name: "RELIANCE's lists" })).toHaveTextContent(
      "Add to list",
    );
  });

  it("remembers the list a company is put on from the menu", async () => {
    stub();
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    await userEvent.click(await screen.findByRole("button", { name: "RELIANCE's lists" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Long term/ }));

    expect(readPreferences().lastWatchlist).toBe(1);
  });
});
