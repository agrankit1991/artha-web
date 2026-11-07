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
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  SeriesType,
} from "lightweight-charts";

import type { DrawingKind } from "@/api/client";
import { type Pixel, type Shape, isOn, shapeOf } from "@/lib/drawingGeometry";

/** A drawing as the layer paints it: in sessions and numbers, not the API's strings. */
export interface LaidDrawing {
  id: number;
  kind: DrawingKind;
  points: { day: string; price: number }[];
  colour: string;
  label: string | null;
}

/** How thick a drawing's line is, and how much thicker when chosen. */
const LINE = 1.5;
const CHOSEN = 2.5;

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
  pixelsOf(drawing: LaidDrawing): Pixel[] | null {
    if (this.chart === null || this.series === null) {
      return null;
    }
    const pixels: Pixel[] = [];
    for (const point of drawing.points) {
      const x = this.chart.timeScale().timeToCoordinate(point.day);
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
      context.lineWidth = drawing.id === this.chosen ? CHOSEN : LINE;
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
  }
}
