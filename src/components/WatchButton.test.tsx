/** Tests for the star that puts an instrument on a watchlist. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WatchButton } from "./WatchButton";
import { heldBy, renderPage, stubPlatform, watchlistSummary } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

const LISTS = [
  watchlistSummary(),
  watchlistSummary({ watchlist_id: 2, name: "Dividends", items: 0 }),
];

function stubEverything(holding = [heldBy()]): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/watchlists/holding": { body: holding },
    "/api/watchlists/1/items": { body: {} },
    "/api/watchlists/2/items": { body: {} },
    "/api/watchlists": {
      bodyFor: (_path, method) =>
        method === "POST" ? watchlistSummary({ watchlist_id: 3, name: "Fresh", items: 0 }) : LISTS,
    },
  });
}

/** The requests made, as method and decoded path. */
function made(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map((call) => {
    const init = call[1];
    return `${init?.method ?? "GET"} ${decodeURIComponent(call[0])}`;
  });
}

describe("WatchButton", () => {
  it("is filled when the instrument is on a list, and ticks that list", async () => {
    stubEverything();
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);

    const star = await screen.findByRole("button", { name: "RELIANCE is on 1 list of yours" });
    expect(star).toHaveTextContent("On 1 list");
    await userEvent.click(star);

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Long term/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(menu).getByRole("menuitem", { name: /Dividends/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("adds to a list that lacks it and removes from one that has it", async () => {
    const fetched = stubEverything();
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);
    await userEvent.click(await screen.findByRole("button", { name: /RELIANCE/ }));

    await userEvent.click(screen.getByRole("menuitem", { name: /Dividends/ }));
    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/watchlists/2/items");
    });
    await userEvent.click(screen.getByRole("menuitem", { name: /Long term/ }));
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/watchlists/1/items/11");
    });
  });

  it("makes a new list and puts the instrument on it", async () => {
    const fetched = stubEverything([]);
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);
    const star = await screen.findByRole("button", { name: "Watch RELIANCE" });
    expect(star).toHaveTextContent("Watch");
    await userEvent.click(star);
    await userEvent.click(screen.getByRole("menuitem", { name: /New list/ }));

    const dialog = screen.getByRole("dialog", { name: "New watchlist" });
    expect(within(dialog).getByRole("button", { name: "Make and add" })).toBeDisabled();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Name" }), "Fresh{Enter}");

    // One request makes the list with the instrument on it.
    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/watchlists");
    });
    const posted = fetched.mock.calls.find(
      ([path, init]) => path === "/api/watchlists" && init?.method === "POST",
    );
    expect(JSON.parse(posted?.[1]?.body as string)).toEqual({
      name: "Fresh",
      instrument_keys: ["NSE_EQ|INE002A01018"],
    });
    expect(made(fetched)).not.toContain("POST /api/watchlists/3/items");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when a list cannot be changed, and when there are no lists", async () => {
    stubPlatform({
      "/api/watchlists/holding": { body: [] },
      "/api/watchlists/1/items": { status: 500, body: { detail: "list broke" } },
      "/api/watchlists": { body: [watchlistSummary({ items: 0 })] },
    });
    const { unmount } = renderPage(
      <WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Watch RELIANCE" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Long term/ }));
    expect(await screen.findByText(/List broke/)).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/watchlists/holding": { body: [] }, "/api/watchlists": { body: [] } });
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);
    await userEvent.click(await screen.findByRole("button", { name: "Watch RELIANCE" }));
    expect(await screen.findByText("No lists yet.")).toBeInTheDocument();
  });

  it("shows why the lists could not be read", async () => {
    stubPlatform({
      "/api/watchlists/holding": { body: [] },
      "/api/watchlists": { status: 500, body: { detail: "lists broke" } },
    });
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);
    await userEvent.click(await screen.findByRole("button", { name: "Watch RELIANCE" }));

    expect(await screen.findByText(/Lists broke/)).toBeInTheDocument();
  });

  it("keeps the new-list dialog open with the reason when the list is refused", async () => {
    stubPlatform({
      "/api/watchlists/holding": { body: [] },
      "/api/watchlists": {
        bodyFor: (_path, method) =>
          method === "POST" ? { detail: "you already have a list called 'Fresh'" } : LISTS,
        statusFor: (_path, method) => (method === "POST" ? 409 : 200),
      },
    });
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);
    await userEvent.click(await screen.findByRole("button", { name: "Watch RELIANCE" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /New list/ }));
    const dialog = screen.getByRole("dialog", { name: "New watchlist" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Name" }), "Fresh{Enter}");

    expect(await within(dialog).findByText(/already have a list called/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // And Escape puts it away too.
    await userEvent.click(screen.getByRole("button", { name: "Watch RELIANCE" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /New list/ }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows why the holdings could not be read", async () => {
    stubPlatform({
      "/api/watchlists/holding": { status: 500, body: { detail: "holding broke" } },
      "/api/watchlists": { body: LISTS },
    });
    renderPage(
      <WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" className="ml-2" />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Watch RELIANCE" }));

    expect(await screen.findByText(/Holding broke/)).toBeInTheDocument();
  });
});

describe("WatchButton, a list kept updated", () => {
  it("counts a list kept updated that holds it, ticked but not changed from here", async () => {
    const fetched = stubPlatform({
      "/api/watchlists/holding": { body: [heldBy(), { watchlist_id: 5, item_id: null }] },
      "/api/watchlists": {
        body: [
          ...LISTS,
          watchlistSummary({
            watchlist_id: 5,
            name: "Nifty 50, kept",
            items: 50,
            source: {
              kind: "index",
              key: "NSE_INDEX|Nifty 50",
              scope_kind: "companies",
              scope_key: null,
              universe: "liquid",
              depth: 25,
            },
          }),
        ],
      },
    });
    renderPage(<WatchButton instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "RELIANCE is on 2 lists of yours" }),
    );
    const kept = screen.getByRole("menuitem", { name: /Nifty 50, kept/ });
    expect(kept).toHaveAttribute("aria-current", "true");
    expect(kept).toBeDisabled();
    expect(kept).toHaveTextContent("kept updated");
    await userEvent.click(kept);
    expect(made(fetched).filter((one) => !one.startsWith("GET"))).toEqual([]);
  });
});
