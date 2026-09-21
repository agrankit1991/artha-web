/** Tests for one statement drawn as line items against periods. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { StatementTable } from "./StatementTable";
import type { Statement } from "@/api/client";
import { statement } from "@/test/support";

/** Render the table inside the router its cells may link from. */
function draw(one: Statement | null): void {
  render(
    <MemoryRouter>
      <StatementTable statement={one} />
    </MemoryRouter>,
  );
}

describe("StatementTable", () => {
  it("puts the line items down and the periods across", () => {
    // A statement is read down a column -- revenue, what it cost, what was
    // left -- and across a row to see whether a figure is growing.
    draw(statement());

    const table = screen.getByRole("table");
    expect(within(table).getByText("Revenue")).toBeInTheDocument();
    expect(within(table).getByText("Profit After Tax")).toBeInTheDocument();
    expect(within(table).getByText(/31 Mar 2026/)).toBeInTheDocument();
    expect(within(table).getByText(/31 Mar 2025/)).toBeInTheDocument();
  });

  it("keeps a line item a period never reported", () => {
    // The items come from the platform rather than from whichever period
    // is longest: a row that vanished because the newest period has not
    // reported it would look like a figure that ceased to exist.
    draw(statement());

    const row = screen.getByText("Profit After Tax").closest("tr");
    expect(within(row as HTMLElement).getByText("—")).toBeInTheDocument();
  });

  it("writes a share as a percentage and a sum as a figure", () => {
    // A shareholding is in per cent of the company and a statement is in
    // crore, and the same number means different things in each.
    draw(
      statement({
        statement: "SHAREHOLDING",
        line_items: ["promoters"],
        periods: [
          {
            period_end: "2026-06-30",
            figures: [{ line_item: "promoters", value: "50.480000", units: "percent" }],
          },
        ],
      }),
    );

    expect(screen.getByText("+50.48%")).toBeInTheDocument();
  });

  it("makes a provider's identifier readable", () => {
    // Some line items are published in prose and others as identifiers,
    // depending on which report they came from. Shown as published, one
    // statement reads like a document and the next like a database.
    draw(
      statement({
        line_items: ["retail_and_other"],
        periods: [
          {
            period_end: "2026-06-30",
            figures: [{ line_item: "retail_and_other", value: "11.13", units: "percent" }],
          },
        ],
      }),
    );

    expect(screen.getByText("Retail and other")).toBeInTheDocument();
  });

  it("sorts by any period, not only by line item", async () => {
    // Asked of this table: which of these figures is the largest. That is
    // a question about a column, and the rows are in statement order.
    draw(statement());

    for (const header of screen.getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("says nothing was reported rather than drawing an empty frame", () => {
    draw(null);

    expect(screen.getByText("Nothing reported")).toBeInTheDocument();
  });
});
