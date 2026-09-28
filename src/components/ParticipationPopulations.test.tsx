/** Tests for choosing the populations the participation heatmap compares. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Scope } from "@/components/ScopeSelector";
import { MOST_POPULATIONS } from "@/lib/participationPopulations";
import { scopeOptions } from "@/test/support";

import { ParticipationPopulations } from "./ParticipationPopulations";

const NIFTY: Scope = { kind: "index", key: "NSE_INDEX|Nifty 50" };
const BANK: Scope = { kind: "index", key: "NSE_INDEX|Nifty Bank" };
const MARKET: Scope = { kind: "companies", key: null };

function offer(
  populations: Scope[],
  onReset: (() => void) | null = null,
): { changed: ReturnType<typeof vi.fn> } {
  const changed = vi.fn();
  render(
    <ParticipationPopulations
      populations={populations}
      options={scopeOptions()}
      onChange={changed}
      onReset={onReset}
    />,
  );
  return { changed };
}

describe("ParticipationPopulations", () => {
  it("shows each population by name, in order", () => {
    offer([NIFTY, BANK, MARKET]);

    const chips = within(screen.getByRole("list", { name: "Populations" })).getAllByRole(
      "listitem",
    );
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Nifty 50",
      "Bank Nifty",
      "All companies",
    ]);
  });

  it("removes any population, the headline ones included", async () => {
    const { changed } = offer([NIFTY, BANK, MARKET]);

    await userEvent.click(screen.getByRole("button", { name: "Remove Bank Nifty" }));

    expect(changed).toHaveBeenCalledWith([NIFTY, MARKET]);
  });

  it("moves a population along, but not past either end", async () => {
    const { changed } = offer([NIFTY, BANK, MARKET]);

    await userEvent.click(screen.getByRole("button", { name: "Move Bank Nifty left" }));
    expect(changed).toHaveBeenLastCalledWith([BANK, NIFTY, MARKET]);

    await userEvent.click(screen.getByRole("button", { name: "Move Bank Nifty right" }));
    expect(changed).toHaveBeenLastCalledWith([NIFTY, MARKET, BANK]);

    expect(screen.getByRole("button", { name: "Move Nifty 50 left" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move All companies right" })).toBeDisabled();
  });

  it("adds a population at the end, offering only ones not already there", async () => {
    const { changed } = offer([NIFTY]);

    await userEvent.click(screen.getByRole("combobox", { name: "Add a population" }));
    expect(screen.queryByRole("option", { name: "Nifty 50" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    expect(changed).toHaveBeenCalledWith([NIFTY, { kind: "sector", key: "IT - Software" }]);
  });

  it("offers a way back to the headline indices only once they have been changed", () => {
    offer([NIFTY]);
    expect(screen.queryByRole("button", { name: /Reset/ })).not.toBeInTheDocument();
  });

  it("goes back to the headline indices on a reset", async () => {
    const reset = vi.fn();
    offer([NIFTY], reset);

    await userEvent.click(screen.getByRole("button", { name: "Reset to the headline indices" }));

    expect(reset).toHaveBeenCalled();
  });

  it("stops offering more once the heatmap carries all it can", () => {
    const many = Array.from({ length: MOST_POPULATIONS }, (_unused, index): Scope => ({
      kind: "sector",
      key: `Sector ${String(index)}`,
    }));

    offer(many);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText(/is the most one heatmap carries/)).toBeInTheDocument();
  });
});
