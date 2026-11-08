/**
 * The reader's drawings, painted on a chart's own canvas.
 *
 * A Lightweight Charts series primitive: attached to the price series, it is
 * asked to paint whenever the chart redraws, and asked whether the pointer is
 * on anything so the cursor can say so. What is painted where is worked out
 * by `shapeOf` and `isOn` (`src/lib/drawingGeometry.ts`); this only turns
 * sessions and prices into the plot's pixels, with the chart's own
 * converters, and strokes the result. Thin on purpose: a canvas cannot be
 * tested in jsdom, so nothing here decides anything worth testing apart.
 */

import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  Logical,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  SeriesType,
} from "lightweight-charts";

import type { DrawingKind } from "@/api/client";
import { type Pixel, type Shape, isOn, logicalOfDay, shapeOf } from "@/lib/drawingGeometry";

/** A drawing as the layer paints it: in sessions and numbers, not the API's strings. */
export interface LaidDrawing {
  id: number;
  kind: DrawingKind;
  points: { day: string; price: number }[];
  colour: string;
  /** Pixels: the drawing's own width, or every drawing's. */
  width: number;
  label: string | null;
}

/**
 * Something being drawn and not yet kept: a line or zone following the
 * pointer after its first point, or a measure (the owner, 2026-11-08: "can I
 * see in realtime the trendline or other tools as I am drawing it").
 */
export interface Sketch {
  kind: DrawingKind | "measure";
  points: { day: string; price: number }[];
  colour: string;
  width: number;
  /**
   * Written by it, on a card: a measure's reading. The card is the theme's
   * popover, resolved, and the words are in the sketch's own colour.
   */
  label: { text: string; card: string } | null;
}

/** How much thicker a drawing picked is drawn, so it reads as picked. */
const CHOSEN_EXTRA = 1;

/**
 * The layer itself. One per chart build: `Chart` rebuilds the chart when what
 * it draws changes, and the layer is attached again to the new one.
 */
export class DrawingLayer implements ISeriesPrimitive {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private drawings: LaidDrawing[] = [];
  private chosen: number | null = null;
  private sketched: Sketch | null = null;
  private readonly view: IPrimitivePaneView;

