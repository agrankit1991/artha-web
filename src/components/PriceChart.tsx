/**
 * One instrument's sessions as candles, with what it traded and the
 * averages it is read against.
 *
 * The averages are the platform's own, fetched alongside the bars rather
 * than computed here. A chart that worked them out in the browser would
 * use a different warm-up period and a different handling of gaps from the
 * rule engine, and the two would disagree about where a crossover happened
 * -- which is the one thing a chart on a backtesting platform must not do.
 */

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

import type { ChartPoint } from "@/api/client";
import { toNumber } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface PriceChartProps {
  points: ChartPoint[] | null;
  loading?: boolean;
  height?: number;
  className?: string;
}

const DEFAULT_HEIGHT = 360;

/** The averages drawn over the candles, and the colour each is drawn in. */
const AVERAGES: { of: (point: ChartPoint) => string | null; label: string; colour: string }[] = [
  { of: (point) => point.sma_20, label: "20-day", colour: "#f59e0b" },
  { of: (point) => point.sma_50, label: "50-day", colour: "#3b82f6" },
  { of: (point) => point.sma_200, label: "200-day", colour: "#a855f7" },
];

/**
 * Draw the candles.
 *
 * @param props - The sessions, and how tall to draw them.
 * @returns The chart, with a legend naming each average.
 */
export function PriceChart({
  points,
  loading = false,
  height = DEFAULT_HEIGHT,
  className,
}: PriceChartProps): React.JSX.Element {
  const holder = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const { appearance } = useTheme();

  const sessions = useMemo(() => points ?? [], [points]);

  useEffect(() => {
    const element = holder.current;
    if (element === null || sessions.length === 0) {
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
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.26 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    chart.current = created;

    const candles = created.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });
    candles.setData(
      sessions.map((point) => ({
        time: point.day,
        open: toNumber(point.open) ?? 0,
        high: toNumber(point.high) ?? 0,
        low: toNumber(point.low) ?? 0,
        close: toNumber(point.close) ?? 0,
      })),
    );

    // Volume shares the pane but not the scale, pinned to the bottom
    // quarter: on one scale with the price it is either invisible or it
    // flattens the candles into a line.
    const traded = created.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    created.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });
    traded.setData(
      sessions.map((point) => ({
        time: point.day,
        value: point.volume,
        color:
          (toNumber(point.close) ?? 0) >= (toNumber(point.open) ?? 0)
            ? "rgba(22,163,74,0.35)"
            : "rgba(220,38,38,0.35)",
      })),
    );

    for (const average of AVERAGES) {
      const drawn = created.addSeries(LineSeries, {
        color: average.colour,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // Sessions with no average yet are left out rather than drawn as
      // nought, which would put a cliff at the start of every line.
      drawn.setData(
        sessions
          .map((point) => ({ time: point.day, value: toNumber(average.of(point)) }))
          .filter((entry): entry is { time: string; value: number } => entry.value !== null),
      );
    }

    created.timeScale().fitContent();

    return () => {
      created.remove();
      chart.current = null;
    };
  }, [sessions, height, appearance]);

  if (sessions.length === 0) {
    return (
      <div
        className={cn("rounded-lg border", loading && "animate-pulse bg-muted/40", className)}
        style={{ height }}
        role="img"
        aria-label={loading ? "Price chart loading" : "No sessions to draw"}
      >
        {!loading && (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No sessions to draw
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {AVERAGES.map((average) => (
          <li key={average.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 rounded"
              style={{ backgroundColor: average.colour }}
            />
            <span className="text-muted-foreground">{average.label}</span>
          </li>
        ))}
      </ul>
      <div ref={holder} style={{ height }} data-testid="price-chart" />
    </div>
  );
}
