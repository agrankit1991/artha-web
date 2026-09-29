/** Tests for the named scans. */

import { describe, expect, it } from "vitest";

import { companySnapshot, overview, screenHit } from "@/test/support";

import {
  SCANS,
  SCAN_CATEGORIES,
  STRATEGY_SCANS,
  type Scan,
  type Screen,
  deliveryFromAnotherSession,
  findScan,
  scanPath,
  screenMatchesScan,
  switchPosition,
  writeScan,
} from "./scans";

/** A scan from the catalogue by key, failing the test when it is gone. */
function scan(key: string): Scan {
  const found = SCANS.find((one) => one.key === key);
  if (found === undefined) {
    throw new Error(`the ${key} scan is missing from the catalogue`);
  }
  return found;
}

/** A screen as a strategy's scan asks it, ready to be changed one way. */
function screenOf(one: Scan, change: Partial<Screen> = {}): Screen {
  return {
    conditions: one.conditions,
    sort: one.sort ?? null,
    order: "desc",
    scopeKind: "companies",
    ...change,
  };
}

describe("scans", () => {
  it("opens the screener on a scan's conditions, order and key", () => {
    expect(scanPath(scan("oversold-uptrend"))).toBe(
      "/screen?where=rsi%3Alt%3A35&where=from_sma_200_percent%3Agt%3A0&where=traded_value%3Agte%3A10&sort=traded_value&order=desc&scan=oversold-uptrend",
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
      "/screen?where=profit_ttm%3Agt%3A0&where=revenue_growth%3Agte%3A5&where=market_cap%3Agte%3A500&where=traded_value%3Agte%3A10&sort=traded_value&order=desc&scan=profitable-growing",
    );
  });

  it("finds a scan by the key an address names, and nothing for none or a stranger", () => {
    expect(findScan("momentum-12-1-near-high")?.strategy?.id).toBe("S0010");
    expect(findScan(null)).toBeUndefined();
    expect(findScan("no-such-scan")).toBeUndefined();
  });

  it("writes a scan over an address, keeping the population and an order it does not set", () => {
    const query = new URLSearchParams(
      "where=rsi:lt:30&scope_kind=index&scope_key=NSE_INDEX|Nifty 50&sort=rsi&order=asc",
    );
    writeScan(query, {
      key: "no-order",
      label: "No order",
      category: "Price",
      description: "A scan that leaves the order alone.",
      conditions: [{ field: "one_month", operator: "gt", value: "0" }],
    });

    expect(query.getAll("where")).toEqual(["one_month:gt:0"]);
    expect(query.get("scope_key")).toBe("NSE_INDEX|Nifty 50");
    expect(query.get("sort")).toBe("rsi");
    expect(query.get("order")).toBe("asc");
    expect(query.get("scan")).toBe("no-order");
  });

  it("writes a strategy's scan over the whole market, whatever population the address had", () => {
    const query = new URLSearchParams("scope_kind=index&scope_key=NSE_INDEX|Nifty 50");
    writeScan(query, scan("momentum-12-1-near-high"));

    expect(query.has("scope_kind")).toBe(false);
    expect(query.has("scope_key")).toBe(false);
    expect(query.get("scan")).toBe("momentum-12-1-near-high");
  });
});

describe("delivery from another session", () => {
  const surge = scan("volume-delivery-surge");
  /** A row whose figures are for 23 September, with the given delivery. */
  const row = (symbol: string, deliveredOn: string | null): ReturnType<typeof screenHit> =>
    screenHit({
      symbol,
      figures: overview({ as_of: "2026-09-23" }),
      snapshot: companySnapshot({ delivery_as_of: deliveredOn }),
    });

  it("finds the rows whose delivery is not their figures' session", () => {
    expect(
      deliveryFromAnotherSession(surge, [
        row("RELIANCE", "2026-09-22"),
        row("TCS", "2026-09-23"),
        row("INFY", "2026-09-24"),
      ]),
    ).toEqual([
      { symbol: "RELIANCE", session: "2026-09-23", deliveredOn: "2026-09-22" },
      { symbol: "INFY", session: "2026-09-23", deliveredOn: "2026-09-24" },
    ]);
  });

  it("passes over a row with no delivery reading, which is absent rather than late", () => {
    expect(
      deliveryFromAnotherSession(surge, [row("RELIANCE", null), screenHit({ snapshot: null })]),
    ).toEqual([]);
  });

  it("finds nothing for a scan that asks nothing of the day's delivery", () => {
    // The 20-session average is a standing, not one session's figure.
    expect(
      deliveryFromAnotherSession(scan("momentum-high-delivery"), [row("RELIANCE", "2026-09-22")]),
    ).toEqual([]);
  });
});

