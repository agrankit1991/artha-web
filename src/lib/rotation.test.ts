/** Tests for the arithmetic of a rotation replayed over time. */

import { describe, expect, it } from "vitest";

import { sectorRotation } from "@/test/support";

import { rotationPoints, rotationReach, rotationTrail } from "./rotation";

const PLOTTED_FROM = 10;

describe("rotationPoints", () => {
  it("places each sector plotted on a session, sized by the members measured that day", () => {
    const points = rotationPoints(sectorRotation(), 0, PLOTTED_FROM);

    expect(points).toEqual([
      { name: "Banks", href: "/sector/banks", week: 2, month: 5, companies: 40 },
      { name: "IT - Software", href: "/sector/it-software", week: 1, month: -2, companies: 30 },
    ]);
  });

  it("leaves out a sector on a session it was too thinly measured or not at all", () => {
    const thinned = sectorRotation({
      sectors: [
        {
          sector: "Banks",
          companies: 40,
          week: ["2.00", "1.00", "-1.50"],
          month: ["5.00", "4.00", "3.00"],
          measured: [40, 9, 40],
        },
        {
          sector: "IT - Software",
          companies: 30,
          week: ["1.00", null, "3.00"],
          month: ["-2.00", "-0.50", "1.50"],
          measured: [30, 30, 30],
        },
      ],
    });

    expect(rotationPoints(thinned, 1, PLOTTED_FROM)).toEqual([]);
    // A place past the last session reads as unmeasured, not as nought.
    expect(rotationPoints(thinned, 5, PLOTTED_FROM)).toEqual([]);
  });
});

describe("rotationReach", () => {
  it("reaches a tenth past the furthest plotted point of any session", () => {
    // Banks' month of 5 and software's week of 3; paper's 9s are too thin to count.
    expect(rotationReach(sectorRotation(), PLOTTED_FROM)).toEqual({
      month: 5 * 1.1,
      week: 3 * 1.1,
    });
  });

  it("never reaches under one per cent, so a still market is not magnified", () => {
    const still = sectorRotation({
      sectors: [
        {
          sector: "Banks",
          companies: 40,
          week: ["0.10"],
          month: ["-0.20"],
          measured: [40],
        },
      ],
      days: ["2026-09-18"],
    });

    expect(rotationReach(still, PLOTTED_FROM)).toEqual({ month: 1.1, week: 1.1 });
  });
});

describe("rotationTrail", () => {
  it("follows a sector up to the session chosen, as far back as asked", () => {
    const rotation = sectorRotation();

    expect(rotationTrail(rotation, "IT - Software", 2, 10, PLOTTED_FROM)).toEqual([
      { week: 1, month: -2 },
      { week: 2, month: -0.5 },
      { week: 3, month: 1.5 },
    ]);
    expect(rotationTrail(rotation, "IT - Software", 1, 1, PLOTTED_FROM)).toEqual([
      { week: 2, month: -0.5 },
    ]);
  });

  it("skips the sessions a sector was not plotted on, and knows no other sector", () => {
    const rotation = sectorRotation();

    expect(rotationTrail(rotation, "Paper", 2, 10, PLOTTED_FROM)).toEqual([]);
    expect(rotationTrail(rotation, "Gold", 2, 10, PLOTTED_FROM)).toEqual([]);
  });
});
