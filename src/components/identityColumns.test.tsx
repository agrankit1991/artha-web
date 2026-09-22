/** Tests for the symbol and name columns every company table shares. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { StreakBadge, nameColumn, symbolColumn } from "./identityColumns";

interface Row {
  symbol: string;
  name: string | null;
  streak: number;
}

function table(rows: Row[]): void {
  render(
    <DataTable
      label="Companies"
      rows={rows}
      columns={[
        symbolColumn((row: Row) => row),
        nameColumn(
          (row: Row) => row,
          (row) => row.streak,
        ),
      ]}
    />,
  );
}

describe("identity columns", () => {
  it("gives the symbol and the name a column each, the symbol in the accent", () => {
    table([{ symbol: "TCS", name: "Tata Consultancy Services", streak: 1 }]);

    expect(screen.getByRole("button", { name: /^Symbol/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Name/ })).toBeInTheDocument();
    expect(screen.getByText("TCS")).toHaveClass("text-primary");
    expect(screen.getByText("Tata Consultancy Services")).toBeInTheDocument();
  });

  it("marks a company with no recorded name as absent rather than blank", () => {
    table([{ symbol: "NEWCO", name: null, streak: 1 }]);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("StreakBadge", () => {
  it("says nothing about a first day, which every entry has", () => {
    const { container } = render(<StreakBadge sessions={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("counts a run from its second session", () => {
    render(<StreakBadge sessions={3} />);

    expect(screen.getByText("3d")).toHaveAttribute("title", "On this list for 3 sessions running");
  });
});
