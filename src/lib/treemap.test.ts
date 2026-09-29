/** Tests for the heatmap's layout, as arithmetic. */

import { describe, expect, it } from "vitest";

import { type Rect, squarify, squarifyGroups } from "./treemap";

const BOUNDS: Rect = { x: 0, y: 0, width: 6, height: 4 };

/** The example Bruls, Huizing and van Wijk work through, in a 6 by 4 box. */
const PAPER = [6, 6, 4, 3, 2, 2, 1].map((size, index) => ({ item: `v${String(index)}`, size }));

/** The area two rectangles share. */
function overlap(one: Rect, other: Rect): number {
  const across = Math.min(one.x + one.width, other.x + other.width) - Math.max(one.x, other.x);
  const down = Math.min(one.y + one.height, other.y + other.height) - Math.max(one.y, other.y);
  return Math.max(across, 0) * Math.max(down, 0);
}

describe("squarify", () => {
  it("gives every value its share of the area, inside the bounds, without overlap", () => {
    const placed = squarify(PAPER, BOUNDS);

    expect(placed).toHaveLength(7);
    // The sizes add to 24, the box's area, so each area is its size.
    for (const one of placed) {
      const size = PAPER.find((value) => value.item === one.item)?.size;
      expect(one.width * one.height).toBeCloseTo(size ?? Number.NaN, 9);
      expect(one.x).toBeGreaterThanOrEqual(0);
      expect(one.y).toBeGreaterThanOrEqual(0);
      expect(one.x + one.width).toBeLessThanOrEqual(6 + 1e-9);
      expect(one.y + one.height).toBeLessThanOrEqual(4 + 1e-9);
    }
    for (const [at, one] of placed.entries()) {
      for (const other of placed.slice(at + 1)) {
        expect(overlap(one, other)).toBeCloseTo(0, 9);
      }
    }
  });

  it("keeps the rectangles near square, where strips would be slivers", () => {
    const placed = squarify(PAPER, BOUNDS);
    const ratios = placed.map((one) => Math.max(one.width / one.height, one.height / one.width));

    // Worked by hand: the sixes a column 3 wide (1.5 : 1 each); the four
    // and three a row 7/3 tall (49 : 36 and 49 : 27); then the twos and the
    // one down the last 5/3 (25 : 18 twice, and 25 : 9 for the one). Cut
    // into strips across the six, the one would be a 16 : 1 sliver.
    const expected = [1.5, 1.5, 49 / 36, 49 / 27, 25 / 18, 25 / 18, 25 / 9];
    for (const [at, ratio] of ratios.entries()) {
      expect(ratio).toBeCloseTo(expected[at] ?? Number.NaN, 9);
    }
  });

  it("scales sizes of any unit to the room, largest first", () => {
    const placed = squarify(
      [
        { item: "small", size: 1_000 },
        { item: "large", size: 3_000 },
      ],
      { x: 10, y: 20, width: 100, height: 50 },
    );

    expect(placed.map((one) => one.item)).toEqual(["large", "small"]);
    expect(placed[0]?.width).toBeCloseTo(75, 9);
    expect(placed[0]?.x).toBe(10);
    expect(placed[1]?.x).toBeCloseTo(85, 9);
  });

  it("gives no room to nothing, or to nought and less", () => {
    expect(squarify([], BOUNDS)).toEqual([]);
    expect(squarify([{ item: "flat", size: 0 }], BOUNDS)).toEqual([]);
    expect(squarify([{ item: "a", size: 1 }], { ...BOUNDS, width: 0 })).toEqual([]);
    expect(
      squarify(
        [
          { item: "a", size: 2 },
          { item: "b", size: -1 },
        ],
        BOUNDS,
      ).map((one) => one.item),
    ).toEqual(["a"]);
  });

  it("lays a tall room's rows across its top", () => {
    const placed = squarify(
      [
        { item: "a", size: 1 },
        { item: "b", size: 1 },
      ],
      { x: 0, y: 0, width: 2, height: 8 },
    );

    expect(placed.map((one) => [one.x, one.y, one.width, one.height])).toEqual([
      [0, 0, 2, 4],
      [0, 4, 2, 4],
    ]);
  });
});

describe("squarifyGroups", () => {
  it("lays groups by their totals, then their values under a name strip", () => {
    const groups = squarifyGroups(
      [
        {
          group: "Banks",
          values: [
            { item: "HDFC", size: 3 },
            { item: "ICICI", size: 1 },
          ],
        },
        { group: "IT", values: [{ item: "TCS", size: 12 }] },
        { group: "Empty", values: [{ item: "Nil", size: 0 }] },
      ],
      { x: 0, y: 0, width: 160, height: 100 },
      10,
    );

    expect(groups.map((one) => one.group)).toEqual(["IT", "Banks"]);
    const [it, banks] = groups;
    // IT holds three quarters of the room.
    expect((it?.width ?? 0) * (it?.height ?? 0)).toBeCloseTo(12_000, 6);
    expect(it?.heading).toEqual({ x: 0, y: 0, width: 120, height: 10 });
    // Its values start under the strip.
    expect(it?.items[0]?.y).toBe(10);
    expect(banks?.items.map((one) => one.item)).toEqual(["HDFC", "ICICI"]);
  });

  it("gives a group too short for a strip none, and its values all of it", () => {
    const [only] = squarifyGroups(
      [{ group: "Thin", values: [{ item: "A", size: 1 }] }],
      { x: 0, y: 0, width: 100, height: 15 },
      10,
    );

    expect(only?.heading).toBeNull();
    expect(only?.items[0]).toMatchObject({ y: 0, height: 15 });
  });
});
