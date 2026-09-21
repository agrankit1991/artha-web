/** Tests for the list of every index. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Indices } from "./Indices";
import { indexSummary, renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

const THREE = [
  indexSummary(),
  indexSummary({
    instrument_key: "NSE_INDEX|Nifty IT",
    symbol: "NIFTY IT",
    name: "Nifty IT",
    category: "SECTORAL",
    constituents: 10,
    change_percent: "-1.20",
  }),
  indexSummary({
    instrument_key: "BSE_INDEX|SENSEX",
    symbol: "SENSEX",
    name: "S&P BSE Sensex",
    category: null,
    constituents: 0,
    as_of: null,
    close: null,
    change_percent: null,
    returns: null,
    from_high_percent: null,
  }),
];

describe("Indices", () => {
  it("lists every index with its kind and size, each leading to its page", async () => {
    stubPlatform({ "/api/indices": { body: THREE } });
    renderPage(<Indices />);

    const table = await screen.findByRole("table", { name: "Indices" });
    const nifty = await within(table).findByRole("link", { name: /Nifty 50/ });
    expect(nifty).toHaveAttribute("href", "/index/NSE_INDEX%7CNifty%2050");
    expect(within(table).getByText("Broad market")).toBeInTheDocument();
    expect(within(table).getByText("Sectoral")).toBeInTheDocument();
    // Never described and never counted: the symbol stands in, and a dash.
    const sensex = within(table)
      .getByRole("link", { name: /Sensex/ })
      .closest("tr");
    expect(sensex).toHaveTextContent("SENSEX");
    expect(sensex).toHaveTextContent("—");
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("narrows by kind and by typed letters", async () => {
    stubPlatform({ "/api/indices": { body: THREE } });
    renderPage(<Indices />);
    await screen.findByRole("link", { name: /Nifty 50/ });

    await userEvent.click(screen.getByRole("button", { name: "Sectoral" }));
    expect(screen.queryByRole("link", { name: /Nifty 50/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nifty IT/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All kinds" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find an index" }), "sens");
    expect(screen.getByRole("link", { name: /Sensex/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nifty IT/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("sorts by any column, an index without a figure last", async () => {
    stubPlatform({ "/api/indices": { body: THREE } });
    renderPage(<Indices />);
    const table = await screen.findByRole("table", { name: "Indices" });
    await within(table).findByRole("link", { name: /Nifty 50/ });

    for (const name of [
      /^Index/,
      /^Companies/,
      /^Level/,
      /^1W/,
      /^1M/,
      /^3M/,
      /^1Y/,
      /^YTD/,
      /^From high/,
      /^As of/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    await userEvent.click(within(table).getByRole("button", { name: /^Change/ }));
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Nifty 50");
    expect(rows[3]).toHaveTextContent("Sensex");
  });

  it("says when nothing matches and when the list cannot be read", async () => {
    stubPlatform({ "/api/indices": { body: THREE } });
    const { unmount } = renderPage(<Indices />);
    await screen.findByRole("link", { name: /Nifty 50/ });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find an index" }), "zzz");
    expect(screen.getByText("No index matches")).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/indices": { status: 500, body: { detail: "indices broke" } } });
    renderPage(<Indices />);
    expect(await screen.findByText(/indices broke/)).toBeInTheDocument();
  });
});
