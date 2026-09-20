/** Tests for the grid of populations. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BreadthGridPanel } from "./BreadthGridPanel";
import { breadthGrid, scopeBreadth } from "@/test/support";

describe("BreadthGridPanel", () => {
  it("shows each population's band beside its share", () => {
    render(<BreadthGridPanel scopes={breadthGrid().scopes} />);

    expect(screen.getByText("IT - Software")).toBeInTheDocument();
    expect(screen.getByText("Over-extended")).toBeInTheDocument();
    expect(screen.getByText("Risk-off")).toBeInTheDocument();
  });

  it("says which way a population turned, in points rather than per cent", () => {
    // A sector going from 50% to 60% has gained ten points and twenty per
    // cent, and saying the wrong one makes the column ambiguous.
    render(<BreadthGridPanel scopes={breadthGrid().scopes} />);

    expect(screen.getByText("+4.5 pp")).toBeInTheDocument();
    expect(screen.getByText("-8.2 pp")).toBeInTheDocument();
  });

  it("names the session a turn is measured from", () => {
    render(<BreadthGridPanel scopes={breadthGrid().scopes} comparedWith="2026-09-11" />);

    expect(screen.getByRole("button", { name: /Since 11 Sept? 2026/ })).toBeInTheDocument();
  });

  it("shortens an index key to what the index is called", () => {
    // The exchange segment in front of it is noise in a column of forty.
    render(<BreadthGridPanel scopes={[scopeBreadth({ scope_key: "NSE_INDEX|Nifty Bank" })]} />);

    expect(screen.getByText("Nifty Bank")).toBeInTheDocument();
  });

  it("shows a dash where a population has no turn to report", () => {
    // Nought would read as a population standing still.
    render(<BreadthGridPanel scopes={[scopeBreadth({ rotation: null, regime: null })]} />);

    const [, firstRow] = screen.getAllByRole("row");
    expect(within(firstRow as HTMLElement).getAllByText("—")).toHaveLength(2);
  });

  it("can be sorted by every figure in it", async () => {
    // Which sector is strongest, which is turning hardest, which has the
    // most companies behind the reading -- each is a column, and a column
    // that cannot be sorted cannot answer its own question.
    render(<BreadthGridPanel scopes={breadthGrid().scopes} comparedWith="2026-09-11" />);
    const headers = screen.getAllByRole("button");

    for (const header of headers) {
      await userEvent.click(header);
    }

    expect(headers.length).toBeGreaterThan(4);
    // The last column clicked is the count of companies behind each
    // reading, which sorts largest first: sixty-one against forty-two.
    const [, firstRow] = screen.getAllByRole("row");
    expect(firstRow?.textContent).toContain("Pharmaceuticals");
  });

  it("heads the turn column plainly when nothing was compared against", () => {
    render(<BreadthGridPanel scopes={breadthGrid().scopes} comparedWith={null} />);

    expect(screen.getByRole("button", { name: /Change/ })).toBeInTheDocument();
  });

  it("shows a dash where a population's share could not be taken", () => {
    render(<BreadthGridPanel scopes={[scopeBreadth({ above_sma_50: null })]} />);

    const [, firstRow] = screen.getAllByRole("row");
    expect(within(firstRow as HTMLElement).getAllByText("—")).toHaveLength(1);
  });

  it("does not offer a second control that sorts the same way", () => {
    // The band is read off the share, so sorting on it would order the
    // rows identically.
    render(<BreadthGridPanel scopes={breadthGrid().scopes} />);

    expect(screen.queryByRole("button", { name: /Regime/ })).not.toBeInTheDocument();
  });

  it("passes on the population that was chosen", async () => {
    const chosen = vi.fn();
    render(<BreadthGridPanel scopes={breadthGrid().scopes} onSelect={chosen} />);

    const [, firstRow] = screen.getAllByRole("row");
    await userEvent.click(firstRow as HTMLElement);

    expect(chosen).toHaveBeenCalledWith("IT - Software");
  });

  it("says nothing was counted rather than showing a blank table", () => {
    render(<BreadthGridPanel scopes={[]} />);

    expect(screen.getByText("Nothing counted for this kind of population")).toBeInTheDocument();
  });
});
