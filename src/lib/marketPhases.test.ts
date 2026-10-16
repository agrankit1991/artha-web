/** Tests for the market's phases and the strategies' categories in words. */

import { describe, expect, it } from "vitest";

import { NO_PHASE, SIGNALS, phaseLabel, riskBand, riskLabel } from "@/lib/marketPhases";

describe("marketPhases", () => {
  it("names each phase, and a session fitting none", () => {
    expect(phaseLabel("broad_rise")).toBe("Broad rise");
    expect(phaseLabel(null)).toBe(NO_PHASE);
  });

  it("bands a strategy by its deepest fall, either sign", () => {
    expect([riskBand(-24.9), riskBand(25), riskBand(-35), riskBand(-41.2), riskBand(null)]).toEqual(
      ["milder", "middle", "deeper", "deeper", null],
    );
    expect(riskLabel("middle")).toBe("Fall 25-35%");
    expect(riskLabel(null)).toBe("-");
  });

  it("reads a signal without its figures as a dash", () => {
    const empty = { value: null, reference: null, verdict: "neutral" } as const;
    expect(SIGNALS.trend.reads({ key: "trend", ...empty }, 10)).toBe("-");
    expect(SIGNALS.vix.reads({ key: "vix", ...empty }, 10)).toBe("-");
    expect(SIGNALS.breadth.reads({ key: "breadth", ...empty }, 10)).toBe("-");
    expect(SIGNALS.highs_lows.reads({ key: "highs_lows", ...empty }, 10)).toBe("-");
    expect(SIGNALS.short_breadth.reads({ key: "short_breadth", ...empty }, 10)).toBe("-");
    expect(SIGNALS.flows.reads({ key: "flows", ...empty }, 10)).toBe("Not held");
    expect(
      SIGNALS.breadth.reads({ key: "breadth", value: 41, reference: null, verdict: "neutral" }, 10),
    ).toBe("41%");
    expect(
      SIGNALS.short_breadth.reads(
        { key: "short_breadth", value: 22.3, reference: 17.9, verdict: "neutral" },
        10,
      ),
    ).toBe("22%, +4 points in two weeks");
    expect(
      SIGNALS.highs_lows.reads(
        { key: "highs_lows", value: 1, reference: null, verdict: "neutral" },
        10,
      ),
    ).toBe("1% at highs, - at lows");
    expect(
      SIGNALS.flows.reads({ key: "flows", value: 1250.4, reference: null, verdict: "up" }, 10),
    ).toBe("+Rs 1,250 crore over 10 sessions");
  });
});