  /** Build the layer, with nothing to paint yet. */
  constructor() {
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => {
        target.useMediaCoordinateSpace(({ context, mediaSize }) => {
          this.paint(context, mediaSize.width, mediaSize.height);
        });
      },
    };
    this.view = { renderer: () => renderer };
  }

  /**
   * Take the chart and series it was attached to.
   *
   * @param param - What the library hands a primitive as it is attached.
   */
  attached(param: SeriesAttachedParameter): void {
    this.chart = param.chart;
    this.series = param.series;
    this.requestUpdate = param.requestUpdate;
  }

  /** Let go of the chart, as it is torn down. */
  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  /**
   * Paint these drawings from now on, one of them marked as chosen.
   *
   * @param drawings - What to paint.
   * @param chosen - The chosen drawing's identifier, or null.
   */
  show(drawings: LaidDrawing[], chosen: number | null): void {
    this.drawings = drawings;
    this.chosen = chosen;
    this.requestUpdate?.();
  }

  /**
   * Paint something being drawn over the drawings, or nothing.
   *
   * @param sketch - What, or null to take it away.
   */
  sketch(sketch: Sketch | null): void {
    this.sketched = sketch;
    this.requestUpdate?.();
  }

  /** What the library paints from. */
  paneViews(): readonly IPrimitivePaneView[] {
    return [this.view];
  }

  /**
   * Say whether the pointer is on a drawing, so the cursor shows it can be picked.
   *
   * @param x - The pointer's place across the plot.
   * @param y - Its place down the plot.
   * @returns The drawing under it, or null.
   */
  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const id = this.drawingAt({ x, y });
    return id === null ? null : { externalId: String(id), cursorStyle: "pointer", zOrder: "top" };
  }

  /**
   * Find the drawing at a spot, the last drawn first since it is on top.
   *
   * @param spot - The spot, in the plot's pixels.
   * @returns Its identifier, or null.
   */
  drawingAt(spot: Pixel): number | null {
    const size = this.size();
    for (const drawing of [...this.drawings].reverse()) {
      const shape = this.shapeFor(drawing, size.width, size.height);
      if (shape !== null && isOn(shape, spot)) {
        return drawing.id;
      }
    }
    return null;
  }

  /**
   * Turn a drawing's points into the plot's pixels.
   *
   * @param drawing - The drawing.
   * @returns Its points in pixels, or null when the chart cannot place one --
   *   a session outside every bar the chart holds, before it is attached.
   */
  pixelsOf(drawing: Pick<LaidDrawing, "points">): Pixel[] | null {
    if (this.chart === null || this.series === null) {
      return null;
    }
    const time = this.chart.timeScale();
    // A day with no bar -- past the last session, where a zone may be drawn
    // into the empty room, or a holiday -- is placed by its place in bars.
    let days: string[] | null = null;
    const pixels: Pixel[] = [];
    for (const point of drawing.points) {
      let x = time.timeToCoordinate(point.day);
      if (x === null) {
        days ??= this.series
          .data()
          .flatMap((one) => (typeof one.time === "string" ? [one.time] : []));
        const logical = logicalOfDay(days, point.day);
        x = logical === null ? null : time.logicalToCoordinate(logical as Logical);
      }
      const y = this.series.priceToCoordinate(point.price);
      if (x === null || y === null) {
        return null;
      }
      pixels.push({ x, y });
    }
    return pixels;
  }

  private size(): { width: number; height: number } {
    const element = this.chart?.chartElement();
    return { width: element?.clientWidth ?? 0, height: element?.clientHeight ?? 0 };
  }

  private shapeFor(drawing: LaidDrawing, width: number, height: number): Shape | null {
    const pixels = this.pixelsOf(drawing);
    return pixels === null ? null : shapeOf(drawing.kind, pixels, width, height);
  }

  private paint(context: CanvasRenderingContext2D, width: number, height: number): void {
    for (const drawing of this.drawings) {
      const shape = this.shapeFor(drawing, width, height);
      if (shape === null) {
        continue;
      }
      context.save();
      context.strokeStyle = drawing.colour;
      context.lineWidth = drawing.width + (drawing.id === this.chosen ? CHOSEN_EXTRA : 0);
      if (shape.kind === "box") {
        // A zone is filled faintly, so the prices inside it still read.
        context.globalAlpha = 0.12;
        context.fillStyle = drawing.colour;
        context.fillRect(
          shape.from.x,
          shape.from.y,
          shape.to.x - shape.from.x,
          shape.to.y - shape.from.y,
        );
        context.globalAlpha = 1;
        context.strokeRect(
          shape.from.x,
          shape.from.y,
          shape.to.x - shape.from.x,
          shape.to.y - shape.from.y,
        );
      } else {
        context.beginPath();
        context.moveTo(shape.from.x, shape.from.y);
        context.lineTo(shape.to.x, shape.to.y);
        context.stroke();
      }
      if (drawing.label !== null) {
        context.fillStyle = drawing.colour;
        context.font = "11px sans-serif";
        context.fillText(drawing.label, shape.from.x + 4, shape.from.y - 4);
      }
      context.restore();
    }
    this.paintSketch(context, width, height);
  }

  private paintSketch(context: CanvasRenderingContext2D, width: number, height: number): void {
    const sketch = this.sketched;
    const pixels = sketch === null ? null : this.pixelsOf(sketch);
    if (sketch === null || pixels === null) {
      return;
    }
    const shape = shapeOf(
      sketch.kind === "measure" ? "rectangle" : sketch.kind,
      pixels,
      width,
      height,
    );
    if (shape === null) {
      return;
    }
    context.save();
    context.strokeStyle = sketch.colour;
    context.fillStyle = sketch.colour;
    context.lineWidth = sketch.width;
    // Dashed until it is kept, so it reads as not drawn yet; a measure is
    // never kept, and is drawn whole.
    if (sketch.kind !== "measure") {
      context.setLineDash([5, 4]);
    }
    if (shape.kind === "box") {
      context.globalAlpha = sketch.kind === "measure" ? 0.18 : 0.12;
      context.fillRect(
        shape.from.x,
        shape.from.y,
        shape.to.x - shape.from.x,
        shape.to.y - shape.from.y,
      );
      context.globalAlpha = 1;
      context.strokeRect(
        shape.from.x,
        shape.from.y,
        shape.to.x - shape.from.x,
        shape.to.y - shape.from.y,
      );
    } else {
      context.beginPath();
      context.moveTo(shape.from.x, shape.from.y);
      context.lineTo(shape.to.x, shape.to.y);
      context.stroke();
    }
    if (sketch.label !== null) {
      // On a card by the pointer's end, so it reads over whatever lines it
      // lands on, held inside the plot.
      context.setLineDash([]);
      context.font = "600 12px sans-serif";
      const textWidth = context.measureText(sketch.label.text).width;
      const at = { x: Math.min(shape.to.x + 8, width - textWidth - 12), y: shape.to.y };
      context.fillStyle = sketch.label.card;
      context.fillRect(at.x, at.y - 10, textWidth + 10, 20);
      context.strokeRect(at.x, at.y - 10, textWidth + 10, 20);
      context.fillStyle = sketch.colour;
      context.fillText(sketch.label.text, at.x + 5, at.y + 4);
    }
    context.restore();
  }
}
