import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListShortcut } from "@/components/ListShortcut";
import { WatchlistMembershipProvider } from "@/lib/watchlistMembership";
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

describe("ListShortcut, when the company is already on the last list", () => {
  it("ticks the list, and one click takes the company off it", async () => {
    writePreferences({ lastWatchlist: 2 });
    const fetched = stubPlatform({
      "/api/watchlists/choices": { body: CHOICES },
      "/api/watchlists/holding": { body: [{ watchlist_id: 2, item_id: 7 }] },
      "/api/watchlists/2/items": { body: {} },
    });
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    const shortcut = await screen.findByRole("button", { name: "Swing", pressed: true });
    expect(shortcut).toHaveAttribute("title", "Take RELIANCE off Swing");
    await userEvent.click(shortcut);

    expect(
      fetched.mock.calls.some(
        ([path, init]) => path === "/api/watchlists/2/items/7" && init?.method === "DELETE",
      ),
    ).toBe(true);
  });

  it("finds the item to take off when the tick came from the page's membership alone", async () => {
    writePreferences({ lastWatchlist: 2 });
    let holding: unknown[] = [];
    const fetched = stubPlatform({
      "/api/watchlists/membership": { body: { [KEY]: [2] } },
      "/api/watchlists/choices": { body: CHOICES },
      "/api/watchlists/holding": { bodyFor: () => holding },
      "/api/watchlists/2/items": { body: {} },
    });
    renderPage(
      <WatchlistMembershipProvider>
        <ListShortcut instrumentKey={KEY} symbol="RELIANCE" />
      </WatchlistMembershipProvider>,
    );

    const shortcut = await screen.findByRole("button", { name: "Swing", pressed: true });
    // The item arrives only when asked for again, at the click.
    holding = [{ watchlist_id: 2, item_id: 9 }];
    await userEvent.click(shortcut);

    expect(
      fetched.mock.calls.some(
        ([path, init]) => path === "/api/watchlists/2/items/9" && init?.method === "DELETE",
      ),
    ).toBe(true);
  });

  it("opens the dialog for a new list from the menu", async () => {
    stub();
    renderPage(<ListShortcut instrumentKey={KEY} symbol="RELIANCE" />);

    await userEvent.click(await screen.findByRole("button", { name: "RELIANCE's lists" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /New list/ }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
