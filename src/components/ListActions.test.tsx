/** Tests for the menu that saves, adds or exports any list on the site. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListActions, addedSentence } from "./ListActions";
import { WatchlistMembershipProvider } from "@/lib/watchlistMembership";
import { type PlatformStub, renderPage, stubPlatform, watchlistSummary } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Open the menu and choose one of its actions. */
async function choose(action: RegExp): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: /Save or export/ }));
  await userEvent.click(screen.getByRole("menuitem", { name: action }));
  return screen.getByRole("dialog");
}

/** The body of the first request to a path by a method. */
function sent(platform: PlatformStub, path: string, method: string): unknown {
  const call = platform.mock.calls.find(([at, init]) => at === path && init?.method === method);
  // Every write in `src/api` sends its body as a JSON string.
  return call === undefined ? undefined : JSON.parse(call[1]?.body as string);
}

/** A promise settled by the test, for answers that arrive late. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("ListActions", () => {
  it("draws nothing for a list that is certainly empty", () => {
    renderPage(<ListActions keys={[]} label="Top gainers" />);
    expect(screen.queryByRole("button", { name: /Save or export/ })).toBeNull();
  });

  it("saves a list as a new watchlist named after it, in its order, and refreshes the counts", async () => {
    const platform = stubPlatform({
      "/api/watchlists/membership": { body: {} },
      "/api/watchlists": {
        bodyFor: (_path, method) =>
          method === "POST" ? watchlistSummary({ watchlist_id: 7, name: "Gainers", items: 2 }) : [],
      },
    });
    renderPage(
      <WatchlistMembershipProvider>
        <ListActions keys={["NSE_EQ|B", "NSE_EQ|A", "NSE_EQ|B"]} label="Top gainers" />
      </WatchlistMembershipProvider>,
    );

    const dialog = await choose(/Save as a new watchlist/);
    const name = within(dialog).getByLabelText("Name");
    expect(name).toHaveValue("Top gainers");
    expect(await within(dialog).findByText(/2 companies, in the list's order/)).toBeVisible();
    await userEvent.clear(name);
    await userEvent.type(name, "Gainers");
    await userEvent.type(within(dialog).getByLabelText("Description"), "Momentum");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save list" }));

    expect(await within(dialog).findByText(/Saved “Gainers” with 2 companies\.$/)).toBeVisible();
    expect(sent(platform, "/api/watchlists", "POST")).toEqual({
      name: "Gainers",
      description: "Momentum",
      instrument_keys: ["NSE_EQ|B", "NSE_EQ|A"],
    });
    expect(platform.mock.calls.filter(([at]) => at === "/api/watchlists/membership")).toHaveLength(
      2,
    );
    expect(within(dialog).getByRole("link", { name: "Open Gainers" })).toHaveAttribute(
      "href",
      "/watchlists?list=7",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says how many a new list left off, and saves without a description", async () => {
    const platform = stubPlatform({
      "/api/watchlists": {
        body: watchlistSummary({ watchlist_id: 7, name: "Peers", items: 1 }),
      },
    });
    renderPage(<ListActions keys={["NSE_EQ|A", "NSE_EQ|B", "NSE_EQ|C"]} label="Peers" />);

    const dialog = await choose(/Save as a new watchlist/);
    await within(dialog).findByText(/3 companies/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save list" }));

    expect(
      await within(dialog).findByText(
        /Saved “Peers” with 1 company\. 2 are no longer listed, so left off\./,
      ),
    ).toBeVisible();
    expect(sent(platform, "/api/watchlists", "POST")).toMatchObject({ description: null });
  });

  it("says one was left off in the singular", async () => {
    stubPlatform({
      "/api/watchlists": { body: watchlistSummary({ name: "Pair", items: 1 }) },
    });
    renderPage(<ListActions keys={["NSE_EQ|A", "NSE_EQ|B"]} label="Pair" />);

    const dialog = await choose(/Save as a new watchlist/);
    await within(dialog).findByText(/2 companies/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save list" }));

    expect(await within(dialog).findByText(/1 is no longer listed, so left off\./)).toBeVisible();
  });

  it("shows a name the platform refuses, and keeps the form", async () => {
    stubPlatform({
      "/api/watchlists": {
        statusFor: (_path, method) => (method === "POST" ? 409 : 200),
        body: { detail: "you already have a list called 'Top gainers'" },
      },
    });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Top gainers" />);

    const dialog = await choose(/Save as a new watchlist/);
    await within(dialog).findByText(/1 company, in the list's order/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save list" }));

    expect(await within(dialog).findByText(/already have a list called/)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Save list" })).toBeEnabled();
  });

  it("collects a paged list through its function, as deep as a save takes, and says when it was cut", async () => {
    const fetchAll = vi.fn((most: number) =>
      Promise.resolve(Array.from({ length: most }, (_, at) => `NSE_EQ|${String(at)}`)),
    );
    renderPage(<ListActions keys={fetchAll} label="Screener results" />);

    const dialog = await choose(/Save as a new watchlist/);

    expect(await within(dialog).findByText(/5,000 companies/)).toBeVisible();
    expect(
      within(dialog).getByText(/Only the first 5,000 of a longer list are taken/),
    ).toBeVisible();
    expect(fetchAll).toHaveBeenCalledWith(5_001);
  });

  it("says when the list could not be read, and offers nothing to save", async () => {
    renderPage(
      <ListActions keys={() => Promise.reject(new Error("screen refused"))} label="Screen" />,
    );

    const dialog = await choose(/Save as a new watchlist/);

    expect(await within(dialog).findByText("Screen refused")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Save list" })).toBeDisabled();
  });

  it("says a list that threw something other than an error could not be read", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
    renderPage(<ListActions keys={() => Promise.reject("nope")} label="Screen" />);

    const dialog = await choose(/Add to a watchlist/);

    expect(await within(dialog).findByText("The list could not be read")).toBeVisible();
  });

  it("puts a list on one of the reader's watchlists and says what happened", async () => {
    const platform = stubPlatform({
      "/api/watchlists/2/items/batch": { body: { added: 3, already: 1, unknown: 1 } },
      "/api/watchlists": {
        body: [watchlistSummary(), watchlistSummary({ watchlist_id: 2, name: "Swing", items: 4 })],
      },
    });
    renderPage(<ListActions keys={["NSE_EQ|A", "NSE_EQ|B"]} label="Top gainers" />);

    const dialog = await choose(/Add to a watchlist/);
    const swing = await within(dialog).findByRole("button", { name: /Swing/ });
    await waitFor(() => {
      expect(swing).toBeEnabled();
    });
    await userEvent.click(swing);

    expect(
      await within(dialog).findByText(
        "Added 3 companies to Swing. 1 was on it already, and kept its notes. 1 is no longer listed, so left off.",
      ),
    ).toBeVisible();
    expect(sent(platform, "/api/watchlists/2/items/batch", "POST")).toEqual({
      instrument_keys: ["NSE_EQ|A", "NSE_EQ|B"],
    });
    expect(within(dialog).getByRole("link", { name: "Open Swing" })).toHaveAttribute(
      "href",
      "/watchlists?list=2",
    );
  });

  it("offers a new list when the reader has none", async () => {
    stubPlatform({ "/api/watchlists": { body: [] } });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Top gainers" />);

    const dialog = await choose(/Add to a watchlist/);

    expect(await within(dialog).findByText(/You have no watchlists yet/)).toBeVisible();
  });

  it("shows why the lists could not be read, and why an add was refused", async () => {
    stubPlatform({
      "/api/watchlists/1/items/batch": { status: 500, body: { detail: "storage is down" } },
      "/api/watchlists": { body: [watchlistSummary()] },
    });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Top gainers" />);

    const dialog = await choose(/Add to a watchlist/);
    const list = await within(dialog).findByRole("button", { name: /Long term/ });
    await waitFor(() => {
      expect(list).toBeEnabled();
    });
    await userEvent.click(list);

    expect(await within(dialog).findByText("Storage is down")).toBeVisible();
  });

  it("shows the lists' own failure", async () => {
    stubPlatform({ "/api/watchlists": { status: 500, body: { detail: "lists unavailable" } } });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Top gainers" />);

    const dialog = await choose(/Add to a watchlist/);

    expect(await within(dialog).findByText("Lists unavailable")).toBeVisible();
  });

  it("copies a list for TradingView", async () => {
    stubPlatform({
      "/api/external-symbols": {
        body: [{ instrument_key: "NSE_EQ|A", symbol: "NSE:AAA", derived: false }],
      },
    });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Top gainers" />);

    const dialog = await choose(/Copy for TradingView/);

    expect(await within(dialog).findByLabelText("Symbols for TradingView")).toHaveValue("NSE:AAA");
  });

  it("draws nothing late: a list arriving after its dialog closed is not shown", async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const calls = [first, second];
    renderPage(
      <ListActions
        keys={() => {
          const next = calls.shift();
          return next === undefined ? Promise.resolve([]) : next.promise;
        }}
        label="Screen"
      />,
    );

    let dialog = await choose(/Save as a new watchlist/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    first.resolve(["NSE_EQ|A"]);

    dialog = await choose(/Save as a new watchlist/);
    await userEvent.keyboard("{Escape}");
    second.reject(new Error("too late"));

    dialog = await choose(/Save as a new watchlist/);
    expect(within(dialog).queryByText(/too late/i)).toBeNull();
    expect(within(dialog).queryByText(/1 company/)).toBeNull();
  });
});

describe("ListActions, keeping a list updated", () => {
  const SOURCE = { kind: "movers", key: "top-gainers", universe: "liquid" } as const;

  it("offers to keep a new list updated from the kept list it is, sending its source and no companies", async () => {
    const platform = stubPlatform({
      "/api/watchlists/membership": { body: {} },
      "/api/watchlists": {
        bodyFor: (_path, method) =>
          method === "POST"
            ? watchlistSummary({
                watchlist_id: 9,
                name: "Top gainers",
                items: 1,
                source: {
                  ...SOURCE,
                  scope_kind: "companies",
                  scope_key: null,
                  depth: 25,
                },
              })
            : [],
      },
    });
    renderPage(
      <WatchlistMembershipProvider>
        <ListActions keys={["NSE_EQ|A"]} label="Top gainers" source={SOURCE} />
      </WatchlistMembershipProvider>,
    );

    const dialog = await choose(/Save as a new watchlist/);
    expect(within(dialog).getByText(/yours to annotate/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep it updated" }));
    expect(within(dialog).getByText(/changes with every session/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save list" }));

    expect(
      await within(dialog).findByText(/Saved “Top gainers”, kept updated: 1 company today\./),
    ).toBeVisible();
    expect(sent(platform, "/api/watchlists", "POST")).toEqual({
      name: "Top gainers",
      description: null,
      source: SOURCE,
    });
  });

  it("offers no keeping updated for rows that are not a kept list", async () => {
    stubPlatform({ "/api/watchlists": { body: [] } });
    renderPage(<ListActions keys={["NSE_EQ|A"]} label="Peers" />);

    const dialog = await choose(/Save as a new watchlist/);
    expect(within(dialog).queryByRole("button", { name: "Keep it updated" })).toBeNull();
  });
});

describe("addedSentence", () => {
  it("speaks of one in the singular and leaves out what did not happen", () => {
    expect(addedSentence("Swing", { added: 1, already: 0, unknown: 0 })).toBe(
      "Added 1 company to Swing.",
    );
    expect(addedSentence("Swing", { added: 0, already: 2, unknown: 2 })).toBe(
      "Added 0 companies to Swing. 2 were on it already, and kept their notes. 2 are no longer listed, so left off.",
    );
  });
});
