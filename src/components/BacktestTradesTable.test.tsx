/** Tests for the trades table's reasons: each badge explains itself, and the guide lists them all. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { BacktestTrade } from "@/api/client";
import { BacktestTradesTable, SaleReasonsGuide } from "@/components/BacktestTradesTable";
import { SALE_REASONS } from "@/lib/strategyTerms";
import { backtestDetail, renderPage } from "@/test/support";

/** A sale for a reason the platform might add after this was written. */
const UNKNOWN: BacktestTrade = {
  instrument_key: "NSE_EQ|INE002A01018",
  symbol: "LATER",
  entered: "2026-01-02",
  exited: "2026-04-01",
  entry_price: 10,
  exit_price: 11,
  sessions: 60,
  reason: "margin_call",
  gain_percent: 9.6,
  portion: 1,
};

describe("BacktestTradesTable", () => {
  it("says what a sale's reason means on its badge, above the table", async () => {
    // The fixture sells one holding at a target and one at a stop.
    renderPage(<BacktestTradesTable trades={[...backtestDetail().trades, UNKNOWN]} />);
    const table = screen.getByRole("table", { name: "Trades" });

    await userEvent.hover(within(table).getByRole("button", { name: "What Stop means" }));
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent(/sold at the stop, or at the open if it opened below/);
    expect(table).not.toContainElement(tip);
    expect(within(table).getByRole("button", { name: "What Target means" })).toBeInTheDocument();

    // Read as the platform names it, with no mark to explain it.
    expect(within(table).getByText("margin_call")).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /margin_call/ })).toBeNull();
  });

  it("lists every reason with its meaning, shut until asked", async () => {
    renderPage(<SaleReasonsGuide />);
    const opener = screen.getByText("What each reason in Why means");
    expect(opener.closest("details")).not.toHaveAttribute("open");

    await userEvent.click(opener);
    const reasons = Object.values(SALE_REASONS);
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      reasons.map(({ word }) => word),
    );
    expect(screen.getAllByRole("definition").map((meaning) => meaning.textContent)).toEqual(
      reasons.map(({ meaning }) => meaning),
    );
  });
});
