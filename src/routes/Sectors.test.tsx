/** Tests for the list of every sector. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sectors } from "./Sectors";
import { blankReturns, renderPage, sectorSummary, stubPlatform } from "@/test/support";

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
  }),
];

describe("Sectors", () => {
  it("lists every sector with its split and its median, each leading to its page", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);

    const table = await screen.findByRole("table", { name: "Sectors" });
    const software = await within(table).findByRole("link", { name: /IT - Software/ });
    expect(software).toHaveAttribute("href", "/sector/it-software");
    // A count is a column a reader sorts by; the sample it rests on is its title.
    expect(within(table).getByText("92")).toHaveAttribute("title", "90 with figures");
    // A sector whose every company has figures needs no note.
    for (const one of within(table).getAllByText("1")) {
      expect(one).not.toHaveAttribute("title");
    }
    expect(screen.getByText(/\d+ sectors/)).toBeInTheDocument();
    expect(
      within(table).getByRole("meter", { name: "60 up, 25 down, 5 unchanged" }),
    ).toHaveAttribute("aria-valuenow", "60");
    // Nothing measured: no bar, a dash.
    const zinc = within(table).getByRole("link", { name: /Zinc/ }).closest("tr");
    expect(within(zinc as HTMLElement).queryByRole("meter")).not.toBeInTheDocument();
    expect(zinc).toHaveTextContent("—");
  });

  it("narrows by typed letters", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);
    await screen.findByRole("link", { name: /IT - Software/ });

    await userEvent.type(screen.getByRole("searchbox", { name: "Find a sector" }), "cem");

    expect(screen.getByRole("link", { name: /Cement/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /IT - Software/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
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

  it("reports a list that cannot be read", async () => {
    stubPlatform({ "/api/sectors": { status: 500, body: { detail: "sectors broke" } } });
    renderPage(<Sectors />);

    expect(await screen.findByText(/sectors broke/)).toBeInTheDocument();
  });

  it("lays the sectors out as cards, each leading to its page", async () => {
    stubPlatform({ "/api/sectors": { body: THREE } });
    renderPage(<Sectors />);
    await screen.findByRole("table", { name: "Sectors" });

    await userEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grouped" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /IT - Software/ })).toHaveAttribute(
      "href",
      "/sector/it-software",
    );
  });
});
