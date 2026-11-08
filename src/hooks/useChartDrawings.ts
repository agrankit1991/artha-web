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
import { DrawingLayer, type LaidDrawing, type Sketch } from "@/components/DrawingLayer";
import { useResource } from "@/hooks/useResource";
import { FALL, RISE } from "@/lib/chartPalette";
import type { LineLook } from "@/lib/chartLines";
import {
  type Measure,
  POINTS,
  type Pixel,
  dayAtLogical,
  measure,
  snapped,
} from "@/lib/drawingGeometry";
import { type DrawingTool, toolForKeys } from "@/lib/drawingTools";
import { useLineStyles } from "@/lib/lineStyles";
import { tokenColour } from "@/lib/tokenColour";

/**
 * How near a price must be, in pixels, for the magnet to take a point to it:
 * a weak magnet, as TradingView's is, so a point can be put in the room clear
 * of the bars.
 */
const MAGNET_REACH = 12;

/**
 * The charts the pointer is over now, each by its hook's own token: of
 * several charts the one under the pointer takes a drawing's keys, and the
 * one being worked on only when the pointer is over none.
 */
const POINTED = new Set<object>();

/**
 * The chart's sessions in order, from the series drawn on.
 *
 * @param price - The price series.
 * @returns Each session's day, as an ISO date.
 */
function sessionsOf(price: ISeriesApi<SeriesType>): string[] {
  return price.data().flatMap((one) => (typeof one.time === "string" ? [one.time] : []));
}

/**
 * What a tool draws from its first point to where the pointer is: the line or
 * zone itself, or a measure with its reading, green for a rise and red for a fall.
 *
 * @param using - The tool.
 * @param from - Its first point.
 * @param to - Where the pointer is, or its second point.
 * @param look - How every drawing is drawn, for a line or zone.
 * @returns The sketch for the layer to paint.
 */
function sketchOf(using: DrawingTool, from: Placed, to: Placed, look: LineLook): Sketch {
  if (using !== "measure") {
    const colour = tokenColour(look.colour);
    return { kind: using, points: [from, to], colour, width: look.width, label: null };
  }
  const reading = measure(from, to);
  const sign = reading.change >= 0 ? "+" : "";
  const sessions = `${String(reading.sessions)} ${reading.sessions === 1 ? "session" : "sessions"}`;
  return {
    kind: "measure",
    points: [from, to],
    colour: tokenColour(reading.change >= 0 ? RISE : FALL),
    width: 1,
    label: {
      text: `${sign}${reading.percent.toFixed(2)}% · ${sign}${reading.change.toFixed(2)} · ${sessions}`,
      card: tokenColour("var(--popover)"),
    },
  };
}

