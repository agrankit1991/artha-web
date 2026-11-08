import { describe, expect, it } from "vitest";

import {
  dayAtLogical,
  distanceToSegment,
  isOn,
  logicalOfDay,
  measure,
  shapeOf,
  snapped,
} from "@/lib/drawingGeometry";

const W = 400;
const H = 200;

describe("shapeOf", () => {
  it("lays a horizontal across the plot, a ray from its point and a vertical top to bottom", () => {
    expect(shapeOf("horizontal", [{ x: 50, y: 80 }], W, H)).toEqual({
      kind: "segment",
      from: { x: 0, y: 80 },
      to: { x: 400, y: 80 },
    });
    expect(shapeOf("horizontal-ray", [{ x: 50, y: 80 }], W, H)).toEqual({
      kind: "segment",
      from: { x: 50, y: 80 },
      to: { x: 400, y: 80 },
    });
    expect(shapeOf("vertical", [{ x: 50, y: 80 }], W, H)).toEqual({
      kind: "segment",
      from: { x: 50, y: 0 },
      to: { x: 50, y: 200 },
    });
  });

  it("draws a trend between its points and a box between its corners", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 60, y: 40 },
    ];
    expect(shapeOf("trend", points, W, H)).toEqual({
      kind: "segment",
      from: points[0],
      to: points[1],
    });
    expect(shapeOf("rectangle", points, W, H)).toEqual({
      kind: "box",
      from: points[0],
      to: points[1],
    });
  });

  it("carries a ray on to the edge, and an extended line to both", () => {
    const points = [
      { x: 100, y: 100 },
      { x: 200, y: 50 },
    ];
    expect(shapeOf("ray", points, W, H)).toEqual({
      kind: "segment",
      from: { x: 100, y: 100 },
      to: { x: 300, y: 0 },
    });
    expect(shapeOf("extended", points, W, H)).toEqual({
      kind: "segment",
      from: { x: 0, y: 150 },
      to: { x: 300, y: 0 },
    });
    // Straight across and straight down reach the side and the bottom.
    expect(
      shapeOf(
        "ray",
        [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
        ],
        W,
        H,
      ),
    ).toMatchObject({ to: { x: 400, y: 10 } });
    expect(
      shapeOf(
        "ray",
        [
          { x: 10, y: 10 },
          { x: 10, y: 30 },
        ],
        W,
        H,
      ),
    ).toMatchObject({ to: { x: 10, y: 200 } });
    expect(
      shapeOf(
        "ray",
        [
          { x: 300, y: 10 },
          { x: 200, y: 10 },
        ],
        W,
        H,
      ),
    ).toMatchObject({ to: { x: 0, y: 10 } });
  });

  it("gives nothing without the points a kind takes, or for a ray with no direction", () => {
    expect(shapeOf("trend", [], W, H)).toBeNull();
    expect(shapeOf("trend", [{ x: 1, y: 1 }], W, H)).toBeNull();
    expect(shapeOf("rectangle", [{ x: 1, y: 1 }], W, H)).toBeNull();
    expect(
      shapeOf(
        "ray",
        [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
        W,
        H,
      ),
    ).toBeNull();
    expect(shapeOf("extended", [{ x: 1, y: 1 }], W, H)).toBeNull();
  });
});

describe("distanceToSegment and isOn", () => {
  it("measures to the nearest point of a segment, ends included", () => {
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
    expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });

  it("finds the pointer on a line or on a box's edge, not inside the box", () => {
    expect(
      isOn({ kind: "segment", from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }, { x: 50, y: 5 }),
    ).toBe(true);
    expect(
      isOn({ kind: "segment", from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }, { x: 50, y: 9 }),
    ).toBe(false);
    const box = { kind: "box" as const, from: { x: 0, y: 0 }, to: { x: 100, y: 100 } };
    expect(isOn(box, { x: 98, y: 50 })).toBe(true);
    expect(isOn(box, { x: 50, y: 50 })).toBe(false);
  });
});

describe("snapped", () => {
  it("goes to the nearest of the session's four prices, or stays without one", () => {
    const session = { open: 100, high: 110, low: 95, close: 105 };
    expect(snapped(108, session)).toBe(110);
    expect(snapped(96, session)).toBe(95);
    expect(snapped(103, session)).toBe(105);
    expect(snapped(103, null)).toBe(103);
  });

  it("goes only as far as the caller allows, so a point can stay clear of the bars", () => {
    const session = { open: 100, high: 110, low: 95, close: 105 };
    expect(snapped(150, session, () => false)).toBe(150);
    expect(snapped(108, session, (candidate) => candidate === 110)).toBe(110);
  });
});

describe("dayAtLogical and logicalOfDay", () => {
  // Tuesday 1 to Friday 4 September 2026.
  const DAYS = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];

  it("names a bar's day, and past either end a weekday counted on from it", () => {
    expect(dayAtLogical(DAYS, 2)).toBe("2026-09-03");
    expect(dayAtLogical(DAYS, 2.4)).toBe("2026-09-03");
    // The weekend skipped: Monday, then Tuesday.
    expect(dayAtLogical(DAYS, 4)).toBe("2026-09-07");
    expect(dayAtLogical(DAYS, 5)).toBe("2026-09-08");
    expect(dayAtLogical(DAYS, -1)).toBe("2026-08-31");
    expect(dayAtLogical(DAYS, -2)).toBe("2026-08-28");
    expect(dayAtLogical([], 3)).toBeNull();
  });

  it("places a day at its bar, the next bar after a hole, and past either end by weekdays", () => {
    expect(logicalOfDay(DAYS, "2026-09-03")).toBe(2);
    expect(logicalOfDay(["2026-09-01", "2026-09-03"], "2026-09-02")).toBe(1);
    expect(logicalOfDay(DAYS, "2026-09-08")).toBe(5);
    expect(logicalOfDay(DAYS, "2026-08-28")).toBe(-2);
    // A Sunday past the last bar is no weekday further on.
    expect(logicalOfDay(DAYS, "2026-09-06")).toBe(3);
    expect(logicalOfDay([], "2026-09-03")).toBeNull();
  });

  it("turns round: a day named past the end is placed where it was named", () => {
    for (const logical of [-3, 0, 3, 7, 12]) {
      const day = dayAtLogical(DAYS, logical);
      expect(day === null ? null : logicalOfDay(DAYS, day)).toBe(logical);
    }
  });
});

describe("measure", () => {
  it("reads the move in price and per cent and the sessions between", () => {
    expect(measure({ index: 10, price: 200 }, { index: 28, price: 230 })).toEqual({
      change: 30,
      percent: 15,
      sessions: 18,
    });
    expect(measure({ index: 5, price: 0 }, { index: 2, price: 10 })).toEqual({
      change: 10,
      percent: 0,
      sessions: 3,
    });
  });
});
