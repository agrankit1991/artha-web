/** Tests for turning the platform's bands into lines and words. */

import { describe, expect, it } from "vitest";

import { bandLines, drawnBand, longestRecord, methodName, middleHasSkill } from "./forecastBands";
import { bandRecord, priceBands } from "@/test/support";

describe("bandLines", () => {
  it("runs each line from the last close through every placed session", () => {
    const lines = bandLines(priceBands());

    expect(lines.high).toEqual([
      { time: "2026-09-10", value: 100 },
      { time: "2026-09-17", value: 106 },
      { time: "2026-10-08", value: 112 },
    ]);
    expect(lines.low.map((point) => point.value)).toEqual([100, 95, 90]);
    expect(lines.median.map((point) => point.value)).toEqual([100, 100.5, 101]);
  });

  it("leaves out a session the calendar could not place, or prices that will not parse", () => {
    const bands = priceBands({
      points: [
        { horizon: 5, session: null, low: "95", median: "100", high: "105" },
        { horizon: 10, session: "2026-09-24", low: "x", median: "100", high: "108" },
        { horizon: 20, session: "2026-10-08", low: "90", median: "101", high: "112" },
      ],
    });

    expect(bandLines(bands).high.map((point) => point.time)).toEqual(["2026-09-10", "2026-10-08"]);
  });

  it("draws nothing to start from when the close will not parse", () => {
    expect(bandLines(priceBands({ close: "n/a" })).low[0]?.time).toBe("2026-09-17");
  });
});

describe("drawnBand", () => {
  it("draws the middle flat at the close when it showed no skill", () => {
    expect(drawnBand(priceBands()).median.map((point) => point.value)).toEqual([100, 100, 100]);
  });

  it("follows the middle where it beat no change", () => {
    const skilled = priceBands({ records: [bandRecord({ median_error: 7.9, zero_error: 8.1 })] });

    expect(drawnBand(skilled).median.map((point) => point.value)).toEqual([100, 100.5, 101]);
  });

  it("draws the middle flat when there is no record to judge it by", () => {
    expect(drawnBand(priceBands({ records: [] })).median.at(-1)?.value).toBe(100);
  });

  it("has nothing to flatten when there is no close", () => {
    const bands = priceBands({ close: "n/a" });

    expect(drawnBand(bands).median).toEqual(bandLines(bands).median);
  });
});

describe("the record", () => {
  it("is the longest horizon's", () => {
    expect(longestRecord(priceBands())?.horizon).toBe(20);
    expect(longestRecord(priceBands({ records: [bandRecord({ horizon: 5 })] }))).toBeNull();
  });

  it("credits the middle only where it beat no change", () => {
    expect(middleHasSkill(bandRecord({ median_error: 8.0, zero_error: 8.1 }))).toBe(true);
    expect(middleHasSkill(bandRecord({ median_error: 8.1, zero_error: 8.1 }))).toBe(false);
  });
});

describe("methodName", () => {
  it("names each kind of model in words", () => {
    expect(methodName("volatility-cone")).toBe("each stock's own volatility (no AI)");
    expect(methodName("lightgbm-band")).toBe(
      "an AI model (LightGBM) reading the stock's own figures",
    );
    expect(methodName("lightgbm-band+market")).toBe(
      "an AI model (LightGBM) reading the stock's figures, market strength",
    );
    expect(methodName("lightgbm-band+market+sector")).toBe(
      "an AI model (LightGBM) reading the stock's figures, market strength and sector strength",
    );
    expect(methodName("har-scale")).toBe(
      "a volatility forecast (HAR) from each stock's own daily, weekly, monthly and yearly volatility (no AI)",
    );
    expect(methodName("har-scale+market")).toContain("India VIX");
    expect(methodName("something-new")).toBe("something-new");
  });
});