export type { DrawingTool } from "@/lib/drawingTools";

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
export function useChartDrawings(
  instrumentKey: string | null,
  { takesKeys = true }: { takesKeys?: boolean } = {},
): ChartDrawings {
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
    look,
  });
  const layer = useRef<DrawingLayer | null>(null);
  // Where the pointer is on this chart, or null off it: a one-point tool's
  // key draws there (the owner, 2026-11-08: "plot directly in the chart at
  // the current cursor position", as TradingView's Alt+H does).
  const cursor = useRef<Placed | null>(null);
  const token = useRef({});
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
  now.current = { instrumentKey, tool, placed, magnet, drawings, chosenId, laid, look };
  useEffect(() => {
    layer.current?.show(laid, chosenId);
  }, [laid, chosenId]);

  const chooseTool = useCallback((next: DrawingTool | null) => {
    setTool(next);
    setPlaced([]);
    setReading(null);
    setProblem(null);
    layer.current?.sketch(null);
  }, []);

  // Keep a drawing whose points are all placed, and pick it.
  const keep = useCallback(
    (using: DrawingKind, key: string, points: readonly Placed[]) => {
      layer.current?.sketch(null);
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
          // Left on the chart until the next click, a tool, or Escape.
          layer.current?.sketch(sketchOf(using, from, to, now.current.look));
        }
        return;
      }
      keep(using, key, points);
    },
    [keep],
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

      // A click or the pointer as a point: its session (past the last one,
      // in the empty room, counted on in weekdays) and its price, taken to a
      // bar's open, high, low or close by the magnet only when near one.
      const placedFrom = (event: MouseEventParams): Placed | null => {
        if (event.point === undefined) {
          return null;
        }
        const index = event.logical === undefined ? null : Math.round(event.logical);
        const day =
          typeof event.time === "string"
            ? event.time
            : index === null
              ? null
              : dayAtLogical(sessionsOf(price), index);
        const raw = price.coordinateToPrice(event.point.y);
        if (day === null || raw === null) {
          return null;
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
        const y = event.point.y;
        return {
          day,
          price: snapped(raw, session, (candidate) => {
            const at = price.priceToCoordinate(candidate);
            return at !== null && Math.abs(at - y) <= MAGNET_REACH;
          }),
          index: index ?? 0,
        };
      };
      const clicked = (event: MouseEventParams): void => {
        if (event.point === undefined) {
          return;
        }
        const using = now.current.tool;
        if (using === null) {
          // A click away puts a measure down, as it picks or lets go a drawing.
          made.sketch(null);
          setChosenId(made.drawingAt(event.point));
          return;
        }
        const point = placedFrom(event);
        if (point !== null) {
          place(using, instrumentKey, point);
        }
      };
      // After a tool's first point, what it would draw follows the pointer
      // (the owner, 2026-11-08: "can I see in realtime the trendline").
      const followed = (event: MouseEventParams): void => {
        const point = placedFrom(event);
        cursor.current = point;
        if (point === null) {
          POINTED.delete(token.current);
        } else {
          POINTED.add(token.current);
        }
        const using = now.current.tool;
        const first = now.current.placed[0];
        if (using !== null && first !== undefined && point !== null) {
          made.sketch(sketchOf(using, first, point, now.current.look));
        }
      };
      chart.subscribeClick(clicked);
      chart.subscribeCrosshairMove(followed);

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
          points: drawing.points.map((one) => ({ day: one.day, price: Number(one.price) })),
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
        const time = chart.timeScale();
        for (const pixel of held.pixels) {
          // A bar's day, or past the last session a day counted on to it.
          const at = time.coordinateToTime(pixel.x + dx);
          const logical = typeof at === "string" ? null : time.coordinateToLogical(pixel.x + dx);
          const day =
            typeof at === "string"
              ? at
              : logical === null
                ? null
                : dayAtLogical(sessionsOf(price), logical);
          const figure = price.coordinateToPrice(pixel.y + dy);
          if (day === null || figure === null) {
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
        chart.unsubscribeCrosshairMove(followed);
        cursor.current = null;
        POINTED.delete(token.current);
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

  // Escape puts a tool down; Delete removes the drawing picked and a tool's
  // shortcut takes it up (again, puts it down), on the chart the keys reach
  // -- of several, the one being worked on -- and never while typing.
  useEffect(() => {
    const pressed = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target !== null && (TYPING.has(target.tagName) || target.isContentEditable)) {
        return;
      }
      // A tool's key reaches the chart the pointer is over; with the pointer
      // over none, the one being worked on.
      const at = cursor.current;
      const reached = at !== null || (takesKeys && POINTED.size === 0);
      const shortcut = reached && instrumentKey !== null ? toolForKeys(event) : null;
      if (event.key === "Escape") {
        chooseTool(null);
        setChosenId(null);
      } else if (shortcut !== null && instrumentKey !== null) {
        // Not the browser's: Alt with a letter opens a menu there.
        event.preventDefault();
        if (at !== null && shortcut !== "measure" && POINTS[shortcut] === 1) {
          // Drawn where the pointer is, as TradingView's Alt+H draws.
          chooseTool(null);
          keep(shortcut, instrumentKey, [at]);
        } else {
          chooseTool(now.current.tool === shortcut ? null : shortcut);
        }
      } else if (
        takesKeys &&
        (event.key === "Delete" || event.key === "Backspace") &&
        chosen !== null
      ) {
        event.preventDefault();
        remove(chosen);
      }
    };
    window.addEventListener("keydown", pressed);
    return () => {
      window.removeEventListener("keydown", pressed);
    };
  }, [chooseTool, chosen, remove, takesKeys, instrumentKey, keep]);

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
