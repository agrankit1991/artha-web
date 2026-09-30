/** Tests for the list of every sector. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { forgetForTests } from "@/lib/preferences";
import { blankReturns, renderPage, sectorSummary, stubPlatform } from "@/test/support";

import { Sectors } from "./Sectors";

afterEach(() => {
  vi.unstubAllGlobals();
});

const THREE = [
  sectorSummary(),
  sectorSummary({
    sector: "Cement",
    companies: 1,
    measured: 1,
    median_change_percent: "-0.40",
    advancing: 0,
    declining: 1,
    unchanged: 0,
  }),
  sectorSummary({
    sector: "Zinc",
    companies: 2,
    measured: 0,
    as_of: null,
    median_change_percent: null,
    advancing: 0,
    declining: 0,
    unchanged: 0,
    returns: blankReturns(),
    median_momentum: null,
  }),
];

/** Open the page on cards, as a reader who chose them on an earlier visit. */
function rememberCards(): void {
  window.localStorage.setItem("artha.preferences", JSON.stringify({ views: { sectors: "cards" } }));
  forgetForTests();
}

describe("Sectors", () => {
  it("lists every sector with its split and its median, each leading to its page", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);

    const table = await screen.findByRole("table", { name: "Sectors" });
    const software = await within(table).findByRole("link", { name: /IT - Software/ });
    expect(software).toHaveAttribute("href", "/sector/it-software");
    // Figures resting on fewer than every company say so in print, not
    // only in a title a keyboard never reaches.
    const row = software.closest("tr") as HTMLElement;
    expect(within(row).getByTitle("90 with figures")).toHaveTextContent("90 of 92");
    // Today's median sits on the colour of its move, as a heatmap tile does,
    // with its figure printed; without a stylesheet the colour is mixed in it.
    expect(within(row).getByText("+0.80%").style.backgroundColor).toContain("var(--heat-gain)");
    // A sector whose every company has figures needs no note.
    const cement = within(table)
      .getByRole("link", { name: /Cement/ })
      .closest("tr") as HTMLElement;
    expect(within(cement).queryByTitle(/with figures/)).not.toBeInTheDocument();
    expect(screen.getByText(/\d+ sectors/)).toBeInTheDocument();
    expect(
      within(row).getByRole("img", { name: "60 advancing, 25 declining, 5 unchanged" }),
    ).toBeInTheDocument();
    // Nothing measured: no bar, a dash.
    const zinc = within(table).getByRole("link", { name: /Zinc/ }).closest("tr") as HTMLElement;
    expect(within(zinc).queryByRole("img")).not.toBeInTheDocument();
    expect(zinc).toHaveTextContent("-");
    // Every sector is counted on one session, and the page says which.
    expect(screen.getByText(/^As of 16 Sept? 2026$/)).toBeInTheDocument();
  });

  it("narrows by typed letters, counting what is left only when something is left out", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);
    const table = await screen.findByRole("table", { name: "Sectors" });
    await within(table).findByRole("link", { name: /IT - Software/ });
    expect(screen.queryByText("3 of 3")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Find a sector" }), "cem");

    expect(within(table).getByRole("link", { name: /Cement/ })).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: /IT - Software/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("searchbox", { name: "Find a sector" }));
    expect(within(table).getByRole("link", { name: /IT - Software/ })).toBeInTheDocument();
  });

  it("opens narrowed by the letters in its address", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />, { at: "/sectors?q=zin" });

    const table = await screen.findByRole("table", { name: "Sectors" });
    expect(await within(table).findByRole("link", { name: /Zinc/ })).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: /Cement/ })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Find a sector" })).toHaveValue("zin");
  });

  it("sorts by any column, an unmeasured sector last", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);
    const table = await screen.findByRole("table", { name: "Sectors" });
    await within(table).findByRole("link", { name: /IT - Software/ });

    for (const name of [
      /^Sector/,
      /^Companies/,
      /^Median change/,
      /^Momentum/,
      /^1W/,
      /^1M/,
      /^3M/,
      /^6M/,
      /^1Y/,
      /^YTD/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    await userEvent.click(within(table).getByRole("button", { name: /^Up \/ down today/ }));
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("IT - Software");
    expect(rows[3]).toHaveTextContent("Zinc");
  });

  it("plots the sectors with enough companies measured by their month and their week", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);

    expect(await screen.findByRole("heading", { name: "Rotation" })).toBeInTheDocument();
    const plot = screen.getByRole("group", { name: "Sectors by the past month and the past week" });
    // Cement rests on one company and Zinc on none: neither is plotted.
    expect(within(plot).getAllByRole("link")).toHaveLength(1);
    expect(
      within(plot).getByRole("link", {
        name: "IT - Software: +2.00% over the month, +1.00% over the week, 90 companies",
      }),
    ).toHaveAttribute("href", "/sector/it-software");
    expect(screen.getByText(/the 1 of 3 with at least 10 companies measured/)).toBeInTheDocument();
  });

  it("leaves the plot out when no sector has enough companies measured", async () => {
    stubPlatform({ "/api/sectors": { body: THREE.slice(1) } });
    renderPage(<Sectors />);

    await screen.findByRole("table", { name: "Sectors" });
    expect(screen.queryByRole("heading", { name: "Rotation" })).not.toBeInTheDocument();
  });

  it("reports a list that cannot be read, keeping the page around it", async () => {
    stubPlatform({ "/api/sectors": { status: 500, body: { detail: "sectors broke" } } });
    renderPage(<Sectors />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sectors broke");
    expect(screen.getByRole("heading", { name: "Sectors", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lays the sectors out as cards, each leading to its page", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);
    const table = await screen.findByRole("table", { name: "Sectors" });
    await within(table).findByRole("link", { name: /IT - Software/ });

    await userEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grouped" })).not.toBeInTheDocument();
    const card = screen.getByRole("link", { name: /^IT - Software\s*\+0\.80%/ });
    expect(card).toHaveAttribute("href", "/sector/it-software");
    expect(card).toHaveTextContent("90 of 92 companies");
    expect(
      within(card).getByRole("img", { name: "60 advancing, 25 declining, 5 unchanged" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Cement/ })).toHaveTextContent("1 company");
  });

  it("holds room for the cards while they load, and says when none match", async () => {
    rememberCards();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const { unmount } = renderPage(<Sectors />);
    expect(document.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
    unmount();

    rememberCards();
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />, { at: "/sectors?q=nothing" });
    expect(await screen.findByText("No sector matches")).toBeInTheDocument();
  });
});
