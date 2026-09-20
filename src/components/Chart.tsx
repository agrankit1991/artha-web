/**
 * The one chart.
 *
 * Every chart in this application is this component with different series:
 * a price history, a comparison, an indicator over time, a backtest's
 * equity curve. Creating the chart, theming it, tearing it down, the empty
 * and loading states, the legend and the way out to TradingView are
 * decided here once, so a chart learned on one screen is already
 * understood on the next.
 *
 * Callers describe what to draw rather than how. A second, nearly
 * identical chart is a bug in this codebase rather than a shortcut -- it
 * is how two screens start disagreeing about what a falling price looks
 * like, and about which series is which colour.
 */

import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";

import { RotateCcw } from "lucide-react";

import { TradingViewLink } from "@/components/TradingViewLink";
import { AVERAGE_WIDTH, CANDLE_DOWN, CANDLE_UP, PRICE_WIDTH, THRESHOLD } from "@/lib/chartPalette";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** One session of a candle series. */
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** One point of a line or a bar. */
export interface Point {
  time: string;
  value: number;
  /** A per-bar colour, for a histogram whose bars mean two things. */
  color?: string;
}

/** A horizontal rule on a series, such as an oscillator's thresholds. */
export interface Threshold {
  value: number;
  label?: string;
}

/** What every series carries, whatever its shape. */
interface Common {
  label: string;
  /**
   * Which pane to draw in. Nought is the main one; anything else gets a
   * band of its own underneath, which is what an oscillator on a nought
   * to a hundred scale needs -- drawn over a price it would be a flat
   * line along the bottom.
   */
  pane?: number;
  /** Rules to draw across the series, such as 30 and 70 on an RSI. */
  thresholds?: Threshold[];
}

/** Something to draw, and what to call it. */
export type Series =
  | (Common & { kind: "candles"; points: Candle[] })
  | (Common & { kind: "line"; colour: string; points: Point[]; width?: number })
  | (Common & { kind: "area"; colour: string; points: Point[] })
  | (Common & { kind: "bars"; points: Point[] });

/** An instrument a chart draws, and how to leave for it. */
export interface ChartInstrument {
  label: string;
  /** What TradingView calls it, when this platform knows. */
  symbol?: string | undefined;
  /** Whether that symbol was guessed rather than confirmed. */
  derived?: boolean | undefined;
}

interface ChartProps {
  series: Series[];
  /** The instruments drawn, offered as links out. */
  instruments?: ChartInstrument[];
  /** Extra readings beside the legend, such as each line's total return. */
  readings?: { label: string; value: string; tone?: "gain" | "loss" }[];
  loading?: boolean;
  /** What to say when there is nothing to draw. */
  empty?: string;
  /** Show percentages rather than prices on the axis. */
  asPercent?: boolean;
  /** How tall each pane past the first is drawn. */
  paneHeight?: number;
  height?: number;
  className?: string;
}

const DEFAULT_HEIGHT = 360;

/**
 * How many bars of empty space to leave at each end.
 *
 * Enough to be clearly a margin rather than a rounding error, and few
 * enough that a short series is still mostly series.
 */
const EDGE_BARS = 6;

/** How tall a pane past the first is drawn. */
const DEFAULT_PANE_HEIGHT = 110;

/** The scale volume and other bar series are pinned to. */
const BAR_SCALE = "bars";

/**
 * Draw the series.
 *
 * @param props - What to draw, what to call it, and how tall.
 * @returns The chart, its legend, and the way out to TradingView.
 */
