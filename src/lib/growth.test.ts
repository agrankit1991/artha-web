/** Tests for compounded growth of reported figures. */

import { describe, expect, it } from "vitest";

import type { Statement } from "@/api/client";

import { growthOf } from "./growth";

function yearly(values: [string, string | null][]): Statement {
  return {
    statement: "INCOME_STATEMENT",
    basis: "CONSOLIDATED",
    frequency: "YEARLY",
    line_items: ["Revenue"],
    periods: values.map(([end, value]) => ({
      period_end: end,
      figures: value === null ? [] : [{ line_item: "Revenue", value, units: "crore" }],
    })),
  };
}

describe("growthOf", () => {
  it("compounds from the earliest period held to the latest, and says over how long", () => {
    const found = growthOf(
      yearly([
        ["2026-03-31", "1331"],
        ["2025-03-31", "1210"],
        ["2024-03-31", "1100"],
        ["2023-03-31", "1000"],
      ]),
      "Revenue",
    );

    expect(found?.years).toBe(3);
    // 1000 to 1331 over three years is 10% a year.
    expect(found?.compounded).toBeCloseTo(10);
    expect(found?.lastYear).toBeCloseTo(10);
  });

  it("gives no compound rate through a loss, which has none", () => {
    const found = growthOf(
      yearly([
        ["2026-03-31", "500"],
        ["2025-03-31", "-100"],
        ["2024-03-31", "-200"],
      ]),
      "Revenue",
    );

    expect(found?.compounded).toBeNull();
    expect(found?.lastYear).toBeNull();
  });

  it("needs two periods that report the figure", () => {
    expect(
      growthOf(
        yearly([
          ["2026-03-31", "1"],
          ["2025-03-31", null],
        ]),
        "Revenue",
      ),
    ).toBeNull();
    expect(growthOf(yearly([]), "Revenue")).toBeNull();
  });
});
