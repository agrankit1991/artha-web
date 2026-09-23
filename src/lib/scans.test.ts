/** Tests for the named scans. */

import { describe, expect, it } from "vitest";

import { SCANS, SCAN_CATEGORIES, scanPath } from "./scans";

describe("scans", () => {
  it("opens the screener on a scan's conditions", () => {
    const rising = SCANS.find((scan) => scan.key === "rising");
    if (rising === undefined) {
      throw new Error("the rising scan is missing from the catalogue");
    }

    expect(scanPath(rising)).toBe(
      "/screen?where=from_sma_200_percent%3Agt%3A0&where=from_sma_50_percent%3Agt%3A0&where=one_month%3Agt%3A0",
    );
  });

  it("files every scan under a category the page shows, with a unique key", () => {
    for (const scan of SCANS) {
      expect(SCAN_CATEGORIES).toContain(scan.category);
    }
    expect(new Set(SCANS.map((scan) => scan.key)).size).toBe(SCANS.length);
  });

  it("carries a scan's order into the screener", () => {
    const growing = SCANS.find((scan) => scan.key === "profitable-growing");
    if (growing === undefined) {
      throw new Error("the profitable-and-growing scan is missing");
    }

    expect(scanPath(growing)).toBe(
      "/screen?where=profit_ttm%3Agt%3A0&where=revenue_growth%3Agte%3A5&sort=traded_value&order=desc",
    );
  });
});
