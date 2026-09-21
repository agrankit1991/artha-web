/** Tests for the watchlists page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Watchlists } from "./Watchlists";
import {
  renderPage,
  stubPlatform,
  watchedInstrument,
  watchlistPage,
  watchlistSummary,
} from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

const LISTS = [
  watchlistSummary(),
  watchlistSummary({ watchlist_id: 2, name: "Dividends", items: 1 }),
];

function stubEverything(page = watchlistPage()): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/watchlists/1/items": { body: watchedInstrument() },
    "/api/watchlists/1": { body: page },
    "/api/watchlists/2": {
      body: watchlistPage({
        watchlist_id: 2,
        name: "Dividends",
        items: [watchedInstrument({ item_id: 21, tags: [] })],
      }),
    },
    "/api/watchlists": {
      bodyFor: (_path, method) =>
        method === "POST" ? watchlistSummary({ watchlist_id: 3, name: "Fresh", items: 0 }) : LISTS,
    },
    "/api/search": {
      body: [
        {
          kind: "company",
          key: "NSE_EQ|INE009A01021",
          label: "INFY",
          detail: "Infosys",
          weight: 3,
        },
        { kind: "index", key: "NSE_INDEX|Nifty IT", label: "Nifty IT", detail: null, weight: 1 },
      ],
    },
  });
}

/** The requests made, as method and decoded path. */
function made(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map((call) => {
    const init = call[1] as RequestInit | undefined;
    return `${init?.method ?? "GET"} ${decodeURIComponent(String(call[0]))}`;
  });
}

