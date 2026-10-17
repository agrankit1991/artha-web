/** Tests for ordering strategies best balanced first. */

import { describe, expect, it } from "vitest";

import { byBalance } from "@/lib/balance";

describe("byBalance", () => {
  it("puts the highest first, keeps ties and figureless rows in their order, the figureless last", () => {
    const rows = [
      { name: "unrun", balance: null },
      { name: "steep", balance: 0.7 },
      { name: "first tie", balance: 1.2 },
      { name: "missing", balance: undefined },
      { name: "second tie", balance: 1.2 },
      { name: "losing", balance: -0.4 },
    ];

    const ordered = byBalance(rows, (row) => row.balance).map((row) => row.name);

    expect(ordered).toEqual(["first tie", "second tie", "steep", "losing", "unrun", "missing"]);
    expect(rows[0]?.name).toBe("unrun");
  });
});
