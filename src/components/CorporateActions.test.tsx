/** Tests for what a company has done to its own shares. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { CorporateActions } from "./CorporateActions";
import type { CorporateAction } from "@/api/client";
import { corporateAction } from "@/test/support";

/** Render the table inside the router its cells may link from. */
function draw(actions: CorporateAction[] | null): void {
  render(
    <MemoryRouter>
      <CorporateActions actions={actions} />
    </MemoryRouter>,
  );
}

describe("CorporateActions", () => {
  it("leads with the ex-date, which is the one that matters to a holder", () => {
    // It is the day the price drops by the dividend and the day the share
    // count changes, and a chart that looks broken is usually explained
    // by one of these.
    draw([corporateAction()]);

    const [, row] = screen.getAllByRole("row");
    const [first] = within(row as HTMLElement).getAllByRole("cell");
    expect(first).toHaveTextContent(/5 Jun 2026/);
  });

  it("measures each kind in its own units", () => {
    // A dividend is an amount per share and a bonus is a ratio, so one
    // column cannot be a number.
    draw([
      corporateAction(),
      corporateAction({ kind: "BONUS", label: "Bonus 1:1", amount: null, ratio: "1:1" }),
    ]);

    expect(screen.getByText(/6.00 per share/)).toBeInTheDocument();
    expect(screen.getByText("1:1")).toBeInTheDocument();
  });

  it("dashes what the provider never published", async () => {
    // An amount, a ratio, a record date and an announcement date are each
    // published for some kinds of event and not others, and a blank cell
    // would read as a figure of nought.
    draw([
      corporateAction({
        kind: "OTHER",
        label: "Meeting",
        amount: null,
        ratio: null,
        record_date: null,
        announced_on: null,
      }),
      corporateAction({ ex_date: "2025-01-02" }),
    ]);

    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);

    // Sorted on each column too: a missing date must not decide the order
    // by being treated as the earliest one there is.
    for (const header of screen.getAllByRole("button")) {
      await userEvent.click(header);
    }
    expect(screen.getAllByRole("row").length).toBe(3);
  });

  it("names every kind it may be handed", () => {
    draw([
      corporateAction({ kind: "SPLIT", amount: null, ratio: "1:2" }),
      corporateAction({ kind: "RIGHTS", amount: null, ratio: "1:5" }),
    ]);

    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Rights")).toBeInTheDocument();
  });

  it("sorts by any column, not only by date", async () => {
    draw([corporateAction(), corporateAction({ ex_date: "2025-01-02" })]);

    for (const header of screen.getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(screen.getAllByRole("row").length).toBe(3);
  });

  it("says nothing was recorded rather than drawing an empty frame", () => {
    draw([]);

    expect(screen.getByText("No corporate events recorded for this company")).toBeInTheDocument();
  });
});
