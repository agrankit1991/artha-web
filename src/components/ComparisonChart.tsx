/**
 * Two or more instruments on one axis, as percentages from a common start.
 *
 * The first real chart in this application, and so the first use of
 * TradingView's Lightweight Charts: this needs a time axis, a value axis
 * and a crosshair, which is the line past which inline SVG stops being the
 * simpler option.
 *
 * Lightweight rather than Advanced, deliberately. Advanced Charts carries
 * its own indicator engine, which would quietly disagree with the platform's
 * about warm-up periods, gaps and corporate-action adjustment -- and a
 * chart whose job is to show why a signal fired must display the values the
 * signal actually used.
 */

import {
  type IChartApi,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

import type { PriceSeries } from "@/api/client";
import { useTheme } from "@/lib/theme";
import { type RebasedSeries, rebase } from "@/lib/rebase";
import { cn } from "@/lib/utils";

/** What to call each series, and what colour to draw it. */
export interface ChartLine {
  instrumentKey: string;
  label: string;
  colour: string;
}

interface ComparisonChartProps {
  series: PriceSeries[] | null;
  lines: ChartLine[];
  loading?: boolean;
  height?: number;
  className?: string;
}

const DEFAULT_HEIGHT = 280;

/**
 * Draw the comparison.
 *
 * @param props - The series, how to label them, and how tall to draw.
 * @returns The chart, with a legend carrying each line's total return.
 */
export function ComparisonChart({
  series,
  lines,
  loading = false,
  height = DEFAULT_HEIGHT,
  className,
}: ComparisonChartProps): React.JSX.Element {
  const holder = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const { appearance } = useTheme();

  const rebased = useMemo(() => rebase(series ?? []), [series]);
  const labels = useMemo(() => new Map(lines.map((line) => [line.instrumentKey, line])), [lines]);

  useEffect(() => {
    const element = holder.current;
    if (element === null || rebased.length === 0) {
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
        vertLines: { visible: false },
        horzLines: { color: dark ? "#27272a" : "#e4e4e7" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Magnet },
      autoSize: true,
    });
    chart.current = created;

    for (const line of rebased) {
      const drawn = created.addSeries(LineSeries, {
        color: labels.get(line.instrumentKey)?.colour ?? "#71717a",
        lineWidth: 2,
        priceFormat: { type: "percent" },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      drawn.setData(line.points.map((point) => ({ time: point.day, value: point.percent })));
    }
    created.timeScale().fitContent();

    return () => {
      created.remove();
      chart.current = null;
    };
  }, [rebased, labels, height, appearance]);

  if (rebased.length === 0) {
    return (
      <div
        className={cn("rounded-lg border", loading && "animate-pulse bg-muted/40", className)}
        style={{ height }}
        role="img"
        aria-label={loading ? "Comparison loading" : "No overlapping history to compare"}
      >
        {!loading && (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No overlapping history to compare
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Legend rebased={rebased} lines={labels} />
      <div ref={holder} style={{ height }} data-testid="comparison-chart" />
    </div>
  );
}

/** Each line, named, coloured, and with what it did over the window. */
function Legend({
  rebased,
  lines,
}: {
  rebased: RebasedSeries[];
  lines: Map<string, ChartLine>;
}): React.JSX.Element {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {rebased.map((line) => {
        const named = lines.get(line.instrumentKey);
        const total = line.total ?? 0;
        return (
          <li key={line.instrumentKey} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded"
              style={{ backgroundColor: named?.colour ?? "#71717a" }}
            />
            <span className="text-muted-foreground">{named?.label ?? line.instrumentKey}</span>
            <span className={cn("tabular font-medium", total >= 0 ? "text-gain" : "text-loss")}>
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
