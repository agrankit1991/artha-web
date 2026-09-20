/** Tests for choosing which population the lists are ranked within. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScopeSelector } from "./ScopeSelector";
import { scopeOptions } from "@/test/support";

const MARKET = { kind: "companies", key: null } as const;

describe("ScopeSelector", () => {
  it("offers the whole populations before anything is loaded", async () => {
    // The market and the indices exist whether or not the platform has
    // answered yet, so the selector is never empty.
    render(<ScopeSelector scope={MARKET} options={null} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "All companies" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All indices" })).toBeInTheDocument();
  });

  it("offers each sector and index that has lists", async () => {
    render(<ScopeSelector scope={MARKET} options={scopeOptions()} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Nifty 50" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "IT - Software" })).toBeInTheDocument();
  });

  it("reports a chosen sector as a kind and a key", async () => {
    const chosen = vi.fn();
    render(<ScopeSelector scope={MARKET} options={scopeOptions()} onChange={chosen} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    expect(chosen).toHaveBeenCalledWith({ kind: "sector", key: "IT - Software" });
  });

  it("keeps an index key whole, however many separators it contains", async () => {
    // An index key is `NSE_INDEX|Nifty 50`, and splitting it on the wrong
    // character asks the platform for a scope that does not exist.
    const chosen = vi.fn();
    render(<ScopeSelector scope={MARKET} options={scopeOptions()} onChange={chosen} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Nifty 50" }));

    expect(chosen).toHaveBeenCalledWith({ kind: "index", key: "NSE_INDEX|Nifty 50" });
  });

  it("reports a whole population with no key at all", async () => {
    // The platform refuses a key on a scope that takes none, so sending an
    // empty string rather than nothing would turn the screen into a 422.
    const chosen = vi.fn();
    render(
      <ScopeSelector
        scope={{ kind: "sector", key: "IT - Software" }}
        options={scopeOptions()}
        onChange={chosen}
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "All indices" }));

    expect(chosen).toHaveBeenCalledWith({ kind: "indices", key: null });
  });

  it("leaves out a group the platform has nothing for", async () => {
    render(
      <ScopeSelector scope={MARKET} options={{ sectors: [], indices: [] }} onChange={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.queryByText("Sectors")).not.toBeInTheDocument();
    expect(screen.queryByText("Indices")).not.toBeInTheDocument();
  });
});
