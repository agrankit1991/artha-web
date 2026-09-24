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
});
