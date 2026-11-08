import { describe, expect, it } from "vitest";

import type { CorporateAction } from "@/api/client";
import { actionMarkers } from "@/lib/chartMarkers";

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