export function Chart({
  series,
  instruments = [],
  readings = [],
  loading = false,
  empty = "Nothing to draw",
  asPercent = false,
  paneHeight = DEFAULT_PANE_HEIGHT,
  height = DEFAULT_HEIGHT,
  className,
}: ChartProps): React.JSX.Element {
  const holder = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  // The frame the chart opens in, so "reset" has something exact to
  // return to rather than re-fitting whatever happens to be drawn.
  const opening = useRef<{ from: number; to: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const { appearance } = useTheme();
  const drawable = series.filter((one) => one.points.length > 0);
  const hasBars = drawable.some((one) => one.kind === "bars");

  useEffect(() => {
    const element = holder.current;
    if (element === null || drawable.length === 0) {
      return undefined;
    }

    const dark = appearance === "dark";
    const created = createChart(element, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#a1a1aa" : "#52525b",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: dark ? "#27272a" : "#f4f4f5" },
        horzLines: { color: dark ? "#27272a" : "#f4f4f5" },
      },
      rightPriceScale: {
        borderVisible: false,
        // Room at the bottom only when something is pinned there.
        scaleMargins: { top: 0.08, bottom: hasBars ? 0.26 : 0.08 },
      },
      timeScale: {
        borderVisible: false,
        // Both edges deliberately unpinned. Pinned, the chart stops dead
        // at the first and last session, which makes the newest bar sit
        // flush against the price scale with nowhere to put a crosshair
        // reading, and gives a reader no room to drag the series clear of
        // either end to look at it.
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    chart.current = created;

    for (const one of drawable) {
      draw(created, one, asPercent);
    }

    // Panes past the first are given a fixed band rather than an equal
    // share: an oscillator is read for its shape against its thresholds,
    // and half the chart is far more room than that needs.
    const panes = created.panes();
    for (const pane of panes.slice(1)) {
      pane.setHeight(paneHeight);
    }

    if (hasBars) {
      created.priceScale(BAR_SCALE).applyOptions({
        // Its own scale, pinned to the bottom quarter: on one scale with
        // the price, volume is either invisible or it flattens the price
        // into a line.
        scaleMargins: { top: 0.8, bottom: 0 },
        borderVisible: false,
      });
    }
    // Framed with a margin at both ends rather than flush to the data, so
    // there is somewhere to drag to and the first and last sessions are
    // not pressed against the edges of the frame.
    const longest = Math.max(...drawable.map((one) => one.points.length));
    const frame = { from: -EDGE_BARS, to: longest - 1 + EDGE_BARS };
    opening.current = frame;
    created.timeScale().setVisibleLogicalRange(frame);
    setMoved(false);

    // Watching the range rather than the pointer: a reader moves the
    // chart by dragging, by the wheel, by pinching and by the keyboard,
    // and all of them end here.
    const watch = (range: { from: number; to: number } | null): void => {
      setMoved(range !== null && !sameFrame(range, frame));
    };
    created.timeScale().subscribeVisibleLogicalRangeChange(watch);

    return () => {
      created.timeScale().unsubscribeVisibleLogicalRangeChange(watch);
      created.remove();
      chart.current = null;
      opening.current = null;
    };
    // `drawable` is rebuilt on every render; `series` is what a caller
    // actually changes, and is what this should redraw for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, height, appearance, asPercent, hasBars, paneHeight]);

  const reset = useCallback(() => {
    const frame = opening.current;
    if (chart.current !== null && frame !== null) {
      chart.current.timeScale().setVisibleLogicalRange(frame);
    }
  }, []);

  if (drawable.length === 0) {
    return (
      <div
        className={cn("rounded-lg border", loading && "animate-pulse bg-muted/40", className)}
        style={{ height }}
        role="img"
        aria-label={loading ? "Chart loading" : empty}
      >
        {!loading && (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Series drawn">
          {drawable
            .filter((one) => one.kind !== "bars")
            .map((one) => (
              <li key={one.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 rounded"
                  style={{
                    backgroundColor:
                      one.kind === "line" || one.kind === "area" ? one.colour : "#71717a",
                  }}
                />
                <span className="text-muted-foreground">{one.label}</span>
                {readings
                  .filter((reading) => reading.label === one.label)
                  .map((reading) => (
                    <span
                      key={reading.label}
                      className={cn(
                        "tabular font-medium",
                        reading.tone === "gain" && "text-gain",
                        reading.tone === "loss" && "text-loss",
                      )}
                    >
                      {reading.value}
                    </span>
                  ))}
              </li>
            ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          {moved && (
            // Offered only once there is something to undo: a reset that
            // is always on screen is a button that does nothing nearly
            // every time it is looked at.
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Reset view
            </button>
          )}
          {instruments.map((instrument) => (
            <TradingViewLink
              key={instrument.label}
              label={instrument.label}
              symbol={instrument.symbol}
              derived={instrument.derived}
            />
          ))}
        </div>
      </div>
      <div
        ref={holder}
        style={{ height }}
        data-testid="chart"
        // The conventional gesture, and the one somebody tries first. The
        // button above says it is there; this is how it is reached
        // without looking away from the chart.
        onDoubleClick={reset}
      />
    </div>
  );
}

/**
 * Add one series to a chart.
 *
 * @param chart - The chart to add it to.
 * @param series - What to draw.
 * @param asPercent - Whether the axis shows percentages.
 */
function draw(chart: IChartApi, series: Series, asPercent: boolean): void {
  const pane = series.pane ?? 0;
  const drawn = add(chart, series, asPercent, pane);
  for (const threshold of series.thresholds ?? []) {
    drawn.createPriceLine({
      price: threshold.value,
      color: THRESHOLD,
      lineWidth: AVERAGE_WIDTH,
      lineStyle: 2,
      axisLabelVisible: true,
      title: threshold.label ?? "",
    });
  }
}

/**
 * Add one series and hand back what was added.
 *
 * @param chart - The chart to add it to.
 * @param series - What to draw.
 * @param asPercent - Whether the axis shows percentages.
 * @param pane - Which pane to draw in.
 * @returns The series, so rules can be drawn across it.
 */
function add(
  chart: IChartApi,
  series: Series,
  asPercent: boolean,
  pane: number,
): ReturnType<IChartApi["addSeries"]> {
  if (series.kind === "candles") {
    const candles = chart.addSeries(
      CandlestickSeries,
      {
        upColor: CANDLE_UP,
        downColor: CANDLE_DOWN,
        borderVisible: false,
        wickUpColor: CANDLE_UP,
        wickDownColor: CANDLE_DOWN,
      },
      pane,
    );
    candles.setData(series.points);
    return candles;
  }

  if (series.kind === "bars") {
    const bars = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, priceScaleId: BAR_SCALE },
      pane,
    );
    bars.setData(series.points);
    return bars;
  }

  if (series.kind === "area") {
    const area = chart.addSeries(
      AreaSeries,
      {
        lineColor: series.colour,
        topColor: `${series.colour}55`,
        bottomColor: `${series.colour}05`,
        lineWidth: PRICE_WIDTH,
        ...(asPercent ? { priceFormat: { type: "percent" as const } } : {}),
      },
      pane,
    );
    area.setData(series.points);
    return area;
  }

  const line = chart.addSeries(
    LineSeries,
    {
      color: series.colour,
      lineWidth: series.width === PRICE_WIDTH ? PRICE_WIDTH : AVERAGE_WIDTH,
      lastValueVisible: false,
      priceLineVisible: false,
      ...(asPercent ? { priceFormat: { type: "percent" as const } } : {}),
    },
    pane,
  );
  line.setData(series.points);
  return line;
}

/**
 * Whether two frames are the same, allowing for the chart's own rounding.
 *
 * The library reports the range it settled on rather than the one it was
 * given, and those differ by a fraction of a bar. Compared exactly, a
 * chart would announce itself as moved the moment it was drawn.
 *
 * @param one - A frame.
 * @param other - The frame to compare it against.
 * @returns Whether they are the same frame.
 */
function sameFrame(
  one: { from: number; to: number },
  other: { from: number; to: number },
): boolean {
  return Math.abs(one.from - other.from) < 0.5 && Math.abs(one.to - other.to) < 0.5;
}
