/** Tests for the layer that paints drawings on a chart's canvas. */

import type { SeriesAttachedParameter } from "lightweight-charts";
import { describe, expect, it, vi } from "vitest";

import { DrawingLayer, type LaidDrawing, type Sketch } from "./DrawingLayer";

/** Every September day, the sessions the chart holds. */
const SEPTEMBER = Array.from({ length: 30 }, (_, at) => ({
  time: `2026-09-${String(at + 1).padStart(2, "0")}`,
}));

/**
 * A chart and a series whose pixels are simple: day of month times ten,
 * price as is; past September a day is placed by its place in bars, until
 * forty bars on, where the scale ends.
 */
function attach(layer: DrawingLayer, update = vi.fn()): void {
  layer.attached({
    chart: {
      timeScale: () => ({
        timeToCoordinate: (day: string) =>
          day.startsWith("2026-09") ? Number(day.slice(8, 10)) * 10 : null,
        logicalToCoordinate: (logical: number) => (logical > 40 ? null : (logical + 1) * 10),
      }),
      chartElement: () => ({ clientWidth: 400, clientHeight: 200 }),
    },
    series: {
      priceToCoordinate: (price: number) => (price < 0 ? null : price),
      data: () => SEPTEMBER,
    },
    requestUpdate: update,
  } as unknown as SeriesAttachedParameter);
}

/** A canvas context that remembers what it was asked to do. */
function context(): Record<string, ReturnType<typeof vi.fn>> & Record<string, unknown> {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 60 })),
  };
}

function paint(layer: DrawingLayer): ReturnType<typeof context> {
  const drawn = context();
  const [view] = layer.paneViews();
  view?.renderer()?.draw({
    useMediaCoordinateSpace: (paintWith: (scope: unknown) => void) => {
      paintWith({ context: drawn, mediaSize: { width: 400, height: 200 } });
    },
  } as never);
  return drawn;
}

const SUPPORT: LaidDrawing = {
  id: 1,
  kind: "horizontal",
  points: [{ day: "2026-09-05", price: 120 }],
  colour: "#2563eb",
  width: 1.5,
  label: "Support",
};
const ZONE: LaidDrawing = {
  id: 2,
  kind: "rectangle",
  points: [
    { day: "2026-09-02", price: 40 },
    { day: "2026-09-08", price: 90 },
  ],
  colour: "#22c55e",
  width: 3,
  label: null,
};

