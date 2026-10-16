/** Tests for the strip of the market's phases over the years. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { marketPhaseView, renderPage } from "@/test/support";

import { PhaseHistory, within as spellsWithin } from "./PhaseHistory";

const SPELLS = marketPhaseView().spells;

describe("PhaseHistory", () => {
  it("draws a band per run in the last ten years, with each phase's share and the latest runs", () => {
    renderPage(<PhaseHistory spells={SPELLS} />);

    // 2014-15 is more than ten years before October 2026: three runs remain.
    const bands = screen.getAllByTestId("phase-band");
    expect(bands).toHaveLength(3);
    expect(bands[0]).toHaveAttribute(
      "title",
      expect.stringMatching(/^Bottoming: 20 Mar(ch)? 2020/),
    );
    expect(bands[0]).toHaveStyle({ flexGrow: "80" });
    const shares = screen.getByRole("list", { name: "Time in each phase" });
    expect(within(shares).getByText(/^Bottoming/)).toHaveTextContent("Bottoming 52%");
    const latest = within(screen.getByRole("list", { name: "The latest runs" })).getAllByRole(
      "listitem",
    );
    expect(latest[0]).toHaveTextContent(/Falling.*14 sessions/);
  });

  it("shows everything when asked, a run between phases included", async () => {
    renderPage(<PhaseHistory spells={SPELLS} />);

    await userEvent.click(screen.getByRole("button", { name: "Everything" }));

    expect(screen.getAllByTestId("phase-band")).toHaveLength(5);
    expect(screen.getByRole("list", { name: "The latest runs" })).toHaveTextContent(
      "Between phases",
    );
  });

  it("keeps the runs reaching into a span, and every run without one", () => {
    expect(spellsWithin(SPELLS, 5).map((one) => one.first)).toEqual(["2026-09-28"]);
    expect(spellsWithin(SPELLS, null)).toHaveLength(5);
    expect(spellsWithin([], 5)).toEqual([]);
  });
});