describe("strategies", () => {
  it("come first, in the lab's order, each filed as a strategy", () => {
    expect(SCAN_CATEGORIES[0]).toBe("Strategies");
    expect(STRATEGY_SCANS.map((one) => one.strategy.id)).toEqual([
      "S0010",
      "S0012",
      "S0006",
      "S0009",
      "S0003",
    ]);
    for (const one of SCANS) {
      expect(one.category === "Strategies").toBe(one.strategy !== undefined);
    }
    // The featured one is offered as a chip on the screener.
    expect(STRATEGY_SCANS.filter((one) => one.featured === true).map((one) => one.key)).toEqual([
      "momentum-12-1-near-high",
    ]);
  });

  it("asks each strategy's scan what the lab's rules ask", () => {
    const asked = Object.fromEntries(
      STRATEGY_SCANS.map((one) => [
        one.strategy.id,
        {
          conditions: one.conditions.map((it) => `${it.field} ${it.operator} ${it.value}`),
          sort: one.sort,
        },
      ]),
    );
    const liquid = ["market_cap gte 1000", "traded_value_average_20 gte 10"];

    expect(asked).toEqual({
      S0010: { conditions: ["from_high_percent gte -15", ...liquid], sort: "momentum_12_1" },
      S0012: { conditions: ["delivery_percent_average gte 50", ...liquid], sort: "one_year" },
      S0006: {
        conditions: [
          "relative_volume gte 2",
          "delivery_percent gte 50",
          "change_percent gt 0",
          ...liquid,
        ],
        sort: "relative_volume",
      },
      S0009: { conditions: liquid, sort: "return_per_volatility" },
      S0003: { conditions: liquid, sort: "one_year" },
    });
  });

  it("describes the liquidity filter as the lab measured it: before today", () => {
    const filter =
      "worth ₹1,000 Cr or more with a 20-session average value traded of at least ₹10 Cr, measured before today";
    for (const { description, strategy } of STRATEGY_SCANS) {
      expect(description).toContain(filter);
      expect(strategy.howItWorks.pick).toContain(filter);
    }
  });

  it("names the rows each holds by the figure it ranks on, and none while switched off", () => {
    const held = Object.fromEntries(
      STRATEGY_SCANS.map((one) => [one.strategy.id, one.strategy.rowsHeld]),
    );
    expect(held.S0012).toBe(
      "While the market switch is on, the 20 with the highest 1-year return on a re-pick day. While it is off, none of them: it holds gold.",
    );
    expect(held.S0009).toMatch(/highest 1-year return per unit of volatility on a re-pick day/);
    expect(held.S0003).toBe("The 20 with the highest 1-year return on a re-pick day.");
    expect(held.S0006).toMatch(/highest relative volume first/);
  });

  it("gives the market switch only to the strategies tested with one", () => {
    const switched = STRATEGY_SCANS.filter(
      (one) => one.strategy.howItWorks.marketSwitch !== undefined,
    ).map((one) => one.strategy.id);
    expect(switched).toEqual(["S0010", "S0012", "S0009"]);
  });
});

describe("the market switch", () => {
  it("is on above the band, off below it, and undecided inside it", () => {
    expect(switchPosition(2.01)).toBe("on");
    expect(switchPosition(2)).toBe("band");
    expect(switchPosition(0)).toBe("band");
    expect(switchPosition(-2)).toBe("band");
    expect(switchPosition(-2.01)).toBe("off");
  });
});

describe("a screen against its scan", () => {
  const nearHigh = scan("momentum-12-1-near-high");

  it("matches when it asks the same things, in any order and however a number is written", () => {
    expect(screenMatchesScan(screenOf(nearHigh), nearHigh)).toBe(true);
    const reordered = [...nearHigh.conditions]
      .reverse()
      .map((one) => (one.field === "market_cap" ? { ...one, value: "1000.0" } : one));
    expect(screenMatchesScan(screenOf(nearHigh, { conditions: reordered }), nearHigh)).toBe(true);
  });

  it("differs once a condition, the order or the population changes", () => {
    const [first, ...rest] = nearHigh.conditions;
    if (first === undefined) {
      throw new Error("the near-high scan has no conditions");
    }
    const loosened = [{ ...first, value: "-25" }, ...rest];
    expect(screenMatchesScan(screenOf(nearHigh, { conditions: loosened }), nearHigh)).toBe(false);
    expect(screenMatchesScan(screenOf(nearHigh, { conditions: rest }), nearHigh)).toBe(false);
    expect(screenMatchesScan(screenOf(nearHigh, { sort: "one_year" }), nearHigh)).toBe(false);
    expect(screenMatchesScan(screenOf(nearHigh, { order: "asc" }), nearHigh)).toBe(false);
    expect(screenMatchesScan(screenOf(nearHigh, { scopeKind: "index" }), nearHigh)).toBe(false);
  });

  it("ignores the order for a scan that does not set one", () => {
    const unordered: Scan = { ...nearHigh, key: "unordered" };
    delete unordered.sort;
    expect(screenMatchesScan(screenOf(unordered, { sort: "rsi", order: "asc" }), unordered)).toBe(
      true,
    );
  });
});
