/** Tests for turning breadth measures into readings. */

import { describe, expect, it } from "vitest";

import { describeOscillator, readings } from "./breadthReadings";
import { breadth, breadthSession } from "@/test/support";

/** The reading with a given label. */
function labelled(label: string, response = breadth()): ReturnType<typeof readings>[number] {
  const found = readings(response).find((reading) => reading.label === label);
  if (found === undefined) {
    throw new Error(`no reading called ${label}`);
  }
  return found;
}

describe("describeOscillator", () => {
  it("says a reading is absent rather than calling it neutral", () => {
    // Nought and "not enough sessions yet" are different things.
    expect(describeOscillator(null)).toBe("Needs 39 sessions");
  });

  it.each([
    [150, "Broadening sharply"],
    [20, "More stocks joining"],
    [-20, "Fewer stocks joining"],
    [-150, "Narrowing sharply"],
  ])("describes %s as %s", (reading, phrase) => {
    expect(describeOscillator(reading)).toBe(phrase);
  });
});

describe("readings", () => {
  it("has nothing to say before the reading arrives", () => {
    expect(readings(null)).toEqual([]);
  });

  it("reports the direction of the advance-decline line, not its level", () => {
    // Its level depends on when counting started, so it means nothing.
    expect(labelled("Advance–decline line").hint).toBe("Rising over 20 sessions");
    expect(labelled("Advance–decline line").tone).toBe("good");
  });

  it("calls a falling line bad news", () => {
    const falling = breadth({
      sessions: Array.from({ length: 30 }, (_unused, index) =>
        breadthSession({ advance_decline_line: String(1000 - index * 10) }),
      ),
    });

    expect(labelled("Advance–decline line", falling).tone).toBe("bad");
  });

  it("calls a line that went nowhere flat", () => {
    const flat = breadth({
      sessions: Array.from({ length: 30 }, () => breadthSession({ advance_decline_line: "1000" })),
    });

    expect(labelled("Advance–decline line", flat).hint).toBe("Flat");
  });

  it("will not call a direction from a single session", () => {
    const one = breadth({ sessions: [breadthSession()] });

    expect(labelled("Advance–decline line", one).hint).toBe("Not enough sessions");
  });

  it("marks a thrust against Zweig's own threshold", () => {
    expect(labelled("Breadth thrust", breadth({ breadth_thrust: "0.7" })).hint).toBe(
      "Above Zweig's 61.5% mark",
    );
    expect(labelled("Breadth thrust", breadth({ breadth_thrust: "0.3" })).hint).toBe(
      "Washed out, below 40%",
    );
    expect(labelled("Breadth thrust", breadth({ breadth_thrust: "0.5" })).hint).toBe(
      "Between 40% and 61.5%",
    );
  });

  it("reads a low Arms index as the healthy one", () => {
    // Inverted against every other measure here: below one means volume
    // went where the prices went.
    const heavy = breadth({ latest: breadthSession({ arms_index: "0.80" }) });
    const light = breadth({ latest: breadthSession({ arms_index: "1.40" }) });

    expect(labelled("Arms index (TRIN)", heavy).tone).toBe("good");
    expect(labelled("Arms index (TRIN)", light).tone).toBe("bad");
  });

  it("says a summation above nought is a broad market", () => {
    expect(labelled("McClellan summation", breadth({ mcclellan_summation: "-200" })).hint).toBe(
      "Participation narrow overall",
    );
    expect(labelled("McClellan summation").tone).toBe("good");
  });

  it("reads the high-low index against fifty", () => {
    expect(labelled("High–low index").hint).toBe("More new highs than lows");
    expect(labelled("High–low index", breadth({ high_low_index: "20" })).tone).toBe("bad");
  });

  it("shows a dash rather than a nought for a measure with too little history", () => {
    const young = breadth({
      mcclellan_oscillator: null,
      mcclellan_summation: null,
      breadth_thrust: null,
      high_low_index: null,
      latest: breadthSession({ arms_index: null }),
    });

    expect(readings(young).map((reading) => reading.value)).toEqual([
      "1,390",
      "—",
      "—",
      "—",
      "—",
      "—",
    ]);
    expect(
      readings(young).every(
        (reading) => reading.label === "Advance–decline line" || reading.tone === "neutral",
      ),
    ).toBe(true);
  });

  it("has nothing to say about volume when no session was counted", () => {
    expect(labelled("Arms index (TRIN)", breadth({ latest: null })).hint).toBe("No volume counted");
  });
});
