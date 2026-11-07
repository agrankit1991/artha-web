/** Tests for the layer that paints drawings on a chart's canvas. */

import type { SeriesAttachedParameter } from "lightweight-charts";
import { describe, expect, it, vi } from "vitest";

import { DrawingLayer, type LaidDrawing } from "./DrawingLayer";

/** A chart and a series whose pixels are simple: day of month times ten, price as is. */
function attach(layer: DrawingLayer, update = vi.fn()): void {
  layer.attached({
    chart: {
      timeScale: () => ({
        timeToCoordinate: (day: string) =>
          day === "2026-10-01" ? null : Number(day.slice(8, 10)) * 10,
      }),
      chartElement: () => ({ clientWidth: 400, clientHeight: 200 }),
    },
    series: { priceToCoordinate: (price: number) => (price < 0 ? null : price) },
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
    // The chosen drawing is drawn thicker.
    expect(drawn.lineWidth).toBe(1.5);
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
    const offPlot: LaidDrawing = { ...SUPPORT, id: 3, points: [{ day: "2026-10-01", price: 1 }] };
    const offScale: LaidDrawing = { ...SUPPORT, id: 4, points: [{ day: "2026-09-01", price: -1 }] };
    const lone: LaidDrawing = { ...ZONE, id: 5, points: [{ day: "2026-09-01", price: 1 }] };
    layer.show([offPlot, offScale, lone], null);
    const drawn = paint(layer);
    expect(drawn.save).not.toHaveBeenCalled();

    layer.detached();
    expect(layer.pixelsOf(SUPPORT)).toBeNull();
  });
});
