/** Tests for the one table every list in the application uses. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type Column, DataTable } from "./DataTable";

interface Row {
  symbol: string;
  close: number;
}

// Deliberately in an order that matches neither direction of a price sort,
// so a sort that did nothing cannot pass for one that worked.
const ROWS: Row[] = [
  { symbol: "TCS", close: 3420 },
  { symbol: "RELIANCE", close: 1294 },
  { symbol: "INFY", close: 1502 },
];

const COLUMNS: Column<Row>[] = [
  { id: "symbol", header: "Symbol", accessorFn: (row) => row.symbol },
  {
    id: "close",
    header: "Price",
    accessorFn: (row) => row.close,
    meta: { align: "right" },
  },
];

function symbols(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelectorAll("td")[0]?.textContent ?? "");
}

describe("DataTable", () => {
  it("shows the rows it is given", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    expect(symbols()).toEqual(["TCS", "RELIANCE", "INFY"]);
  });

  it("sorts a figure from the largest first, and reverses on a second click", async () => {
    // Largest first is the right opening for a market screen: a column of
    // prices or returns is nearly always read to find the top of it. It is
    // also this library's default for a numeric column, pinned here because
    // a change in it would quietly reverse every list in the application.
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    const header = screen.getByRole("button", { name: /Price/ });

    await userEvent.click(header);
    expect(header.querySelector("svg")?.getAttribute("class")).not.toContain("opacity-40");
    expect(symbols()).toEqual(["TCS", "INFY", "RELIANCE"]);

    await userEvent.click(header);
    expect(symbols()).toEqual(["RELIANCE", "INFY", "TCS"]);
  });

  it("aligns figures right and names left", () => {
    // Declared per column rather than per table, so a price column looks
    // the same wherever it appears.
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    const cells = screen.getAllByRole("row")[1]?.querySelectorAll("td");

    expect(cells?.[0]?.className).not.toContain("text-right");
    expect(cells?.[1]?.className).toContain("text-right");
  });

  it("says when there is nothing, in the caller's own words", () => {
    // "Nothing in this list" and "no companies match" are different facts,
    // and a table that says only "no data" reports neither.
    render(<DataTable columns={COLUMNS} rows={[]} empty="Nothing in this list" />);

    expect(screen.getByText("Nothing in this list")).toBeInTheDocument();
  });

  it("holds the space while rows are on their way", () => {
    // An empty table that fills in is a page that jumps; and "loading" and
    // "empty" must not look alike, or every slow request reads as no data.
    render(<DataTable columns={COLUMNS} rows={[]} loading placeholderRows={3} />);

    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.queryByText("Nothing to show")).not.toBeInTheDocument();
  });

  it("makes rows clickable only when there is somewhere to go", async () => {
    const chosen = vi.fn();
    const { rerender } = render(<DataTable columns={COLUMNS} rows={ROWS} onSelect={chosen} />);

    const [, firstRow] = screen.getAllByRole("row");
    await userEvent.click(firstRow as HTMLElement);
    expect(chosen).toHaveBeenCalledWith(ROWS[0]);

    rerender(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getAllByRole("row")[1]?.className).not.toContain("cursor-pointer");
  });

  it("does not offer to sort a column that says it cannot be", () => {
    render(
      <DataTable
        columns={[
          { id: "symbol", header: "Symbol", accessorFn: (row) => row.symbol, enableSorting: false },
        ]}
        rows={ROWS}
      />,
    );

    expect(screen.queryByRole("button", { name: /Symbol/ })).not.toBeInTheDocument();
  });
});
