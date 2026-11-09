import { describe, expect, it } from "vitest";

import { amountChange, formatValue, periodLabel, plotted } from "./economy";

describe("periodLabel", () => {
  it("names a week by the Friday it is as on, a month by its name, a quarter by its months", () => {
    expect(periodLabel({ frequency: "weekly" }, "2026-10-30")).toBe("as on 30 Oct 2026");
    expect(periodLabel({ frequency: "monthly" }, "2026-09-30")).toMatch(/^Sept? 2026$/);
    expect(periodLabel({ frequency: "quarterly" }, "2026-06-30")).toBe("Apr-Jun 2026");
  });

  it("carries a quarter across the turn of the year from its own end", () => {
    expect(periodLabel({ frequency: "quarterly" }, "2027-03-31")).toBe("Jan-Mar 2027");
  });
});

describe("formatValue", () => {
  it("writes reserves in US$ billion, to one place", () => {
    expect(formatValue({ unit: "usd_million" }, "717056.000000")).toBe("US$ 717.1 bn");
  });

  it("writes a rate as published, without the stored zeros", () => {
    expect(formatValue({ unit: "percent" }, "5.540000")).toBe("5.54%");
    expect(formatValue({ unit: "percent" }, "5.000000")).toBe("5%");
    expect(formatValue({ unit: "index" }, "109.490000")).toBe("109.49");
  });
});

describe("amountChange", () => {
  it("gives an amount its change, and a rate none", () => {
    expect(amountChange({ unit: "usd_million" }, "717056", "719747")).toBe("-0.37");
    expect(amountChange({ unit: "percent" }, "5.54", "4.83")).toBeNull();
    expect(amountChange({ unit: "usd_million" }, "717056", undefined)).toBeNull();
    expect(amountChange({ unit: "usd_million" }, "717056", "0")).toBeNull();
  });
});

describe("plotted", () => {
  it("draws reserves in billions and everything else as it is", () => {
    expect(plotted({ unit: "usd_million" }, "717056")).toBe(717.056);
    expect(plotted({ unit: "percent" }, "5.54")).toBe(5.54);
  });
});
