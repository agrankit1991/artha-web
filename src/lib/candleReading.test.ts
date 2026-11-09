import { describe, expect, it } from "vitest";

import { candleReadings, writtenChange } from "./candleReading";

const CANDLES = [
  { time: "2026-09-01", open: 100, high: 105, low: 99, close: 104 },
  { time: "2026-09-02", open: 104, high: 106, low: 101, close: 102 },
];

describe("candleReadings", () => {
  it("reads each session against the close before it, the first against none", () => {
    const readings = candleReadings(CANDLES);

    expect(readings.get("2026-09-01")).toEqual({
      open: 100,
      high: 105,
      low: 99,
      close: 104,
      change: null,
      percent: null,
    });
    const second = readings.get("2026-09-02");
    expect(second?.change).toBe(-2);
    expect(second?.percent).toBeCloseTo(-1.923, 3);
  });

  it("gives no per cent change after a close of nought", () => {
    const readings = candleReadings([
      { time: "2026-09-01", open: 0, high: 0, low: 0, close: 0 },
      { time: "2026-09-02", open: 1, high: 1, low: 1, close: 1 },
    ]);

    expect(readings.get("2026-09-02")).toMatchObject({ change: 1, percent: null });
  });
});

describe("writtenChange", () => {
  const price = (value: number): string => value.toFixed(2);

  it("signs a rise with a plus and a fall with a plain hyphen", () => {
    expect(writtenChange(5, 0.3333, price)).toBe("+5.00 (+0.33%)");
    expect(writtenChange(-2, -1.923, price)).toBe("-2.00 (-1.92%)");
    expect(writtenChange(0, 0, price)).toBe("0.00 (0.00%)");
    expect(writtenChange(-2, null, price)).toBe("-2.00");
  });
});
