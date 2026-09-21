/** Tests for drawing a share card, against a context that records what it was asked. */

import { describe, expect, it } from "vitest";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardContext,
  type CardFacts,
  drawShareCard,
} from "./shareCard";

/** A context that remembers every call and property set. */
function recorder(): { context: CardContext; calls: string[]; texts: string[]; fills: string[] } {
  const calls: string[] = [];
  const texts: string[] = [];
  const fills: string[] = [];
  const gradient = { addColorStop: () => undefined } as unknown as CanvasGradient;
  const context: CardContext = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "miter",
    lineCap: "butt",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect: (...args) => {
      calls.push(`fillRect ${args.join(",")}`);
      fills.push(typeof context.fillStyle === "string" ? context.fillStyle : "gradient");
    },
    fillText: (text) => {
      texts.push(text);
    },
    beginPath: () => {
      calls.push("beginPath");
    },
    moveTo: (x, y) => {
      calls.push(`moveTo ${String(Math.round(x))},${String(Math.round(y))}`);
    },
    lineTo: (x, y) => {
      calls.push(`lineTo ${String(Math.round(x))},${String(Math.round(y))}`);
    },
    closePath: () => {
      calls.push("closePath");
    },
    stroke: () => {
      calls.push(
        `stroke ${typeof context.strokeStyle === "string" ? context.strokeStyle : "gradient"}`,
      );
    },
    fill: () => {
      calls.push("fill");
    },
    createLinearGradient: () => gradient,
  };
  return { context, calls, texts, fills };
}

function facts(overrides: Partial<CardFacts> = {}): CardFacts {
  return {
    title: "Reliance Industries",
    subtitle: "NSE: RELIANCE",
    price: "₹1,240.00",
    changePercent: 1.5,
    changeText: "+1.50%",
    points: [100, 110, 105, 120],
    asOf: "As of 16 Sep 2026",
    brand: "Artha Science",
    ...overrides,
  };
}

describe("drawShareCard", () => {
  it("paints the whole card, says every fact, and draws the month as a line", () => {
    const { context, calls, texts } = recorder();

    drawShareCard(context, facts());

    expect(calls[0]).toBe(`fillRect 0,0,${String(CARD_WIDTH)},${String(CARD_HEIGHT)}`);
    expect(texts).toEqual([
      "Reliance Industries",
      "NSE: RELIANCE",
      "₹1,240.00",
      "+1.50%",
      "As of 16 Sep 2026",
      "Artha Science",
    ]);
    // Four points: a filled area under the line, then a stroked line through them.
    expect(calls.filter((one) => one === "fill")).toHaveLength(1);
    expect(calls.filter((one) => one.startsWith("stroke"))).toHaveLength(1);
    expect(calls.filter((one) => one.startsWith("lineTo"))).toHaveLength(4 + 1 + 3);
    // The highest point sits at the top of the box and the lowest at its bottom.
    expect(calls).toContain("lineTo 1128,430");
    expect(calls).toContain("moveTo 72,550");
  });

  it("takes its tone from the sign of the move", () => {
    const up = recorder();
    drawShareCard(up.context, facts());
    expect(up.fills[1]).toBe("#22c55e");
    expect(up.calls.at(-1)).toBe("stroke #22c55e");

    const down = recorder();
    drawShareCard(down.context, facts({ changePercent: -2, changeText: "-2.00%" }));
    expect(down.fills[1]).toBe("#ef4444");

    const unknown = recorder();
    drawShareCard(unknown.context, facts({ changePercent: null, changeText: "—" }));
    expect(unknown.fills[1]).toBe("#a1a1aa");
  });

  it("draws no line for fewer than two points, and a flat one for a flat month", () => {
    const none = recorder();
    drawShareCard(none.context, facts({ points: [100] }));
    expect(none.calls.some((one) => one.startsWith("stroke"))).toBe(false);

    const flat = recorder();
    drawShareCard(flat.context, facts({ points: [100, 100, 100] }));
    expect(flat.calls.some((one) => one.startsWith("stroke"))).toBe(true);
    // Every point sits on the baseline: three in the area, its closing edge, two in the line.
    expect(
      flat.calls.filter((one) => one.startsWith("lineTo") && one.endsWith(",550")),
    ).toHaveLength(3 + 1 + 2);
  });
});
