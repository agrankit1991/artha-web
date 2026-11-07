import { describe, expect, it } from "vitest";

import type { BacktestTrade, CorporateAction } from "@/api/client";
import { actionMarkers, tradeMarkers } from "@/lib/chartMarkers";

function sale(overrides: Partial<BacktestTrade> = {}): BacktestTrade {
  return {
    instrument_key: "NSE_EQ|A",
    symbol: "A",
    entered: "2026-01-05",
    exited: "2026-02-10",
    entry_price: 100,
    exit_price: 110,
    sessions: 25,
    reason: "stop",
    gain_percent: 10,
    portion: 1,
    ...overrides,
  };
}

function action(kind: CorporateAction["kind"], label: string): CorporateAction {
  return {
    kind,
    label,
    ex_date: "2026-03-01",
    record_date: null,
    announced_on: null,
    amount: null,
    ratio: null,
  };
}

describe("tradeMarkers", () => {
  it("marks one buy per purchase, though it was sold in parts, and each sale by its outcome", () => {
    const marks = tradeMarkers([
      sale({ exited: "2026-02-10", reason: "target", gain_percent: 12 }),
      sale({ exited: "2026-03-10", reason: "stop", gain_percent: -4 }),
    ]);

    expect(marks).toEqual([
      { time: "2026-01-05", position: "below", shape: "up", tone: "gain", text: "Buy" },
      { time: "2026-02-10", position: "above", shape: "down", tone: "gain", text: "Sell: Target" },
      { time: "2026-03-10", position: "above", shape: "down", tone: "loss", text: "Sell: Stop" },
    ]);
  });

  it("names a sale whose reason has no word by the reason itself, and an even one a gain", () => {
    const [, sold] = tradeMarkers([sale({ reason: "mystery", gain_percent: 0 })]);
    expect(sold).toMatchObject({ text: "Sell: mystery", tone: "gain" });
  });
});

describe("actionMarkers", () => {
  it("marks bonuses, splits and rights, not dividends", () => {
    const marks = actionMarkers([
      action("BONUS", "Bonus 1:1"),
      action("DIVIDEND", "Dividend"),
      action("SPLIT", "Split 10 to 2"),
      action("RIGHTS", "Rights 1:5"),
      action("OTHER", "Something"),
    ]);
    expect(marks.map((one) => one.text)).toEqual(["Bonus 1:1", "Split 10 to 2", "Rights 1:5"]);
    expect(marks[0]).toEqual({
      time: "2026-03-01",
      position: "above",
      shape: "circle",
      tone: "neutral",
      text: "Bonus 1:1",
    });
  });
});