describe("Watchlists", () => {
  it("opens on the first list with each instrument's levels against its price", async () => {
    stubEverything();
    renderPage(<Watchlists />);

    const table = await screen.findByRole("table", { name: "Watched instruments" });
    const reliance = (await within(table).findByRole("link", { name: /RELIANCE/ })).closest("tr");
    expect(reliance).toHaveTextContent("1,500.00");
    expect(reliance).toHaveTextContent("+20.97%");
    expect(reliance).toHaveTextContent("-11.29%");
    expect(reliance).toHaveTextContent("Retail listing ahead");
    // No level set: a dash, not a nought.
    const tcs = within(table).getByRole("link", { name: /TCS/ }).closest("tr");
    expect(tcs).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: /Long term/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("switches list from the side and from the address, and narrows by tag", async () => {
    stubEverything();
    const { unmount } = renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /^oil$/ }));
    expect(screen.queryByRole("link", { name: /TCS/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("link", { name: /TCS/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dividends/ }));
    expect(await screen.findByRole("heading", { name: "Dividends" })).toBeInTheDocument();
    unmount();

    renderPage(<Watchlists />, { at: "/watchlists?list=2" });
    expect(await screen.findByRole("heading", { name: "Dividends" })).toBeInTheDocument();
  });

  it("makes, renames and deletes a list", async () => {
    const fetched = stubEverything();
    renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /New list/ }));
    const create = screen.getByRole("dialog", { name: "New watchlist" });
    await userEvent.type(within(create).getByRole("textbox", { name: "Name" }), "Fresh");
    await userEvent.type(within(create).getByRole("textbox", { name: "Description" }), "Ideas");
    await userEvent.click(within(create).getByRole("button", { name: "Make list" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/watchlists");
    });

    await userEvent.click(screen.getByRole("button", { name: /Rename/ }));
    const rename = screen.getByRole("dialog", { name: "Rename list" });
    expect(within(rename).getByRole("textbox", { name: "Name" })).toHaveValue("Long term");
    await userEvent.clear(within(rename).getByRole("textbox", { name: "Name" }));
    await userEvent.type(within(rename).getByRole("textbox", { name: "Name" }), "Forever{Enter}");
    await waitFor(() => {
      expect(made(fetched)).toContain("PATCH /api/watchlists/1");
    });

    await userEvent.click(screen.getByRole("button", { name: /Delete list/ }));
    const confirm = screen.getByRole("dialog", { name: /Delete “Long term”\?/ });
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete list" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/watchlists/1");
    });
  });

  it("adds an instrument from a search, edits its levels, and removes it", async () => {
    const fetched = stubEverything();
    renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /Add instrument/ }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a company" }), "inf");
    // Only companies are offered; the index the search also found is not.
    const match = await screen.findByRole("button", { name: /INFY/ });
    expect(screen.queryByRole("button", { name: /Nifty IT/ })).not.toBeInTheDocument();
    await userEvent.click(match);
    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/watchlists/1/items");
    });

    await userEvent.click(screen.getByRole("button", { name: "Edit RELIANCE" }));
    const edit = screen.getByRole("dialog", { name: /RELIANCE: notes and levels/ });
    expect(within(edit).getByRole("textbox", { name: "Tags" })).toHaveValue("oil, retail");
    await userEvent.clear(within(edit).getByRole("spinbutton", { name: "Target price" }));
    await userEvent.type(within(edit).getByRole("spinbutton", { name: "Target price" }), "1600");
    await userEvent.click(within(edit).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("PATCH /api/watchlists/1/items/11");
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove RELIANCE" }));
    const confirm = screen.getByRole("dialog", { name: "Remove RELIANCE?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/watchlists/1/items/11");
    });
  });

  it("says when there are no lists, when a list is empty, and when a read fails", async () => {
    stubPlatform({ "/api/watchlists": { body: [] } });
    const none = renderPage(<Watchlists />);
    expect(await screen.findByText("No watchlists yet")).toBeInTheDocument();
    none.unmount();

    vi.unstubAllGlobals();
    stubEverything(watchlistPage({ items: [] }));
    const empty = renderPage(<Watchlists />);
    expect(await screen.findByText("Nothing on this list yet")).toBeInTheDocument();
    empty.unmount();

    vi.unstubAllGlobals();
    stubPlatform({
      "/api/watchlists/1": { status: 500, body: { detail: "page broke" } },
      "/api/watchlists": { body: LISTS },
    });
    const broken = renderPage(<Watchlists />);
    expect(await screen.findByText(/page broke/)).toBeInTheDocument();
    broken.unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/watchlists": { status: 500, body: { detail: "lists broke" } } });
    renderPage(<Watchlists />);
    expect(await screen.findByText(/lists broke/)).toBeInTheDocument();
  });

  it("sorts the instruments by any column", async () => {
    stubEverything();
    renderPage(<Watchlists />);
    const table = await screen.findByRole("table", { name: "Watched instruments" });
    await within(table).findByRole("link", { name: /RELIANCE/ });

    for (const name of [
      /^Company/,
      /^Price/,
      /^Change/,
      /^1M/,
      /^1Y/,
      /^Target/,
      /^Stop/,
      /^Tags/,
      /^Notes/,
      /^Added/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    // Sorted by target distance, the one with no target last.
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("RELIANCE");
  });

  it("shows a refused write in the dialog it came from", async () => {
    stubPlatform({
      "/api/watchlists/1/items/11": { status: 422, body: { detail: "a stop is a positive price" } },
      "/api/watchlists/1/items": { status: 500, body: { detail: "could not add" } },
      "/api/watchlists/1": {
        bodyFor: (_path, method) =>
          method === "DELETE" ? { detail: "could not delete" } : watchlistPage(),
        statusFor: (_path, method) => (method === "DELETE" ? 500 : 200),
      },
      "/api/watchlists": {
        bodyFor: (_path, method) =>
          method === "POST" ? { detail: "you already have a list called 'Fresh'" } : LISTS,
        statusFor: (_path, method) => (method === "POST" ? 409 : 200),
      },
      "/api/search": { body: [] },
    });
    renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /New list/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Fresh{Enter}");
    const create = screen.getByRole("dialog", { name: "New watchlist" });
    expect(await within(create).findByText(/already have a list called/)).toBeInTheDocument();
    await userEvent.click(within(create).getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Edit RELIANCE" }));
    const edit = screen.getByRole("dialog", { name: /RELIANCE: notes and levels/ });
    await userEvent.type(within(edit).getByRole("textbox", { name: "Notes" }), " and more");
    await userEvent.clear(within(edit).getByRole("spinbutton", { name: "Stop loss" }));
    await userEvent.type(within(edit).getByRole("spinbutton", { name: "Stop loss" }), "0");
    await userEvent.type(within(edit).getByRole("textbox", { name: "Tags" }), ", value");
    await userEvent.click(within(edit).getByRole("button", { name: "Save" }));
    expect(await within(edit).findByText(/a stop is a positive price/)).toBeInTheDocument();
    await userEvent.click(within(edit).getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: /Add instrument/ }));
    const add = screen.getByRole("dialog", { name: "Add an instrument" });
    await userEvent.type(within(add).getByRole("searchbox", { name: "Find a company" }), "zz");
    expect(await within(add).findByText(/No company called/)).toBeInTheDocument();
    await userEvent.click(within(add).getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: /Delete list/ }));
    const confirm = screen.getByRole("dialog", { name: /Delete/ });
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete list" }));
    expect(await within(confirm).findByText(/could not delete/)).toBeInTheDocument();
  });

  it("shows why an instrument could not be added", async () => {
    stubPlatform({
      "/api/watchlists/1/items": { status: 500, body: { detail: "could not add" } },
      "/api/watchlists/1": { body: watchlistPage() },
      "/api/watchlists": { body: LISTS },
      "/api/search": {
        body: [
          {
            kind: "company",
            key: "NSE_EQ|INE009A01021",
            label: "INFY",
            detail: "Infosys",
            weight: 3,
          },
        ],
      },
    });
    renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /RELIANCE/ });
    await userEvent.click(screen.getByRole("button", { name: /Add instrument/ }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a company" }), "inf");
    await userEvent.click(await screen.findByRole("button", { name: /INFY/ }));

    expect(await screen.findByText(/could not add/)).toBeInTheDocument();
  });

  it("edits an instrument with no price yet, and clears a tag by pressing it again", async () => {
    stubPlatform({
      "/api/watchlists/1/items/12": { body: watchedInstrument({ item_id: 12 }) },
      "/api/watchlists/1": { body: watchlistPage() },
      "/api/watchlists": { body: [watchlistSummary({ description: null })] },
    });
    renderPage(<Watchlists />);
    await screen.findByRole("link", { name: /TCS/ });

    await userEvent.click(screen.getByRole("button", { name: /^it$/ }));
    expect(screen.queryByRole("link", { name: /RELIANCE/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^it$/ }));
    expect(screen.getByRole("link", { name: /RELIANCE/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit TCS" }));
    const edit = screen.getByRole("dialog", { name: /TCS: notes and levels/ });
    expect(edit).not.toHaveAccessibleDescription();
    expect(within(edit).getByRole("textbox", { name: "Notes" })).toHaveValue("");
    await userEvent.click(within(edit).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
