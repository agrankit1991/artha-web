/** Tests for choosing between the statements a company files. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Financials } from "./Financials";
import type { Period, Statement } from "@/api/client";
import { statement } from "@/test/support";

/** Render the section inside the router its table's links need. */
function draw(statements: Statement[]): void {
  render(
    <MemoryRouter>
      <Financials statements={statements} />
    </MemoryRouter>,
  );
}

describe("Financials", () => {
  it("offers only the statements the company actually filed", () => {
    // A statement it does not file is absent rather than present and
    // empty: an empty table looks like a fault, a missing button is a
    // fact about the company.
    draw([statement(), statement({ statement: "BALANCE_SHEET" })]);

    const choices = screen.getByRole("group", { name: "Statement" });
    expect(within(choices).getByRole("button", { name: "Income statement" })).toBeInTheDocument();
    expect(within(choices).getByRole("button", { name: "Balance sheet" })).toBeInTheDocument();
    expect(within(choices).queryByRole("button", { name: "Cash flow" })).not.toBeInTheDocument();
  });

  it("shows each basis apart, because they describe different things", async () => {
    // Consolidated covers the group and standalone the parent alone. Laid
    // side by side they would be a comparison nobody asked for.
    draw([
      statement({ periods: [period("2026-03-31", "500")] }),
      statement({ basis: "STANDALONE", periods: [period("2026-03-31", "120")] }),
    ]);

    expect(screen.getByText("500.00")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Standalone" }));

    expect(screen.getByText("120.00")).toBeInTheDocument();
  });

  it("shows each reporting period apart", async () => {
    draw([
      statement({ periods: [period("2026-03-31", "500")] }),
      statement({ frequency: "QUARTERLY", periods: [period("2026-06-30", "130")] }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Quarterly" }));

    expect(screen.getByText("130.00")).toBeInTheDocument();
  });

  it("keeps showing something when a choice does not exist for the new statement", async () => {
    // Balance sheets are filed yearly only. Somebody reading quarterly
    // income and switching statement should not be handed a blank table.
    draw([
      statement({ frequency: "QUARTERLY", periods: [period("2026-06-30", "130")] }),
      statement({ statement: "BALANCE_SHEET", periods: [period("2026-03-31", "900")] }),
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Income statement" }));

    await userEvent.click(screen.getByRole("button", { name: "Balance sheet" }));

    expect(screen.getByText("900.00")).toBeInTheDocument();
  });

  it("offers no basis to choose when only one was filed", () => {
    // A control with one option is not a choice, and a reader who sees one
    // spends a moment working out what the alternative would have been.
    draw([statement()]);

    expect(screen.queryByRole("group", { name: "Reporting basis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Reporting period" })).not.toBeInTheDocument();
  });

  it("leaves the shareholding pattern out, which is not a statement", () => {
    // It is filed quarterly on its own schedule and is in per cent of the
    // company rather than in crore, so it has a section of its own.
    draw([statement(), statement({ statement: "SHAREHOLDING", basis: "NOT_APPLICABLE" })]);

    expect(screen.queryByRole("button", { name: "As filed" })).not.toBeInTheDocument();
  });

  it("says nothing was filed rather than showing an empty frame", () => {
    draw([]);

    expect(screen.getByText("No statements filed for this company")).toBeInTheDocument();
  });
});

/** One period reporting one figure. */
function period(periodEnd: string, value: string): Period {
  return {
    period_end: periodEnd,
    figures: [{ line_item: "Revenue", value, units: "crore" }],
  };
}
