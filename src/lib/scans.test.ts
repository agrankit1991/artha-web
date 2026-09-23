/** Tests for the named scans. */

import { describe, expect, it } from "vitest";

import { SCANS, SCAN_CATEGORIES, type Scan, scanPath } from "./scans";

/** A scan from the catalogue by key, failing the test when it is gone. */
function scan(key: string): Scan {
  const found = SCANS.find((one) => one.key === key);
  if (found === undefined) {
    throw new Error(`the ${key} scan is missing from the catalogue`);
  }
  return found;
}

describe("scans", () => {
  it("opens the screener on a scan's conditions and order", () => {
    expect(scanPath(scan("oversold-uptrend"))).toBe(
      "/screen?where=rsi%3Alt%3A35&where=from_sma_200_percent%3Agt%3A0&where=traded_value%3Agte%3A10&sort=traded_value&order=desc",
    );
  });

  it("asks the momentum scan everything the owner asked of it", () => {
    const momentum = scan("momentum-swing");
    const asked = momentum.conditions.map((one) => `${one.field} ${one.operator} ${one.value}`);

    expect(asked).toEqual([
      "from_sma_20_percent gt 0",
      "from_sma_20_percent lte 5",
      "from_sma_50_percent gt 0",
      "from_sma_200_percent gt 0",
      "rsi gt 50",
      "rising_swings eq 1",
      "from_swing_low_percent lte 7",
      "relative_volume gte 1",
      "profit_ttm gt 0",
      "market_cap gte 100",
      "traded_value gte 50",
    ]);
    expect(momentum.sort).toBe("traded_value");
  });

  it("files every scan under a category the page shows, with a unique key", () => {
    for (const scan of SCANS) {
      expect(SCAN_CATEGORIES).toContain(scan.category);
    }
    expect(new Set(SCANS.map((scan) => scan.key)).size).toBe(SCANS.length);
  });

  it("carries a scan's order into the screener", () => {
    expect(scanPath(scan("profitable-growing"))).toBe(
      "/screen?where=profit_ttm%3Agt%3A0&where=revenue_growth%3Agte%3A5&where=market_cap%3Agte%3A500&where=traded_value%3Agte%3A10&sort=traded_value&order=desc",
    );
  });
});
