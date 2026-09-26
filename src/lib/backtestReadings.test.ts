/** Tests for reading a backtest's equity and rules for a page. */

import { describe, expect, it } from "vitest";

import { growthLines, readRules } from "./backtestReadings";

describe("growthLines", () => {
  it("turns the equity and the benchmark into growth from the first close", () => {
    const lines = growthLines([
      { session: "2024-01-01", value: 1, invested: 0, benchmark: 1 },
      { session: "2024-01-02", value: 1.1, invested: 95, benchmark: null },
      { session: "2024-01-03", value: 1.21, invested: 95, benchmark: 1.05 },
    ]);

    const playbook = lines.playbook.map((point) => point.value);
    expect(playbook[0]).toBe(0);
    expect(playbook[1]).toBeCloseTo(10);
    expect(playbook[2]).toBeCloseTo(21);
    expect(lines.benchmark.map((point) => point.time)).toEqual(["2024-01-01", "2024-01-03"]);
    expect(lines.benchmark[1]?.value).toBeCloseTo(5);
  });
});

describe("readRules", () => {
  it("names each setting in reading order and leaves the defaults out", () => {
    const rules = readRules({
      name: "S",
      universe: "1",
      filter: "close > 10",
      entry: "1",
      rank: "ret(close, 252)",
      exit: null,
      regime: "nifty50 > sma(nifty50, 200)",
      slots: 20,
      rebalance: 21,
      rotate: true,
      stop: { kind: "none", value: 0, period: 14, horizon: 20, trailing: false },
      target: { kind: "none", value: 0, runner: null, portion: 1 },
      hold_sessions: null,
      cost_percent: 0.2,
    });

    expect(rules.map((rule) => [rule.label, rule.value])).toEqual([
      ["Filter", "close > 10"],
      ["Ranking", "ret(close, 252)"],
      ["Market regime", "nifty50 > sma(nifty50, 200)"],
      ["Slots", "20"],
      ["Rebalance", "every 21 sessions"],
      ["Cost per side", "0.2%"],
    ]);
    expect(rules[0]?.expression).toBe(true);
    expect(rules[3]?.expression).toBe(false);
  });

  it("says each kind of stop and target in words", () => {
    const said = (rules: Record<string, unknown>): string[] =>
      readRules({ rank: "close", ...rules }).map((rule) => rule.value);

    expect(said({ stop: { kind: "percent", value: 8, trailing: true } })).toContain(
      "8% below the entry, trailing the highest close",
    );
    expect(said({ stop: { kind: "atr", value: 3, period: 14, trailing: false } })).toContain(
      "3 × the 14-session average true range",
    );
    expect(said({ stop: { kind: "volatility", value: 1.28, horizon: 20 } })).toContain(
      "the low edge of a 20-session volatility band, z = 1.28",
    );
    expect(said({ target: { kind: "percent", value: 25, runner: null, portion: 1 } })).toContain(
      "25% above the entry",
    );
    expect(
      said({ target: { kind: "reward", value: 3, runner: "rank(close) > 0.9", portion: 0.5 } }),
    ).toContain(
      "3 × the risk to the stop (1:3); sells 50% there; runs on past it while rank(close) > 0.9",
    );
  });

  it("says a calendar rebalance, no rotation and a holding limit plainly", () => {
    const rules = readRules({
      rank: "close",
      rebalance: "quarterly",
      rotate: false,
      hold_sessions: 60,
    });

    expect(rules.map((rule) => rule.value)).toEqual([
      "close",
      "quarterly",
      "no: holdings stay until they leave by their own rules",
      "60 sessions",
    ]);
  });
});
