/** Tests for the colours charts draw with. */

import { describe, expect, it } from "vitest";

import { coloured, MOST_SERIES, SERIES_COLOURS } from "./chartPalette";

describe("coloured", () => {
  it("hands out the series colours in order", () => {
    const drawn = coloured([{ name: "first" }, { name: "second" }]);

    expect(drawn.map((one) => one.colour)).toEqual(SERIES_COLOURS.slice(0, 2));
  });

  it("colours as many series apart as there are colours", () => {
    const drawn = coloured(Array.from({ length: MOST_SERIES }, (_, index) => ({ index })));

    expect(new Set(drawn.map((one) => one.colour)).size).toBe(MOST_SERIES);
  });

  it("refuses one more than it can tell apart, rather than repeating the first", () => {
    // A repeated colour makes two lines one line to a reader.
    expect(() =>
      coloured(Array.from({ length: MOST_SERIES + 1 }, (_, index) => ({ index }))),
    ).toThrow(/fold the rest or split the chart/);
  });
});
