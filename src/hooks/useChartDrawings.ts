/**
 * Drawing on a chart: choosing a tool, placing its points, picking a drawing,
 * dragging it, and keeping it on the platform.
 *
 * One instrument's drawings, the reader's own, shown wherever that instrument
 * is charted (owner's choice, 2026-11-08). The chart is rebuilt whenever what
 * it draws changes, so what this hands it (`decorate`) never changes itself:
 * it reads the tool and the drawings through refs, and new drawings reach the
 * canvas through the layer (`DrawingLayer.show`), which only repaints. While
 * a drawing is held the chart's own dragging and zooming are paused, or
 * moving a line would also scroll the chart under it.
 *
 * The arithmetic -- where a ray meets the edge, whether the pointer is on a
 * line, the magnet, a measure -- is `src/lib/drawingGeometry.ts`.
 */

import type { IChartApi, ISeriesApi, MouseEventParams, SeriesType } from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChartDrawing, DrawingChange, DrawingKind, LineStyleChange } from "@/api/client";
import {
  createDrawing,
  deleteDrawing,
  deleteDrawings,
  fetchDrawings,
  updateDrawing,
} from "@/api/client";
import { DrawingLayer, type LaidDrawing } from "@/components/DrawingLayer";
import { useResource } from "@/hooks/useResource";
import { type Measure, POINTS, type Pixel, measure, snapped } from "@/lib/drawingGeometry";
import { useLineStyles } from "@/lib/lineStyles";
import { tokenColour } from "@/lib/tokenColour";

/** A tool: a kind of drawing to place, or a measure that is read and not kept. */
export type DrawingTool = DrawingKind | "measure";

/** A point placed so far: its session, its price, and its place among the sessions. */
interface Placed {
  day: string;
  price: number;
  index: number;
}

/** Everything a toolbar shows and does. */
export interface ChartDrawings {
  /** Whether there is an instrument to draw on at all. */
  enabled: boolean;
  tool: DrawingTool | null;
  chooseTool: (tool: DrawingTool | null) => void;
  /** How many points the tool still wants. */
  remaining: number;
  magnet: boolean;
  setMagnet: (on: boolean) => void;
  hidden: boolean;
  setHidden: (on: boolean) => void;
  /** The drawing picked, or null. */
  chosen: ChartDrawing | null;
  /** The last measure taken, or null. */
  reading: Measure | null;
  count: number;
  problem: string | null;
  /** Lock a drawing against dragging, or unlock it. */
  lock: (drawing: ChartDrawing, locked: boolean) => void;
  /** Give a drawing a colour or width of its own, or (null) every drawing's again. */
  restyle: (drawing: ChartDrawing, change: LineStyleChange) => void;
  /** Delete one drawing. */
  remove: (drawing: ChartDrawing) => void;
  deleteAll: () => Promise<void>;
  /** What the chart is decorated with on each build. Stable. */
  decorate: (
    chart: IChartApi,
    price: ISeriesApi<SeriesType> | undefined,
  ) => (() => void) | undefined;
}

/**
 * A drawing as it is, to change one part of: every part is sent with a
 * change, and one left out (its width, say) would be reset.
 *
 * @param drawing - The drawing.
 * @returns Its points, label, colour, width and lock.
 */
function kept(drawing: ChartDrawing): DrawingChange {
  return {
    points: drawing.points,
    label: drawing.label,
    colour: drawing.colour,
    width: drawing.width,
    locked: drawing.locked,
  };
}

/** The pointer's spot on the plot, as the browser reports it. */
function spotOf(event: PointerEvent): Pixel {
  return { x: event.offsetX, y: event.offsetY };
}

/** Fields whose keys are the reader's typing, not a request to delete. */
const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Draw on an instrument's chart.
 *
 * @param instrumentKey - The instrument, or null for a chart nothing is drawn on.
 * @returns The state and the actions a toolbar needs, and the chart's decoration.
 */