describe("DrawingLayer", () => {
  it("paints a line across the plot with its label, and a zone filled and outlined", () => {
    const layer = new DrawingLayer();
    const update = vi.fn();
    attach(layer, update);
    layer.show([SUPPORT, ZONE], 1);
    expect(update).toHaveBeenCalled();

    const drawn = paint(layer);

    expect(drawn.moveTo).toHaveBeenCalledWith(0, 120);
    expect(drawn.lineTo).toHaveBeenCalledWith(400, 120);
    expect(drawn.fillText).toHaveBeenCalledWith("Support", 4, 116);
    expect(drawn.fillRect).toHaveBeenCalledWith(20, 40, 60, 50);
    expect(drawn.strokeRect).toHaveBeenCalledWith(20, 40, 60, 50);
    // The last painted, the zone, at its own width.
    expect(drawn.lineWidth).toBe(3);
  });

  it("paints a drawing at its own width, a pixel thicker while it is picked", () => {
    const layer = new DrawingLayer();
    attach(layer);

    layer.show([SUPPORT], 1);
    expect(paint(layer).lineWidth).toBe(2.5);
    layer.show([SUPPORT], null);
    expect(paint(layer).lineWidth).toBe(1.5);
  });

  it("says which drawing the pointer is on, the latest drawn first", () => {
    const layer = new DrawingLayer();
    attach(layer);
    layer.show([SUPPORT, ZONE], null);

    expect(layer.hitTest(200, 122)).toEqual({
      externalId: "1",
      cursorStyle: "pointer",
      zOrder: "top",
    });
    expect(layer.drawingAt({ x: 20, y: 60 })).toBe(2);
    expect(layer.hitTest(200, 10)).toBeNull();
  });

  it("paints nothing it cannot place, and nothing before it is attached or after", () => {
    const layer = new DrawingLayer();
    layer.show([SUPPORT], null);
    expect(layer.pixelsOf(SUPPORT)).toBeNull();
    expect(layer.drawingAt({ x: 0, y: 120 })).toBeNull();

    attach(layer);
    const offPlot: LaidDrawing = { ...SUPPORT, id: 3, points: [{ day: "2027-06-01", price: 1 }] };
    const offScale: LaidDrawing = { ...SUPPORT, id: 4, points: [{ day: "2026-09-01", price: -1 }] };
    const lone: LaidDrawing = { ...ZONE, id: 5, points: [{ day: "2026-09-01", price: 1 }] };
    layer.show([offPlot, offScale, lone], null);
    const drawn = paint(layer);
    expect(drawn.save).not.toHaveBeenCalled();

    layer.detached();
    expect(layer.pixelsOf(SUPPORT)).toBeNull();
  });

  it("places a day past the last session by its place in bars, as the empty room is", () => {
    const layer = new DrawingLayer();
    attach(layer);
    // Thursday 1 October, a weekday after Wednesday 30 September: one bar on.
    expect(layer.pixelsOf({ points: [{ day: "2026-10-01", price: 50 }] })).toEqual([
      { x: 310, y: 50 },
    ]);
  });
});

describe("DrawingLayer, sketches", () => {
  const LINE: Sketch = {
    kind: "trend",
    points: [
      { day: "2026-09-02", price: 40 },
      { day: "2026-09-08", price: 90 },
    ],
    colour: "#2563eb",
    width: 2,
    label: null,
  };

  it("paints a line being drawn dashed, over the drawings, and takes it away", () => {
    const layer = new DrawingLayer();
    const update = vi.fn();
    attach(layer, update);

    layer.sketch(LINE);
    expect(update).toHaveBeenCalled();
    const drawn = paint(layer);
    expect(drawn.setLineDash).toHaveBeenCalledWith([5, 4]);
    expect(drawn.moveTo).toHaveBeenCalledWith(20, 40);
    expect(drawn.lineTo).toHaveBeenCalledWith(80, 90);

    layer.sketch(null);
    expect(paint(layer).save).not.toHaveBeenCalled();
  });

  it("paints a measure as a band with its reading on a card, not dashed", () => {
    const layer = new DrawingLayer();
    attach(layer);
    layer.sketch({
      ...LINE,
      kind: "measure",
      label: { text: "+12.00% · +12.00 · 6 sessions", card: "#ffffff" },
    });

    const drawn = paint(layer);
    expect(drawn.setLineDash).not.toHaveBeenCalledWith([5, 4]);
    expect(drawn.fillRect).toHaveBeenCalledWith(20, 40, 60, 50);
    expect(drawn.fillText).toHaveBeenCalledWith("+12.00% · +12.00 · 6 sessions", 93, 94);
  });

  it("paints a box being drawn filled, and nothing it cannot place or give a direction", () => {
    const layer = new DrawingLayer();
    attach(layer);
    layer.sketch({ ...LINE, kind: "rectangle" });
    expect(paint(layer).fillRect).toHaveBeenCalledWith(20, 40, 60, 50);

    layer.sketch({ ...LINE, points: [{ day: "2026-09-02", price: -1 }] });
    expect(paint(layer).save).not.toHaveBeenCalled();
    layer.sketch({
      ...LINE,
      kind: "ray",
      points: [LINE.points[0], LINE.points[0]] as Sketch["points"],
    });
    expect(paint(layer).save).not.toHaveBeenCalled();
  });
});
