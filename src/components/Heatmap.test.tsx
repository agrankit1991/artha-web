/** Tests for the market map. */

import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HeatmapTile } from "@/api/client";
import { heatmapTile, renderPage } from "@/test/support";

import { Heatmap } from "./Heatmap";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Three companies in two sectors, one the snapshot has not valued. */
const TILES: HeatmapTile[] = [
  heatmapTile(),
  heatmapTile({
    instrument_key: "NSE_EQ|INE467B01029",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    sector: "IT - Software",
    market_cap: "1100000.00",
    traded_value: "800.00",
    changes: {
      day: "-2.00",
      one_week: "3.00",
      one_month: null,
      three_months: null,
      year_to_date: null,
      one_year: null,
    },
  }),
  heatmapTile({
    instrument_key: "NSE_EQ|INE009A01021",
    symbol: "INFY",
    name: "Infosys",
    sector: null,
    market_cap: null,
    traded_value: "5000.00",
  }),
];

function draw(tiles: HeatmapTile[] | null = TILES): void {
  renderPage(
    <Heatmap tiles={tiles} label="Nifty 50" linkTo={(tile) => `/company/${tile.symbol}`} />,
  );
}

/** The map itself. */
function map(): HTMLElement {
  return screen.getByRole("group", { name: /^Nifty 50: companies by/ });
}

