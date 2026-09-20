/** Tests for the scope picker. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScopePicker } from "./ScopePicker";
import { scopeOptions } from "@/test/support";

const COMPANIES = { kind: "companies" as const, key: null };

describe("ScopePicker", () => {
  it("puts the whole-market populations one click away", () => {
    render(<ScopePicker scope={COMPANIES} options={null} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Companies" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Indices" })).toBeInTheDocument();
  });

  it("pins a featured index the platform actually ranks", () => {
    render(<ScopePicker scope={COMPANIES} options={scopeOptions()} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Nifty 50" })).toBeInTheDocument();
  });

  it("leaves out a featured index with nothing to rank", () => {
    // India VIX is a headline index with no constituents: a card on the
    // overview, and never a population.
    render(<ScopePicker scope={COMPANIES} options={scopeOptions()} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "India VIX" })).not.toBeInTheDocument();
  });

  it("marks which population is showing", () => {
    render(<ScopePicker scope={COMPANIES} options={scopeOptions()} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Companies" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Indices" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the population that was chosen", async () => {
    const chosen = vi.fn();
    render(<ScopePicker scope={COMPANIES} options={scopeOptions()} onChange={chosen} />);

    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));

    expect(chosen).toHaveBeenCalledWith({ kind: "index", key: "NSE_INDEX|Nifty 50" });
  });

  it("still offers the long tail through the selector", async () => {
    // Several hundred indices and sectors belong in a list, not on the page.
    const chosen = vi.fn();
    render(<ScopePicker scope={COMPANIES} options={scopeOptions()} onChange={chosen} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    expect(chosen).toHaveBeenCalledWith({ kind: "sector", key: "IT - Software" });
  });
});
