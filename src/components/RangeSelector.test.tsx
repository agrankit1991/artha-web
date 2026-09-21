/** Tests for choosing how much history to look at. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BREADTH_RANGES, PRICE_RANGES, RangeSelector } from "./RangeSelector";

describe("RangeSelector", () => {
  it("offers the spans it was given, in order", () => {
    render(<RangeSelector ranges={PRICE_RANGES} sessions={250} onChange={vi.fn()} />);

    const offered = screen.getAllByRole("button").map((button) => button.textContent);
    expect(offered).toEqual(["1M", "3M", "6M", "1Y", "5Y", "Max"]);
  });

  it("marks the span being shown", () => {
    render(<RangeSelector ranges={PRICE_RANGES} sessions={250} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "6M" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the span chosen, in sessions", async () => {
    const chosen = vi.fn();
    render(<RangeSelector ranges={PRICE_RANGES} sessions={250} onChange={chosen} />);

    await userEvent.click(screen.getByRole("button", { name: "3M" }));

    expect(chosen).toHaveBeenCalledWith(65);
  });

  it("asks for more than anything holds when the whole of it is wanted", async () => {
    // "Max" is the endpoint's ceiling rather than a guess at how much
    // history exists: instruments differ, and asking for more than one
    // has returns what it has.
    const chosen = vi.fn();
    render(<RangeSelector ranges={PRICE_RANGES} sessions={250} onChange={chosen} />);

    await userEvent.click(screen.getByRole("button", { name: "Max" }));

    expect(chosen).toHaveBeenCalledWith(12500);
  });

  it("names the choice for a reader who cannot see the buttons", () => {
    render(
      <RangeSelector ranges={BREADTH_RANGES} sessions={250} onChange={vi.fn()} label="Window" />,
    );

    expect(screen.getByRole("group", { name: "Window" })).toBeInTheDocument();
  });

  it("carries a different set of spans where a different set makes sense", () => {
    // A year of breadth and a year of prices are worth different amounts.
    render(<RangeSelector ranges={BREADTH_RANGES} sessions={250} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Max" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2Y" })).toBeInTheDocument();
  });

  it("presses nothing when the span showing is not one on offer", () => {
    // A page may hold a span this selector does not list -- a chart opened
    // at a length chosen elsewhere -- and pressing the nearest button
    // would claim a choice nobody made.
    render(<RangeSelector ranges={PRICE_RANGES} sessions={7} onChange={vi.fn()} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("takes a class from whoever placed it", () => {
    const { container } = render(
      <RangeSelector ranges={PRICE_RANGES} sessions={250} onChange={vi.fn()} className="ml-auto" />,
    );

    expect(container.firstChild).toHaveClass("ml-auto");
  });
});
