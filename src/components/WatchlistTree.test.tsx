/** Tests for the watchlist page's side panel: folders and the kept lists. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WatchlistTree } from "./WatchlistTree";
import type { KeptLists, WatchlistFolder } from "@/api/client";
import { renderPage, watchlistSummary } from "@/test/support";

const SWING: WatchlistFolder = { folder_id: 7, name: "Swing", created_at: "2026-11-07" };
const EMPTY: WatchlistFolder = { folder_id: 8, name: "Later", created_at: "2026-11-07" };

const KEPT: KeptLists = {
  indices: [{ kind: "indices", key: "SECTORAL", name: null, count: 47 }],
  sectors: Array.from({ length: 14 }, (_, at) => ({
    kind: "sector" as const,
    key: `Sector ${String(at)}`,
    name: `Sector ${String(at)}`,
    count: at,
  })),
  movers: [{ kind: "movers", key: "top-gainers", name: null, count: null }],
  strategies: [{ kind: "strategy", key: "305", name: "M147 momentum", count: null }],
};

function draw(overrides: Partial<Parameters<typeof WatchlistTree>[0]> = {}): {
  onChooseList: ReturnType<typeof vi.fn>;
  onChooseKept: ReturnType<typeof vi.fn>;
  onNewFolder: ReturnType<typeof vi.fn>;
  onRenameFolder: ReturnType<typeof vi.fn>;
  onDeleteFolder: ReturnType<typeof vi.fn>;
} {
  const handlers = {
    onChooseList: vi.fn(),
    onChooseKept: vi.fn(),
    onNewFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
  };
  renderPage(
    <WatchlistTree
      lists={[
        watchlistSummary(),
        watchlistSummary({ watchlist_id: 2, name: "Breakouts", folder_id: 7, description: null }),
      ]}
      folders={[EMPTY, SWING]}
      kept={KEPT}
      chosenList={2}
      chosenKept={null}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe("WatchlistTree", () => {
  it("shows folders open with their lists, the rest at the top, and marks the chosen one", async () => {
    const handlers = draw();
    const nav = screen.getByRole("navigation", { name: "Watchlists" });

    expect(within(nav).getByRole("button", { name: /Breakouts/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("button", { name: /Long term/ })).not.toHaveAttribute(
      "aria-current",
    );
    // An empty folder stays closed until opened, and then says how to fill it.
    const later = within(nav).getByRole("button", { name: /^Later/ });
    expect(later).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(later);
    expect(within(nav).getByText(/Empty: move a list here/)).toBeVisible();

    await userEvent.click(within(nav).getByRole("button", { name: /Long term/ }));
    expect(handlers.onChooseList).toHaveBeenCalledWith(1);
    await userEvent.click(within(nav).getByRole("button", { name: "New folder" }));
    expect(handlers.onNewFolder).toHaveBeenCalled();

    // A folder closes on its heading.
    const swing = within(nav).getByRole("button", { name: /^Swing/ });
    await userEvent.click(swing);
    expect(within(nav).queryByRole("button", { name: /Breakouts/ })).toBeNull();
  });

  it("renames and deletes a folder from its menu", async () => {
    const handlers = draw();

    await userEvent.click(screen.getByRole("button", { name: "Folder Swing" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename folder…" }));
    expect(handlers.onRenameFolder).toHaveBeenCalledWith(SWING);
    await userEvent.click(screen.getByRole("button", { name: "Folder Swing" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete folder…" }));
    expect(handlers.onDeleteFolder).toHaveBeenCalledWith(SWING);
  });

  it("keeps the kept groups closed until opened, and names their lists in words", async () => {
    const handlers = draw();

    const indices = screen.getByRole("button", { name: /Indices/ });
    expect(indices).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Sectoral/ })).toBeNull();
    await userEvent.click(indices);
    await userEvent.click(screen.getByRole("button", { name: /Sectoral/ }));
    expect(handlers.onChooseKept).toHaveBeenCalledWith({ kind: "indices", key: "SECTORAL" });

    await userEvent.click(screen.getByRole("button", { name: /Movers/ }));
    expect(screen.getByRole("button", { name: "Top gainers" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Strategies/ }));
    expect(screen.getByRole("button", { name: "M147 momentum" })).toBeVisible();
  });

  it("narrows a long group by typing", async () => {
    draw();
    await userEvent.click(screen.getByRole("button", { name: /Sectors/ }));

    const find = screen.getByRole("searchbox", { name: "Find in Sectors" });
    await userEvent.type(find, "sector 13");
    expect(screen.getByRole("button", { name: /Sector 13/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Sector 12/ })).toBeNull();
    await userEvent.clear(find);
    await userEvent.type(find, "nothing like it");
    expect(screen.getByText("Nothing called that.")).toBeVisible();
  });

  it("opens the group holding what is shown, marking it and the list it was opened from", () => {
    draw({
      chosenList: null,
      chosenKept: {
        source: { kind: "index", key: "NSE_INDEX|Nifty Bank" },
        from: { kind: "indices", key: "SECTORAL" },
      },
    });

    expect(screen.getByRole("button", { name: /Indices/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Sectoral/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("says how to start when the reader has no lists, and waits for the kept ones", () => {
    renderPage(
      <WatchlistTree
        lists={[]}
        folders={[]}
        kept={null}
        chosenList={null}
        chosenKept={null}
        onChooseList={vi.fn()}
        onChooseKept={vi.fn()}
        onNewFolder={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
      />,
    );

    expect(screen.getByText(/None yet: save any list on the site/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Indices/ })).toBeNull();
  });
});

describe("WatchlistTree, a list kept updated", () => {
  it("marks a list kept updated from a kept list among the reader's own", () => {
    draw({
      lists: [
        watchlistSummary(),
        watchlistSummary({
          watchlist_id: 4,
          name: "Gainers, kept",
          description: null,
          items: 25,
          source: {
            kind: "movers",
            key: "top-gainers",
            scope_kind: "companies",
            scope_key: null,
            universe: "liquid",
            depth: 25,
          },
        }),
      ],
    });
    const nav = screen.getByRole("navigation", { name: "Watchlists" });

    const kept = within(nav).getByRole("button", { name: /Gainers, kept/ });
    expect(within(kept).getByRole("img", { name: "kept updated" })).toBeInTheDocument();
    const own = within(nav).getByRole("button", { name: /Long term/ });
    expect(within(own).queryByRole("img", { name: "kept updated" })).toBeNull();
  });
});