export function useChartDrawings(instrumentKey: string | null): ChartDrawings {
  const load = useCallback(
    () => (instrumentKey === null ? Promise.resolve([]) : fetchDrawings(instrumentKey)),
    [instrumentKey],
  );
  const stored = useResource(load);
  const drawings = useMemo(() => stored.data ?? [], [stored.data]);
  const [tool, setTool] = useState<DrawingTool | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [magnet, setMagnet] = useState(true);
  const [hidden, setHidden] = useState(false);
  const look = useLineStyles().drawn("drawing");
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [reading, setReading] = useState<Measure | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // What the chart's own handlers read when they fire, which is after the
  // render that set them: the decoration is built once and never rebuilt.
  const now = useRef({
    instrumentKey,
    tool,
    placed,
    magnet,
    drawings,
    chosenId,
    laid: [] as LaidDrawing[],
  });
  const layer = useRef<DrawingLayer | null>(null);
  const reload = stored.reload;

  const fail = useCallback((error: unknown) => {
    setProblem(error instanceof Error ? error.message : "The drawing could not be kept");
  }, []);

  const laid = useMemo<LaidDrawing[]>(
    () =>
      hidden
        ? []
        : drawings.map((one) => ({
            id: one.drawing_id,
            kind: one.kind,
            points: one.points.map((point) => ({ day: point.day, price: Number(point.price) })),
            // Its own colour and width, else every drawing's: the reader's
            // "Drawings" style where set, the chart's own where not.
            colour: tokenColour(one.colour ?? look.colour),
            width: one.width ?? look.width,
            label: one.label,
          })),
    [drawings, hidden, look.colour, look.width],
  );
  now.current = { instrumentKey, tool, placed, magnet, drawings, chosenId, laid };
  useEffect(() => {
    layer.current?.show(laid, chosenId);
  }, [laid, chosenId]);

  const chooseTool = useCallback((next: DrawingTool | null) => {
    setTool(next);
    setPlaced([]);
    setReading(null);
    setProblem(null);
  }, []);

  const place = useCallback(
    (using: DrawingTool, key: string, point: Placed) => {
      const points = [...now.current.placed, point];
      const wanted = using === "measure" ? 2 : POINTS[using];
      if (points.length < wanted) {
        setPlaced(points);
        return;
      }
      setPlaced([]);
      setTool(null);
      const [from, to] = points;
      if (using === "measure") {
        // Unreachable otherwise: a measure is taken at its second point.
        if (from !== undefined && to !== undefined) {
          setReading(measure(from, to));
        }
        return;
      }
      createDrawing(key, using, {
        points: points.map((one) => ({ day: one.day, price: String(one.price) })),
        label: null,
        colour: null,
        width: null,
        locked: false,
      })
        .then((made) => {
          setChosenId(made.drawing_id);
          reload();
        })
        .catch(fail);
    },
    [fail, reload],
  );

  const decorate = useCallback(
    (chart: IChartApi, price: ISeriesApi<SeriesType> | undefined): (() => void) | undefined => {
      if (price === undefined || instrumentKey === null) {
        return undefined;
      }
      const made = new DrawingLayer();
      price.attachPrimitive(made);
      layer.current = made;
      made.show(now.current.laid, now.current.chosenId);

      const clicked = (event: MouseEventParams): void => {
        if (event.point === undefined || typeof event.time !== "string") {
          return;
        }
        const using = now.current.tool;
        if (using === null) {
          setChosenId(made.drawingAt(event.point));
          return;
        }
        const raw = price.coordinateToPrice(event.point.y);
        if (raw === null) {
          return;
        }
        const bar = event.seriesData.get(price) as
          { open?: number; high?: number; low?: number; close?: number } | undefined;
        const session =
          now.current.magnet &&
          bar?.open !== undefined &&
          bar.high !== undefined &&
          bar.low !== undefined &&
          bar.close !== undefined
            ? { open: bar.open, high: bar.high, low: bar.low, close: bar.close }
            : null;
        place(using, instrumentKey, {
          day: event.time,
          price: snapped(raw, session),
          index: event.logical ?? 0,
        });
      };
      chart.subscribeClick(clicked);

      // Dragging the drawing picked: its points move with the pointer, and
      // are kept where they are let go.
      const element = chart.chartElement();
      let held: { drawing: ChartDrawing; start: Pixel; pixels: Pixel[] } | null = null;
      const press = (event: PointerEvent): void => {
        const { tool: using, chosenId: chosen, drawings: all } = now.current;
        const drawing = all.find((one) => one.drawing_id === chosen);
        if (using !== null || drawing === undefined || drawing.locked) {
          return;
        }
        const spot = spotOf(event);
        if (made.drawingAt(spot) !== drawing.drawing_id) {
          return;
        }
        const pixels = made.pixelsOf({
          id: drawing.drawing_id,
          kind: drawing.kind,
          points: drawing.points.map((one) => ({ day: one.day, price: Number(one.price) })),
          // Only its place is wanted, not how it is painted.
          colour: "",
          width: 0,
          label: null,
        });
        if (pixels === null) {
          return;
        }
        held = { drawing, start: spot, pixels };
        chart.applyOptions({ handleScroll: false, handleScale: false });
      };
      const pointsAt = (spot: Pixel): ChartDrawing["points"] | null => {
        if (held === null) {
          return null;
        }
        const dx = spot.x - held.start.x;
        const dy = spot.y - held.start.y;
        const moved: ChartDrawing["points"] = [];
        for (const pixel of held.pixels) {
          const day = chart.timeScale().coordinateToTime(pixel.x + dx);
          const figure = price.coordinateToPrice(pixel.y + dy);
          if (typeof day !== "string" || figure === null) {
            return null;
          }
          moved.push({ day, price: String(figure) });
        }
        return moved;
      };
      const drag = (event: PointerEvent): void => {
        const points = pointsAt(spotOf(event));
        if (held === null || points === null) {
          return;
        }
        const id = held.drawing.drawing_id;
        made.show(
          now.current.laid.map((one) =>
            one.id === id
              ? {
                  ...one,
                  points: points.map((point) => ({ day: point.day, price: Number(point.price) })),
                }
              : one,
          ),
          id,
        );
      };
      const release = (event: PointerEvent): void => {
        const points = pointsAt(spotOf(event));
        const was = held;
        held = null;
        chart.applyOptions({ handleScroll: true, handleScale: true });
        if (was === null || points === null) {
          return;
        }
        updateDrawing(was.drawing.drawing_id, { ...kept(was.drawing), points })
          .then(reload)
          .catch(fail);
      };
      element.addEventListener("pointerdown", press);
      element.addEventListener("pointermove", drag);
      element.addEventListener("pointerup", release);

      return () => {
        chart.unsubscribeClick(clicked);
        element.removeEventListener("pointerdown", press);
        element.removeEventListener("pointermove", drag);
        element.removeEventListener("pointerup", release);
        price.detachPrimitive(made);
        if (layer.current === made) {
          layer.current = null;
        }
      };
    },
    // Built once per instrument; everything else is read through `now`.
    [instrumentKey, place, fail, reload],
  );

  const chosen = drawings.find((one) => one.drawing_id === chosenId) ?? null;

  const remove = useCallback(
    (drawing: ChartDrawing) => {
      setChosenId(null);
      deleteDrawing(drawing.drawing_id).then(reload).catch(fail);
    },
    [reload, fail],
  );

  // Delete removes the drawing picked, Escape puts a tool down; never while typing.
  useEffect(() => {
    const pressed = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target !== null && (TYPING.has(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (event.key === "Escape") {
        chooseTool(null);
        setChosenId(null);
      } else if ((event.key === "Delete" || event.key === "Backspace") && chosen !== null) {
        event.preventDefault();
        remove(chosen);
      }
    };
    window.addEventListener("keydown", pressed);
    return () => {
      window.removeEventListener("keydown", pressed);
    };
  }, [chooseTool, chosen, remove]);

  return {
    enabled: instrumentKey !== null,
    tool,
    chooseTool,
    remaining: tool === null ? 0 : (tool === "measure" ? 2 : POINTS[tool]) - placed.length,
    magnet,
    setMagnet,
    hidden,
    setHidden,
    chosen,
    reading,
    count: drawings.length,
    problem,
    lock: (drawing, locked) => {
      updateDrawing(drawing.drawing_id, { ...kept(drawing), locked })
        .then(reload)
        .catch(fail);
    },
    restyle: (drawing, change) => {
      updateDrawing(drawing.drawing_id, { ...kept(drawing), ...change })
        .then(reload)
        .catch(fail);
    },
    remove,
    deleteAll: async () => {
      if (instrumentKey !== null) {
        setChosenId(null);
        await deleteDrawings(instrumentKey);
        reload();
      }
    },
    decorate,
  };
}
