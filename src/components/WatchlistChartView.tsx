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
 */

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ChartListPanel, type PanelRow } from "@/components/ChartListPanel";
import { Chooser } from "@/components/Chooser";
import { WorkspaceChart } from "@/components/WorkspaceChart";
import { ChartSync } from "@/lib/chartSync";
import { type ChartLayout, usePreferences, writePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

/** How each layout lays its charts out, how many it holds and how tall each is. */
const LAYOUTS: Record<ChartLayout, { label: string; cells: number; grid: string; height: number }> =
  {
    "1": { label: "1", cells: 1, grid: "grid-cols-1", height: 360 },
    "2": { label: "2 side by side", cells: 2, grid: "grid-cols-1 lg:grid-cols-2", height: 300 },
    "2v": { label: "2 stacked", cells: 2, grid: "grid-cols-1", height: 240 },
    "3": { label: "3", cells: 3, grid: "grid-cols-1 lg:grid-cols-3", height: 260 },
    "4": { label: "4", cells: 4, grid: "grid-cols-1 lg:grid-cols-2", height: 240 },
  };

const LAYOUT_KEYS = Object.keys(LAYOUTS) as ChartLayout[];

interface WatchlistChartViewProps {
  title: string;
  rows: PanelRow[];
  /** Each chart's instrument as the address names it, in order; may be short. */
  asked: string[];
  /** Whether the rows are still on their way. */
  loading: boolean;
  /** Chart these instruments, one per chart, in order. */
  onChoose: (instrumentKeys: string[]) => void;
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
}: WatchlistChartViewProps): React.JSX.Element {
  const { chartLayout } = usePreferences();
  const layout = LAYOUTS[chartLayout];
  const [active, setActive] = useState(0);
  const [maximised, setMaximised] = useState<number | null>(null);
  const [inStep, setInStep] = useState({ crosshair: true, span: true });
  // One group for the view's life: charts join and leave it as they are built.
  const sync = useMemo(() => new ChartSync(), []);
  useEffect(() => {
    sync.configure(inStep);
  }, [sync, inStep]);

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

  const chooseLayout = (next: ChartLayout): void => {
    writePreferences({ chartLayout: next });
    setMaximised(null);
  };
  const chartInActive = (instrumentKey: string): void => {
    const keys = [...shown];
    keys[current] = instrumentKey;
    onChoose(keys);
  };

  const cells =
    maximised === null
      ? shown.map((key, at) => ({ key, at }))
      : [{ key: shown[maximised] ?? "", at: maximised }];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Chooser
            options={LAYOUT_KEYS.map((key) => ({ key, label: LAYOUTS[key].label }))}
            chosen={chartLayout}
            onChange={chooseLayout}
            label="Charts"
          />
          {layout.cells > 1 && (
            <div className="flex items-center gap-2 text-xs" role="group" aria-label="Kept in step">
              <span className="text-muted-foreground">In step:</span>
              {(["crosshair", "span"] as const).map((what) => (
                <button
                  key={what}
                  type="button"
                  aria-pressed={inStep[what]}
                  onClick={() => {
                    setInStep((now) => ({ ...now, [what]: !now[what] }));
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
        {shown.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            {loading ? "Loading the list…" : "Nothing on this list to chart yet."}
          </p>
        ) : (
          <div className={cn("grid gap-4", maximised === null ? layout.grid : "grid-cols-1")}>
            {cells.map(({ key, at }) => {
              const row = rows.find((one) => one.instrument_key === key);
              return (
                <div
                  key={`${String(at)}:${key}`}
                  role="group"
                  aria-label={`Chart ${String(at + 1)}`}
                  aria-current={layout.cells > 1 && at === current ? "true" : undefined}
                  onClickCapture={() => {
                    setActive(at);
                  }}
                  className={cn(
                    "rounded-lg border p-3",
                    layout.cells > 1 && at === current && "border-primary ring-1 ring-primary/40",
                  )}
                >
                  <WorkspaceChart
                    instrumentKey={key}
                    // An instrument the address asks for but the list lacks (a
                    // link from its own page) is named by its key until it is.
                    symbol={row?.symbol ?? key.slice(key.lastIndexOf("|") + 1)}
                    isIndex={key.includes("_INDEX|")}
                    height={maximised === null ? layout.height : LAYOUTS["1"].height}
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
                                setMaximised(maximised === null ? at : null);
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
                </div>
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
      />
    </div>
  );
}
