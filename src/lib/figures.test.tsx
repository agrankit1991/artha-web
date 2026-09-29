/** Tests for reading and writing a screenable figure. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ScreenField } from "@/api/client";
import { companySnapshot, overview } from "@/test/support";

import { valueOf, writtenFigure } from "./figures";

function field(overrides: Partial<ScreenField>): ScreenField {
  return {
    name: "x",
    label: "X",
    group: "G",
    unit: "price",
    record: "figures",
    path: ["day", "close"],
    ...overrides,
  };
}

const STANDING = companySnapshot();

describe("figures", () => {
  it("reads a field from the record it names", () => {
    const figures = overview();

    expect(valueOf(field({}), { figures })).toBe(figures.day.close);
    expect(
      valueOf(field({ record: "snapshot", path: ["profit_ttm"] }), { figures, snapshot: STANDING }),
    ).toBe("79020.00");
    // Before the nightly snapshot has the company, its standing is absent.
    expect(
      valueOf(field({ record: "snapshot", path: ["pe"] }), { figures, snapshot: null }),
    ).toBeNull();
  });

  it("writes crore whole, ratios to two places, scores whole and ranks with a hash", () => {
    render(
      <ul>
        <li>{writtenFigure(field({ unit: "crore" }), "1678254.55")}</li>
        <li>{writtenFigure(field({ unit: "ratio" }), "24.3")}</li>
        <li>{writtenFigure(field({ unit: "score" }), 72)}</li>
        <li>{writtenFigure(field({ unit: "rank" }), 1)}</li>
      </ul>,
    );

    expect(screen.getByText("16,78,255")).toBeInTheDocument();
    expect(screen.getByText("24.30")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("writes a per-cent figure as a move, a distance or a size, by what it is", () => {
    render(
      <div>
        <span data-testid="move">
          {writtenFigure(field({ name: "one_month", unit: "percent" }), "-5.55")}
        </span>
        <span data-testid="distance">
          {writtenFigure(field({ name: "from_high_percent", unit: "percent" }), "-23.00")}
        </span>
        <span data-testid="size">
          {writtenFigure(field({ name: "volatility_year", unit: "percent" }), "21.12")}
        </span>
      </div>,
    );

    // A move carries its colour and sign.
    expect(screen.getByTestId("move").querySelector(".text-loss")).not.toBeNull();
    // A distance keeps its sign but not the colour of a fall.
    expect(screen.getByTestId("distance")).toHaveTextContent("-23.00%");
    expect(screen.getByTestId("distance").querySelector(".text-loss")).toBeNull();
    // A size has neither: a volatility of 21% did not rise.
    expect(screen.getByTestId("size")).toHaveTextContent(/^21.12%$/);
  });
});
