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
          exchanges: [],
          category: null,
          close: null,
          change_percent: null,
        },
        {
          kind: "index",
          key: "NSE_INDEX|Nifty IT",
          label: "Nifty IT",
          detail: null,
          exchanges: [],
          category: null,
          close: null,
          change_percent: null,
        },
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
  it("opens on the first list with each company's levels against its price", async () => {
    stubEverything();
    renderPage(<Watchlists />);

    const table = await screen.findByRole("table", { name: "Watched companies" });
    const reliance = (await within(table).findByRole("link", { name: /RELIANCE/ })).closest("tr");
    // Stop and target at the ends of one meter, the price between them.
    expect(reliance).toHaveTextContent("₹1,100.00");
    expect(reliance).toHaveTextContent("₹1,500.00");
    expect(
      within(reliance as HTMLElement).getByRole("meter", {
        name: "RELIANCE between its stop and its target",
      }),
    ).toBeInTheDocument();
    expect(reliance).toHaveTextContent("Retail listing ahead");
    // No level set: a dash, not a nought.
    const tcs = within(table).getByRole("link", { name: /TCS/ }).closest("tr");
    expect(tcs).toHaveTextContent("-");
    expect(screen.getByRole("button", { name: /Long term/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("switches list from the side and from the address, and narrows by tag", async () => {
    stubEverything();
    const { unmount } = renderPage(<Watchlists />);
    await screen.findAllByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /^oil$/ }));
    expect(screen.queryByRole("link", { name: /TCS/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("link", { name: /TCS/ }).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /Dividends/ }));
    expect(await screen.findByRole("heading", { name: "Dividends" })).toBeInTheDocument();
    unmount();

    renderPage(<Watchlists />, { at: "/watchlists?list=2" });
    expect(await screen.findByRole("heading", { name: "Dividends" })).toBeInTheDocument();
  });

  it("makes, renames and deletes a list", async () => {
    const fetched = stubEverything();
    renderPage(<Watchlists />);
    await screen.findAllByRole("link", { name: /RELIANCE/ });

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
    await screen.findAllByRole("link", { name: /RELIANCE/ });

    await userEvent.click(screen.getByRole("button", { name: /Add company/ }));
    await userEvent.type(screen.getByRole("combobox", { name: "Find a company" }), "inf");
    // Only companies are offered; the index the search also found is not.
    const match = await screen.findByRole("option", { name: /INFY/ });
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
    expect(await screen.findByText(/Page broke/)).toBeInTheDocument();
    broken.unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/watchlists": { status: 500, body: { detail: "lists broke" } } });
    renderPage(<Watchlists />);
    expect(await screen.findByText(/Lists broke/)).toBeInTheDocument();
  });

  it("sorts the instruments by any column", async () => {
    stubEverything();
    renderPage(<Watchlists />);
    const table = await screen.findByRole("table", { name: "Watched companies" });
    await within(table).findByRole("link", { name: /RELIANCE/ });

    for (const name of [
      /^Symbol/,
      /^Name/,
      /^Price/,
      /^Volume/,
      /^Today/,
      /^Added/,
      /^Stop to target/,
      /^1M/,
      /^1Y/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    // Every column sorts; the rows are all still there.
    expect(within(table).getAllByRole("row")).toHaveLength(3);
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
    await screen.findAllByRole("link", { name: /RELIANCE/ });

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
    expect(await within(edit).findByText(/A stop is a positive price/)).toBeInTheDocument();
    await userEvent.click(within(edit).getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: /Add company/ }));
    const add = screen.getByRole("dialog", { name: "Add a company" });
    await userEvent.type(within(add).getByRole("combobox", { name: "Find a company" }), "zz");
    expect(await within(add).findByText(/Nothing called/)).toBeInTheDocument();
    await userEvent.click(within(add).getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: /Delete list/ }));
    const confirm = screen.getByRole("dialog", { name: /Delete/ });
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete list" }));
    expect(await within(confirm).findByText(/Could not delete/)).toBeInTheDocument();
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
            exchanges: [],
            category: null,
            close: null,
            change_percent: null,
          },
        ],
      },
    });
    renderPage(<Watchlists />);
    await screen.findAllByRole("link", { name: /RELIANCE/ });
    await userEvent.click(screen.getByRole("button", { name: /Add company/ }));
    await userEvent.type(screen.getByRole("combobox", { name: "Find a company" }), "inf");
    await userEvent.click(await screen.findByRole("option", { name: /INFY/ }));

    expect(await screen.findByText(/Could not add/)).toBeInTheDocument();
  });

  it("edits an instrument with no price yet, and clears a tag by pressing it again", async () => {
    stubPlatform({
      "/api/watchlists/1/items/12": { body: watchedInstrument({ item_id: 12 }) },
      "/api/watchlists/1": { body: watchlistPage() },
      "/api/watchlists": { body: [watchlistSummary({ description: null })] },
    });
    renderPage(<Watchlists />);
    await screen.findAllByRole("link", { name: /TCS/ });

    await userEvent.click(screen.getByRole("button", { name: /^it$/ }));
    expect(screen.queryByRole("link", { name: /RELIANCE/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^it$/ }));
    expect(screen.getAllByRole("link", { name: /RELIANCE/ }).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Edit TCS" }));
    const edit = screen.getByRole("dialog", { name: /TCS: notes and levels/ });
    expect(edit).not.toHaveAccessibleDescription();
    expect(within(edit).getByRole("textbox", { name: "Notes" })).toHaveValue("");
    await userEvent.click(within(edit).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("lays each item out as the previous watchlist did, and stars one without opening it", async () => {
    const starred: unknown[] = [];
    stubPlatform({
      "/api/watchlists/1/items/11": {
        bodyFor: (_path, method) => {
          return method === "PATCH" ? watchedInstrument({ featured: true }) : {};
        },
      },
      "/api/watchlists/1": {
        body: watchlistPage({
          items: [
            watchedInstrument({ to_target_percent: "2.10" }),
            watchedInstrument({
              item_id: 12,
              instrument_key: "NSE_EQ|INE467B01029",
              symbol: "TCS",
              name: "Tata Consultancy Services",
              notes: null,
              tags: [],
              to_target_percent: null,
              to_stop_percent: "-1.50",
              featured: true,
            }),
          ],
        }),
      },
      "/api/watchlists": { body: [watchlistSummary()] },
    });
    const fetched = vi.mocked(globalThis.fetch);
    renderPage(<Watchlists />, { at: "/watchlists?list=1" });
    const table = await screen.findByRole("table", { name: "Watched companies" });
    await within(table).findByRole("link", { name: /RELIANCE/ });

    // Notes and tags under the name; the change since added and where it was added.
    expect(within(table).getByText("Retail listing ahead")).toBeInTheDocument();
    expect(within(table).getByText("oil")).toBeInTheDocument();
    expect(within(table).getAllByText("+3.33%")).toHaveLength(2);
    expect(within(table).getAllByText(/ at ₹1,200\.00$/)).toHaveLength(2);
    // Near a level is said in words: a target in teal, a stop in caution.
    expect(within(table).getByText("Near target")).toHaveClass("text-primary");
    expect(within(table).getByText("Near stop")).toHaveClass("text-caution");
    // Each company since it was added, ranked, above the table.
    const ranked = screen.getByRole("list", { name: "Each company since it was added" });
    expect(within(ranked).getAllByRole("listitem")).toHaveLength(2);
    expect(within(table).getByRole("button", { name: "Unstar TCS" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(within(table).getByRole("button", { name: "Star RELIANCE" }));

    await waitFor(() => {
      const patch = fetched.mock.calls.find((call) => call[1]?.method === "PATCH");
      expect(patch).toBeDefined();
      starred.push(JSON.parse(patch?.[1]?.body as string));
    });
    // The whole item goes with the star, or saving it would clear the rest.
    expect(starred[0]).toEqual({
      notes: "Retail listing ahead",
      target_price: "1500.00",
      stop_loss: "1100.00",
      tags: ["oil", "retail"],
      featured: true,
    });
    // Starring stays on the list rather than opening the company.
    expect(screen.getByRole("table", { name: "Watched companies" })).toBeInTheDocument();
  });
});
