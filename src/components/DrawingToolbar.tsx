/**
 * The tools for drawing on a chart, and what to do with a drawing picked.
 *
 * TradingView's everyday set, as the owner chose for the first version
 * (WATCHLIST-PLAN.md section 7): a price across the chart for support or
 * resistance, a price from a session on, a trend line, a ray, a line through
 * two points both ways, a session marked, a zone, and a measure that is read
 * and not kept. Each tool is put down after one use, as TradingView's are;
 * Escape puts it down sooner. The magnet snaps a point to the nearest of the
 * session's four prices.
 */

import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Magnet,
  Minus,
  MoveDiagonal2,
  MoveRight,
  Palette,
  Ruler,
  SeparatorVertical,
  Square,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LineStyleEditor } from "@/components/LineStyleEditor";
import type { ChartDrawings, DrawingTool } from "@/hooks/useChartDrawings";
import { useLineStyles } from "@/lib/lineStyles";
import { cn } from "@/lib/utils";

/** Every tool, in the order offered, with what it is called. */
const TOOLS: { tool: DrawingTool; label: string; icon: typeof Minus }[] = [
  { tool: "horizontal", label: "Horizontal line", icon: Minus },
  { tool: "horizontal-ray", label: "Horizontal ray", icon: MoveRight },
  { tool: "trend", label: "Trend line", icon: TrendingUp },
  { tool: "ray", label: "Ray", icon: ArrowUpRight },
  { tool: "extended", label: "Extended line", icon: MoveDiagonal2 },
  { tool: "vertical", label: "Vertical line", icon: SeparatorVertical },
  { tool: "rectangle", label: "Rectangle", icon: Square },
  { tool: "measure", label: "Measure", icon: Ruler },
];

/** A drawing's kind in words, for saying which one is picked. */
const NAMES = new Map(TOOLS.map((one) => [one.tool, one.label]));

const BUTTON = "rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground";

/** A note over the plot: a small card, so it reads over the lines under it. */
const NOTE_CLASS = "w-fit rounded bg-popover/95 px-2 py-1 shadow-sm";

/**
 * Render the toolbar, or nothing where there is no instrument to draw on.
 *
 * @param props - The drawings and what can be done with them.
 * @returns The toolbar.
 */
export function DrawingToolbar({
  drawings,
}: {
  drawings: ChartDrawings;
}): React.JSX.Element | null {
  const [clearing, setClearing] = useState(false);
  const [styling, setStyling] = useState(false);
  const every = useLineStyles().drawn("drawing");
  if (!drawings.enabled) {
    return null;
  }
  const { tool, chosen, reading } = drawings;
  const noting = chosen !== null || tool !== null || reading !== null || drawings.problem !== null;
  return (
    <>
      {/* Down the chart's left, as a trading screen keeps its drawing tools
          (the owner, 2026-11-08), rather than a row over the chart. */}
      <div
        role="toolbar"
        aria-label="Drawing tools"
        aria-orientation="vertical"
        className="flex shrink-0 flex-col items-center gap-0.5 self-start rounded-md border bg-card p-0.5"
      >
        {TOOLS.map((one) => (
          <button
            key={one.tool}
            type="button"
            aria-pressed={tool === one.tool}
            aria-label={one.label}
            title={one.label}
            onClick={() => {
              drawings.chooseTool(tool === one.tool ? null : one.tool);
            }}
            className={cn(BUTTON, tool === one.tool && "bg-accent text-foreground")}
          >
            <one.icon aria-hidden="true" className="h-4 w-4" />
          </button>
        ))}
        <span aria-hidden="true" className="my-1 h-px w-5 bg-border" />
        <button
          type="button"
          aria-pressed={drawings.magnet}
          aria-label="Magnet: snap to open, high, low or close"
          title="Magnet: snap to open, high, low or close"
          onClick={() => {
            drawings.setMagnet(!drawings.magnet);
          }}
          className={cn(BUTTON, drawings.magnet && "bg-accent text-foreground")}
        >
          <Magnet aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-pressed={drawings.hidden}
          aria-label={drawings.hidden ? "Show drawings" : "Hide drawings"}
          title={drawings.hidden ? "Show drawings" : "Hide drawings"}
          onClick={() => {
            drawings.setHidden(!drawings.hidden);
          }}
          className={BUTTON}
        >
          {drawings.hidden ? (
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Eye aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        {drawings.count > 0 && (
          <button
            type="button"
            aria-label="Delete every drawing"
            title="Delete every drawing"
            onClick={() => {
              setClearing(true);
            }}
            className={BUTTON}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        {chosen !== null && (
          <>
            <span aria-hidden="true" className="my-1 h-px w-5 bg-border" />
            <button
              type="button"
              aria-label={chosen.locked ? "Unlock the drawing" : "Lock the drawing"}
              title={chosen.locked ? "Unlock" : "Lock against dragging"}
              onClick={() => {
                drawings.lock(chosen, !chosen.locked);
              }}
              className={BUTTON}
            >
              {chosen.locked ? (
                <LockOpen aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Lock aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              aria-label="Style the drawing"
              title="Its colour and thickness"
              aria-pressed={styling}
              onClick={() => {
                setStyling(!styling);
              }}
              className={cn(BUTTON, styling && "bg-accent text-foreground")}
            >
              <Palette aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete the drawing"
              title="Delete (or press Delete)"
              onClick={() => {
                drawings.remove(chosen);
              }}
              className={BUTTON}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {noting && (
        // Over the plot, above its time axis, so a note never moves the
        // chart; only the style editor takes the pointer.
        <div className="pointer-events-none absolute bottom-20 left-12 z-20 max-w-md space-y-1.5 text-xs">
          {chosen !== null && (
            <p className={NOTE_CLASS}>
              <span className="font-medium">{NAMES.get(chosen.kind) ?? chosen.kind} picked:</span>{" "}
              <span className="text-muted-foreground">
                lock, style or delete it from the tools.
              </span>
            </p>
          )}
          {chosen !== null && styling && (
            <div className="pointer-events-auto rounded-md border bg-popover p-2 shadow-md">
              <LineStyleEditor
                label="The drawing"
                own={{ colour: chosen.colour, width: chosen.width }}
                fallbackColour={every.colour}
                fallbackName="Like every drawing"
                onChange={(change) => {
                  drawings.restyle(chosen, change);
                }}
              />
            </div>
          )}
          {tool !== null && (
            <p className={NOTE_CLASS}>
              Click {drawings.remaining} more {drawings.remaining === 1 ? "point" : "points"} on the
              chart. Escape puts the tool down.
            </p>
          )}
          {reading !== null && (
            // Drawn on the chart as a band with its reading; said here too,
            // for a reader the canvas says nothing to.
            <p role="status" className="sr-only">
              Measured: {reading.change >= 0 ? "+" : ""}
              {reading.percent.toFixed(2)}% ({reading.change >= 0 ? "+" : ""}
              {reading.change.toFixed(2)}) over {reading.sessions}{" "}
              {reading.sessions === 1 ? "session" : "sessions"}.
            </p>
          )}
          {drawings.problem !== null && (
            <p className={cn(NOTE_CLASS, "text-destructive")}>{drawings.problem}</p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={clearing}
        title="Delete every drawing on this chart?"
        description="Every line and zone you drew on this instrument goes. This cannot be undone."
        action="Delete them"
        onClose={() => {
          setClearing(false);
        }}
        onConfirm={async () => {
          await drawings.deleteAll();
          setClearing(false);
        }}
      />
    </>
  );
}
