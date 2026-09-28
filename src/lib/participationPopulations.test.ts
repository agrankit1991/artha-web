/** Tests for the populations the participation heatmap lays side by side. */

import { describe, expect, it } from "vitest";

import { participation, scopeOptions } from "@/test/support";

import {
  headlinePopulations,
  heatmapRows,
  populationHref,
  populationLabel,
} from "./participationPopulations";

const OPTIONS = scopeOptions({
  indices: [
    { key: "NSE_INDEX|Nifty 50", label: "Nifty 50" },
    { key: "NSE_INDEX|Nifty Bank", label: "Nifty Bank" },
    { key: "NSE_INDEX|India VIX", label: "India VIX" },
    { key: "NSE_INDEX|NIFTY IT", label: "NIFTY IT" },
  ],
  sectors: [{ key: "Pharmaceuticals", label: "Pharmaceuticals" }],
});

describe("headlinePopulations", () => {
  it("starts from the headline indices the platform counts, in their settled order", () => {
    // Which headlines qualify is the platform's answer, not a list kept
    // here: this one counts India VIX and not the Sensex, so they swap.
    expect(headlinePopulations(OPTIONS)).toEqual([
      { kind: "index", key: "NSE_INDEX|Nifty 50" },
      { kind: "index", key: "NSE_INDEX|Nifty Bank" },
      { kind: "index", key: "NSE_INDEX|India VIX" },
    ]);
  });

  it("has nothing to start from before the platform has said what it counts", () => {
    expect(headlinePopulations(null)).toEqual([]);
  });
});

describe("populationLabel", () => {
  it("calls a headline index by its short name rather than the exchange's", () => {
    expect(populationLabel({ kind: "index", key: "NSE_INDEX|Nifty Bank" }, OPTIONS)).toBe(
      "Bank Nifty",
    );
  });

  it("calls any other population what the platform calls it", () => {
    expect(populationLabel({ kind: "index", key: "NSE_INDEX|NIFTY IT" }, OPTIONS)).toBe("NIFTY IT");
    expect(populationLabel({ kind: "sector", key: "Pharmaceuticals" }, OPTIONS)).toBe(
      "Pharmaceuticals",
    );
  });

  it("falls back on the key before the platform has named it", () => {
    expect(populationLabel({ kind: "sector", key: "Cement" }, null)).toBe("Cement");
  });

  it("calls the whole populations what the selector calls them", () => {
    expect(populationLabel({ kind: "companies", key: null }, OPTIONS)).toBe("All companies");
    expect(populationLabel({ kind: "indices", key: null }, OPTIONS)).toBe("All indices");
  });
});

describe("populationHref", () => {
  it("leads an index or a sector to its own page", () => {
    expect(populationHref({ kind: "index", key: "NSE_INDEX|Nifty 50" })).toBe("/index/nifty-50");
    expect(populationHref({ kind: "sector", key: "Pharmaceuticals" })).toBe(
      "/sector/pharmaceuticals",
    );
  });

  it("leads the whole market nowhere, since this page is its page", () => {
    expect(populationHref({ kind: "companies", key: null })).toBeNull();
  });
});

describe("heatmapRows", () => {
  it("lays each population out as a row of the chosen average's shares, named from the answer", () => {
    const rows = heatmapRows(
      participation({
        populations: [
          {
            scope_kind: "sector",
            scope_key: "Pharmaceuticals",
            above_sma_20: ["10.0", null],
            above_sma_50: ["20.5", "30.0"],
            above_sma_200: ["40.0", "50.0"],
          },
        ],
      }),
      "above_sma_50",
      OPTIONS,
    );

    expect(rows).toEqual([
      {
        key: "sector:Pharmaceuticals",
        label: "Pharmaceuticals",
        href: "/sector/pharmaceuticals",
        shares: [20.5, 30],
      },
    ]);
  });

  it("has no rows before the platform has answered", () => {
    expect(heatmapRows(null, "above_sma_20", OPTIONS)).toEqual([]);
  });
});
