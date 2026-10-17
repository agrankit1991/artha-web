/** Tests for the explanations the strategy pages carry: column hints, labelled choices, guides. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BacktestPicksPanel } from "@/components/BacktestPicks";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { ReadingGuide } from "@/components/ReadingGuide";
import { renderPage } from "@/test/support";

interface Row {
  name: string;
  balance: number;
}

const COLUMNS: Column<Row>[] = [
  { id: "name", header: "Strategy", accessorFn: (row) => row.name },
  {
    id: "balance",
    header: "Balance",
    accessorFn: (row) => row.balance,
    meta: { align: "right", hint: "Return per point of the deepest fall." },
  },
];

describe("explanations", () => {
  it("puts a column's hint beside its sort button, opening towards the table", async () => {
    renderPage(
      <DataTable columns={COLUMNS} rows={[{ name: "M147", balance: 1.19 }]} label="Strategies" />,
    );
    const table = screen.getByRole("table", { name: "Strategies" });

    const mark = within(table).getByRole("button", { name: "What Balance means" });
    // Beside the sort button, not inside it, and the sort still works.
    expect(within(table).getByRole("button", { name: /^Balance/ })).not.toContainElement(mark);
    await userEvent.hover(mark);

    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Return per point of the deepest fall.");
    // Above the page, not inside the table, so no border or scrolling box cuts it off.
    expect(table).not.toContainElement(tip);
    expect(tip.parentElement).toBe(document.body);
    expect(tip).toHaveStyle({ position: "fixed" });
    expect(within(table).queryByRole("button", { name: "What Strategy means" })).toBeNull();
  });

  it("shows a choice's label and its hint when asked", async () => {
    const chosen = vi.fn();
    renderPage(
      <Chooser
        label="Followed for"
        showLabel
        hint="How long each past start is followed."
        options={[
          { key: "3", label: "3 months" },
          { key: "6", label: "6 months" },
        ]}
        chosen="6"
        onChange={chosen}
      />,
    );

    expect(screen.getByText("Followed for")).toBeInTheDocument();
    await userEvent.hover(screen.getByRole("button", { name: "What Followed for means" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("How long each past start is followed.");
    await userEvent.click(screen.getByRole("button", { name: "3 months" }));
    expect(chosen).toHaveBeenCalledWith("3");
  });

  it("keeps a guide shut until asked", async () => {
    renderPage(
      <ReadingGuide>
        <p>Each episode counts once.</p>
      </ReadingGuide>,
    );

    const guide = screen.getByText("How to read this").closest("details");
    expect(guide).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("How to read this"));
    expect(guide).toHaveAttribute("open");
  });

  it("works out how many shares to buy for the strategy's own slots", () => {
    renderPage(
      <BacktestPicksPanel
        picks={{
          as_of: "2026-10-16",
          play: null,
          standing: "buy",
          slots: 20,
          room: 20,
          candidates: [],
        }}
      />,
    );

    expect(screen.getByText(/capital divided by its 20 slots/).textContent).toMatch(
      /Rs 50,000 a holding: at a price of Rs 2,500, 20 shares/,
    );
  });
});
