/**
 * The watchlist page's Chart view: one chart or several side by side, and
 * the list they are chosen from beside them, as TradingView lays out charts
 * and their watchlist (owner's choices, 2026-11-07: a view of the watchlist
 * page; layouts of one to four, kept in step).
 *
 * One chart is active, outlined: the list beside it and its keys change
 * that one. Which instrument each chart shows lives in the address
 * (`chart=` once per chart), so a layout is a link; how many there are is
 * remembered. The charts follow one another's crosshair and span unless the
 * reader turns that off (`ChartSync`), and any one can fill the view a
 * while.
 *
 * Where the list stands beside the charts (Tailwind's `xl`), the view fills
 * the window (the owner, 2026-11-08: "I want chart to be full size"): its
 * whole width, the frame's reading width lifted (`data-page-width`), and
 * down to the window's bottom, each cell aiming at its row's share and each
 * chart taking what its toolbars leave (`useFittedHeight`). On a narrower
 * screen the charts keep their own heights and the page scrolls. The
 * reader's lists open from the list's name above the companies rather than
 * standing in a column of their own beside the charts, and the layout and
 * keeping in step are chosen in the page's header (`ChartLayoutControls`),
 * not in a row of their own above the charts.
 */

import { Maximize2, Minimize2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { ChartListPanel, type PanelRow } from "@/components/ChartListPanel";
import { Chooser } from "@/components/Chooser";
import { WorkspaceChart } from "@/components/WorkspaceChart";
import { useFittedHeight } from "@/hooks/useFittedHeight";
import { useHeightToViewportBottom } from "@/hooks/useHeightToViewportBottom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChartSync } from "@/lib/chartSync";
import { type ChartLayout, usePreferences, writePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

/**
 * How each layout lays its charts out: how many it holds, in how many rows
 * where the view fills the window, and how tall each chart is drawn where
 * it does not (and before it is fitted).
 */
const LAYOUTS: Record<
  ChartLayout,
  { label: string; cells: number; grid: string; rows: 1 | 2; height: number }
> = {
  "1": { label: "1", cells: 1, grid: "grid-cols-1", rows: 1, height: 360 },
  "2": {
    label: "2 side by side",
    cells: 2,
    grid: "grid-cols-1 lg:grid-cols-2",
    rows: 1,
    height: 300,
  },
  "2v": { label: "2 stacked", cells: 2, grid: "grid-cols-1", rows: 2, height: 240 },
  "3": { label: "3", cells: 3, grid: "grid-cols-1 lg:grid-cols-3", rows: 1, height: 260 },
  "4": { label: "4", cells: 4, grid: "grid-cols-1 lg:grid-cols-2", rows: 2, height: 240 },
};

const LAYOUT_KEYS = Object.keys(LAYOUTS) as ChartLayout[];

/** Where the list stands beside the charts, and the view fills the window: Tailwind's `xl`. */
const FILLS = "(min-width: 1280px)";

/** The room between two rows of charts: the grid's `gap-4`. */
const ROW_GAP = 16;

/**
 * The least a chart itself is drawn at: under it the toolbars of four
 * narrow charts leave too little to read, and the page scrolls instead.
 */
const LEAST_CHART = 200;

/** The least the list beside the charts is given, however short the window. */
const LEAST_LIST = 320;

/** Room kept under the view, the frame's own padding, so it ends at the window's edge. */
const MARGIN_BELOW = 16;

/** Whether the charts follow one another's crosshair, and their span. */
export interface InStep {
  crosshair: boolean;
  span: boolean;
}

interface ChartLayoutControlsProps {
  inStep: InStep;
  onInStep: (inStep: InStep) => void;
}

/**
 * Choose how many charts the view lays out, and whether they keep in step.
 *
 * Drawn in the page's header rather than above the charts, where it took a
 * row of the screen to itself (the owner, 2026-11-08: "changing the position
 * of settings"). The layout is a preference, so the view follows it.
 *
 * @param props - Whether the charts keep in step, and how to change that.
 * @returns The controls.
 */
export function ChartLayoutControls({
  inStep,
  onInStep,
}: ChartLayoutControlsProps): React.JSX.Element {
  const { chartLayout } = usePreferences();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Chooser
        options={LAYOUT_KEYS.map((key) => ({ key, label: LAYOUTS[key].label }))}
        chosen={chartLayout}
        onChange={(next) => {
          writePreferences({ chartLayout: next });
        }}
        label="Charts"
      />
      {LAYOUTS[chartLayout].cells > 1 && (
        <div className="flex items-center gap-2 text-xs" role="group" aria-label="Kept in step">
          <span className="text-muted-foreground">In step:</span>
          {(["crosshair", "span"] as const).map((what) => (
            <button
              key={what}
              type="button"
              aria-pressed={inStep[what]}
              onClick={() => {
                onInStep({ ...inStep, [what]: !inStep[what] });
              }}
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-accent",
                inStep[what] && "bg-accent font-medium",
              )}
            >
              {what === "crosshair" ? "Crosshair" : "Range"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface WatchlistChartViewProps {
  title: string;
  rows: PanelRow[];
  /** Each chart's instrument as the address names it, in order; may be short. */
  asked: string[];
  /** Whether the rows are still on their way. */
  loading: boolean;
  /** Chart these instruments, one per chart, in order. */
  onChoose: (instrumentKeys: string[]) => void;
  /** The reader's lists, opened from the list's name to chart another. */
  lists: ReactNode;
  /** Whether the charts keep in step, chosen in the page's header. */
  inStep: InStep;
}

/**
 * Render the charts and the list beside them.
 *
 * @param props - The list, what each chart shows, and how to chart others.
 * @returns The view.
 */
export function WatchlistChartView({
  title,
  rows,
  asked,
  loading,
  onChoose,
  lists,
  inStep,
}: WatchlistChartViewProps): React.JSX.Element {
  const { chartLayout } = usePreferences();
  const layout = LAYOUTS[chartLayout];
  const [active, setActive] = useState(0);
  // The chart filling the view, and the layout it was filled in: another
  // layout chosen shows every chart again, with no effect to watch for it.
  const [filled, setFilled] = useState<{ at: number; layout: ChartLayout } | null>(null);
  const maximised = filled !== null && filled.layout === chartLayout ? filled.at : null;
  // One group for the view's life: charts join and leave it as they are built.
  const sync = useMemo(() => new ChartSync(), []);
  useEffect(() => {
    sync.configure(inStep);
  }, [sync, inStep]);
  const fills = useMediaQuery(FILLS);
  const [view, setView] = useState<HTMLDivElement | null>(null);
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  const roomForView = useHeightToViewportBottom(view, MARGIN_BELOW);
  const roomForCharts = useHeightToViewportBottom(grid, MARGIN_BELOW);

  // Each chart's instrument: the address's, else the list's next not yet shown.
  const shown = useMemo(() => {
    const keys = asked.slice(0, layout.cells);
    for (const row of rows) {
      if (keys.length >= layout.cells) {
        break;
      }
      if (!keys.includes(row.instrument_key)) {
        keys.push(row.instrument_key);
      }
    }
    return keys;
  }, [asked, rows, layout.cells]);
  const current = Math.min(active, Math.max(shown.length - 1, 0));

  const chartInActive = (instrumentKey: string): void => {
    const keys = [...shown];
    keys[current] = instrumentKey;
    onChoose(keys);
  };

  const cells =
    maximised === null
      ? shown.map((key, at) => ({ key, at }))
      : [{ key: shown[maximised] ?? "", at: maximised }];
  const rowCount = maximised === null ? layout.rows : 1;
  // Each row's share of the window, the gaps between rows taken out.
  const share = fills ? Math.floor((roomForCharts - (rowCount - 1) * ROW_GAP) / rowCount) : null;

  return (
    <div
      ref={setView}
      // Lifts the frame's reading width (`AppShell`): a chart is read
      // across the whole screen, and the margins either side were empty.
      data-page-width="full"
      // Read by the list's `xl:max-h-(--view-height)`, so a long list
      // scrolls beside the charts rather than running the page on.
      style={
        {
          "--view-height": `${String(Math.max(roomForView, LEAST_LIST))}px`,
        } as React.CSSProperties
      }
      className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]"
    >
      <div>
        {shown.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            {loading ? "Loading the list…" : "Nothing on this list to chart yet."}
          </p>
        ) : (
          <div
            ref={setGrid}
            className={cn("grid gap-4", maximised === null ? layout.grid : "grid-cols-1")}
          >
            {cells.map(({ key, at }) => {
              const row = rows.find((one) => one.instrument_key === key);
              return (
                <ChartCell
                  key={`${String(at)}:${key}`}
                  at={at}
                  marked={layout.cells > 1 && at === current}
                  onPress={() => {
                    setActive(at);
                  }}
                  initial={maximised === null ? layout.height : LAYOUTS["1"].height}
                  target={share}
                  instrumentKey={key}
                  // An instrument the address asks for but the list lacks (a
                  // link from its own page) is named by its key until it is.
                  symbol={row?.symbol ?? key.slice(key.lastIndexOf("|") + 1)}
                  isIndex={key.includes("_INDEX|")}
                  {...(layout.cells > 1 ? { sync } : {})}
                  {...(layout.cells > 1
                    ? {
                        controls: (
                          <button
                            type="button"
                            aria-label={
                              maximised === null
                                ? `Fill the view with chart ${String(at + 1)}`
                                : "Show every chart"
                            }
                            title={maximised === null ? "Fill the view" : "Show every chart"}
                            onClick={() => {
                              setFilled(maximised === null ? { at, layout: chartLayout } : null);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            {maximised === null ? (
                              <Maximize2 aria-hidden="true" className="h-4 w-4" />
                            ) : (
                              <Minimize2 aria-hidden="true" className="h-4 w-4" />
                            )}
                          </button>
                        ),
                      }
                    : {})}
                />
              );
            })}
          </div>
        )}
      </div>
      <ChartListPanel
        title={title}
        rows={rows}
        active={shown[current] ?? null}
        onChoose={chartInActive}
        lists={lists}
        className="xl:max-h-(--view-height)"
      />
    </div>
  );
}

type ChartCellProps = Omit<React.ComponentProps<typeof WorkspaceChart>, "height"> & {
  /** Its place among the charts, from nought. */
  at: number;
  /** Whether it is the chart the list feeds, outlined when there are several. */
  marked: boolean;
  /** Make it the chart the list feeds. */
  onPress: () => void;
  /** The chart's height until it is fitted, and where the view does not fill. */
  initial: number;
  /** The height the whole cell should come to, or null to keep `initial`. */
  target: number | null;
};

/**
 * One chart in its cell, drawn as tall as brings the cell to its target
 * once its toolbars are laid out.
 *
 * @param props - The chart, its place, and the height its cell aims at.
 * @returns The cell.
 */
function ChartCell({
  at,
  marked,
  onPress,
  initial,
  target,
  ...chart
}: ChartCellProps): React.JSX.Element {
  const [cell, setCell] = useState<HTMLDivElement | null>(null);
  const height = useFittedHeight(cell, target, initial, LEAST_CHART);
  return (
    <div
      ref={setCell}
      role="group"
      aria-label={`Chart ${String(at + 1)}`}
      aria-current={marked ? "true" : undefined}
      onClickCapture={onPress}
      // As tall as what it holds, not stretched to its row: stretched, a cell
      // beside a taller one measured no slack, and its chart never grew.
      className={cn(
        "self-start rounded-lg border p-3",
        marked && "border-primary ring-1 ring-primary/40",
      )}
    >
      <WorkspaceChart {...chart} height={height} />
    </div>
  );
}
