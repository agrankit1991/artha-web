/** Tests for a watchlist's table of companies. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderPage, watchedInstrument } from "@/test/support";

import { WatchlistTable, nearLevel } from "./WatchlistTable";

/** A target only, a stop only, and neither. */
const ITEMS = [
  watchedInstrument({
    item_id: 1,
    symbol: "TARGETED",
    instrument_key: "NSE_EQ|A",
    stop_loss: null,
    to_stop_percent: null,
    target_price: "1500.00",
    to_target_percent: "8.00",
  }),
  watchedInstrument({
    item_id: 2,
    symbol: "STOPPED",
    instrument_key: "NSE_EQ|B",
    target_price: null,
    to_target_percent: null,
    stop_loss: "1200.00",
    to_stop_percent: "-2.00",
  }),
  watchedInstrument({
    item_id: 3,
    symbol: "BARE",
    instrument_key: "NSE_EQ|C",
    target_price: null,
    to_target_percent: null,
    stop_loss: null,
    to_stop_percent: null,
  }),
];

function draw(): HTMLElement {
  renderPage(
    <WatchlistTable
      items={ITEMS}
      loading={false}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
      onStar={vi.fn()}
    />,
  );
  return screen.getByRole("table", { name: "Watched companies" });
}

describe("WatchlistTable", () => {
  it("shows the one level set, with how far the price is from it", () => {
    const table = draw();

    const targeted = within(table)
      .getByRole("link", { name: /TARGETED/ })
      .closest("tr") as HTMLElement;
    expect(targeted).toHaveTextContent("Target ₹1,500.00");
    expect(targeted).toHaveTextContent("+8.00%");
    const stopped = within(table)
      .getByRole("link", { name: /STOPPED/ })
      .closest("tr") as HTMLElement;
    expect(stopped).toHaveTextContent("Stop ₹1,200.00");
    expect(within(stopped).getByText("Near stop")).toBeInTheDocument();
  });

  it("sorts the nearest level first, and a company with none last", async () => {
    const table = draw();

    await userEvent.click(within(table).getByRole("button", { name: /^Stop to target/ }));

    const symbols = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("link")[0]?.textContent);
    expect(symbols[0]).toContain("STOPPED");
    expect(symbols.at(-1)).toContain("BARE");
  });
});

describe("nearLevel", () => {
  it("names the target before the stop when the price is near both", () => {
    expect(
      nearLevel(watchedInstrument({ to_target_percent: "1.00", to_stop_percent: "-1.00" })),
    ).toBe("target");
    expect(nearLevel(watchedInstrument())).toBeNull();
  });
});