describe("Heatmap", () => {
  it("sizes by capitalisation, groups by sector, and leads each tile to its company", () => {
    draw();

    const tiles = within(map()).getAllByRole("link");
    // INFY has no capitalisation on record, so it cannot be sized by one.
    expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual([
      "/company/RELIANCE",
      "/company/TCS",
    ]);
    expect(
      within(map()).getByRole("link", { name: "RELIANCE, Reliance Industries: +1.50% over 1D" }),
    ).toBeInTheDocument();
    expect(within(map()).getByRole("button", { name: "Refineries" })).toBeInTheDocument();
    expect(screen.getByText(/1 without a market capitalisation left out/)).toBeInTheDocument();
    // Coloured by the stylesheet's tokens when it cannot read them itself.
    expect(tiles[0]?.style.backgroundColor ?? "").toContain("var(--heat-gain)");
    expect(screen.getByText("-3%")).toBeInTheDocument();
  });

  it("counts every company once on Equal, and sizes by trade on Traded value", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: "Equal" }));
    expect(within(map()).getAllByRole("link")).toHaveLength(3);
    // A company with no sector is grouped as Other.
    expect(within(map()).getByRole("button", { name: "Other" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Traded value" }));
    expect(within(map()).getAllByRole("link")[0]).toHaveAttribute("href", "/company/INFY");
  });

  it("colours by the period chosen, clamped at that period's reach", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: "1W" }));

    expect(
      within(map()).getByRole("link", { name: "TCS, Tata Consultancy Services: +3.00% over 1W" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+6%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "1M" }));
    // No month on record: drawn as the neutral, and named without a figure.
    expect(
      within(map()).getByRole("link", { name: "TCS, Tata Consultancy Services: - over 1M" }),
    ).toHaveStyle({ color: "var(--heat-ink-dark)" });
  });

  it("zooms into a sector by its name, and back out", async () => {
    draw();

    await userEvent.click(within(map()).getByRole("button", { name: "IT - Software" }));

    expect(within(map()).getAllByRole("link")).toHaveLength(1);
    const trail = screen.getByRole("navigation", { name: "Map" });
    expect(trail).toHaveTextContent("IT - Software");

    await userEvent.click(within(trail).getByRole("button", { name: "All sectors" }));
    expect(within(map()).getAllByRole("link")).toHaveLength(2);
  });

  it("dims every company but the ones a search finds", async () => {
    draw();

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Find a company on the map" }),
      "tata",
    );

    const [reliance, tcs] = within(map()).getAllByRole("link");
    expect(reliance).toHaveClass("opacity-25");
    expect(tcs).toHaveClass("ring-2");
  });

  it("shows a company's figures on hover and on focus", () => {
    draw();
    const tcs = within(map()).getByRole("link", { name: /^TCS/ });

    fireEvent.mouseEnter(tcs);
    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("Tata Consultancy Services");
    expect(card).toHaveTextContent("IT - Software");
    expect(card).toHaveTextContent("₹11,00,000 cr");
    expect(card).toHaveTextContent("₹800 cr");
    fireEvent.mouseLeave(map());
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    const reliance = within(map()).getByRole("link", { name: /^RELIANCE/ });
    fireEvent.focus(reliance);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Refineries");
    fireEvent.blur(reliance);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("lists the same companies as a table, sortable by every column", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: "Table" }));

    const table = screen.getByRole("table", { name: "Companies on the map" });
    expect(within(table).getByRole("link", { name: /TCS/ })).toHaveAttribute(
      "href",
      "/company/TCS",
    );
    for (const name of [/^Symbol/, /^Name/, /^Sector/, /^1D/, /^Market cap/, /^Traded/]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("holds its room while loading, and says when there is nothing to draw", async () => {
    const loading = renderPage(<Heatmap tiles={null} label="Nifty 50" linkTo={() => "/"} />);
    expect(loading.container.querySelector("[data-slot=skeleton]")).not.toBeNull();
    loading.unmount();

    // Nobody valued: nothing to size by capitalisation, but trade still sizes.
    const unvalued = renderPage(
      <Heatmap tiles={[heatmapTile({ market_cap: null })]} label="Nifty 50" linkTo={() => "/"} />,
    );
    expect(screen.getByText(/Try Equal/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Traded value" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    unvalued.unmount();

    renderPage(
      <Heatmap
        tiles={[heatmapTile({ market_cap: null, traded_value: "0" })]}
        label="Nifty 50"
        linkTo={() => "/"}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Traded value" }));
    expect(screen.getByText(/None of these companies has figures/)).toBeInTheDocument();
  });

  it("names the largest it drew when there are more than it draws", () => {
    draw(
      Array.from({ length: 510 }, (_, index) =>
        heatmapTile({
          instrument_key: `NSE_EQ|X${String(index)}`,
          symbol: `X${String(index)}`,
          market_cap: String(1000 + index),
        }),
      ),
    );

    expect(screen.getByText(/The 500 largest of 510/)).toBeInTheDocument();
  });

  it("goes full screen and back, where the browser can", async () => {
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: request,
    });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
    draw();

    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(request).toHaveBeenCalled();

    const frame = map().parentElement as HTMLElement;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: frame });
    fireEvent(document, new Event("fullscreenchange"));
    await userEvent.click(await screen.findByRole("button", { name: "Leave full screen" }));
    expect(exit).toHaveBeenCalled();

    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    fireEvent(document, new Event("fullscreenchange"));
    expect(await screen.findByRole("button", { name: "Full screen" })).toBeInTheDocument();
    Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    Reflect.deleteProperty(document, "fullscreenElement");
  });

  it("is shorter on a phone, laid out for the width it is drawn at", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 390,
    });
    draw();

    expect(map()).toHaveStyle({ height: "440px" });
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  });

  it("turns each company's card inwards from whichever edge it is near", () => {
    draw([
      ...TILES,
      heatmapTile({
        instrument_key: "NSE_EQ|INE040A01034",
        symbol: "HDFCBANK",
        name: "HDFC Bank",
        sector: "Bank",
        market_cap: "900000.00",
        traded_value: "12.50",
      }),
    ]);
    const sides = new Set<string>();
    for (const tile of within(map()).getAllByRole("link")) {
      fireEvent.mouseEnter(tile);
      const card = screen.getByRole("tooltip");
      for (const side of ["left", "right", "top", "bottom"] as const) {
        if (card.style[side] !== "") {
          sides.add(side);
        }
      }
    }

    expect(sides).toEqual(new Set(["left", "right", "top", "bottom"]));
  });

  it("writes a small sum with its decimals, and an unknown one as a dash", async () => {
    draw([heatmapTile({ market_cap: null, traded_value: "12.50" })]);
    await userEvent.click(screen.getByRole("button", { name: "Equal" }));

    fireEvent.focus(within(map()).getByRole("link"));

    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("Market cap-");
    expect(card).toHaveTextContent("₹12.50 cr");
  });
});
