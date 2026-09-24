/** Tests for the one table every list in the application uses. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

  it("pins the header and the first column in a full list", () => {
    // Five hundred rows and a dozen columns: by the third screen a reader
    // has lost which column they are in and which row they are on.
    const { container } = render(
      <DataTable columns={COLUMNS} rows={[ROWS[0] as Row]} full label="Everything" />,
    );

    const [name] = container.querySelectorAll("thead th");
    expect(name?.className).toContain("sticky");
    expect(name?.className).toContain("left-0");
    expect(name?.className).toContain("top-0");
  });

  it("scrolls a full list rather than growing the page forever", () => {
    const { container } = render(<DataTable columns={COLUMNS} rows={[ROWS[0] as Row]} full />);

    expect(container.firstChild).toHaveClass("overflow-auto");
  });

  it("stays a plain table when it is a panel rather than a list", () => {
    const { container } = render(<DataTable columns={COLUMNS} rows={[ROWS[0] as Row]} />);

    expect(container.firstChild).not.toHaveClass("overflow-auto");
  });

  it("makes a row's own name the way into its page", () => {
    // The name rather than a chevron at the far end of a dozen columns: a
    // reader looking for a company looks at its name, and a table that
    // scrolls sideways can put the far end off screen entirely.
    render(
      <MemoryRouter>
        <DataTable columns={COLUMNS} rows={[ROWS[0] as Row]} linkTo={(one) => `/x/${one.symbol}`} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "TCS" })).toHaveAttribute("href", "/x/TCS");
  });

  it("leaves the other columns unlinked", () => {
    // One link per row, on the thing the row is about. A price that is
    // also a link invites a reader to think the link is about the price.
    render(
      <MemoryRouter>
        <DataTable columns={COLUMNS} rows={[ROWS[0] as Row]} linkTo={() => "/x"} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("opens a row without also choosing it", async () => {
    // Two separate intentions, and the row itself may already do the first.
    const chosen = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          columns={COLUMNS}
          rows={[ROWS[0] as Row]}
          onSelect={chosen}
          linkTo={() => "/x"}
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("link", { name: "TCS" }));

    expect(chosen).not.toHaveBeenCalled();
  });

  it("stretches the empty row across every column", () => {
    render(<DataTable columns={COLUMNS} rows={[]} empty="Nothing here" />);

    expect(screen.getByText("Nothing here")).toHaveAttribute("colspan", String(COLUMNS.length));
  });
  it("leaves the order to the caller when it sorts on the server", async () => {
    // A list that arrives a page at a time is ordered by the platform;
    // reordering the page here would disagree with the next one.
    const onSortingChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        serverSorting={{ sorting: [{ id: "close", desc: true }], onSortingChange }}
      />,
    );

    expect(symbols()).toEqual(["TCS", "RELIANCE", "INFY"]);
    expect(screen.getByRole("columnheader", { name: /Price/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await userEvent.click(screen.getByRole("button", { name: /Symbol/ }));

    expect(onSortingChange).toHaveBeenCalledTimes(1);
    expect(symbols()).toEqual(["TCS", "RELIANCE", "INFY"]);
  });
});
