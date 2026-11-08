/**
 * One instrument's sessions, drawn however a reader wants them.
 *
 * A description of what to draw, handed to the one chart. The averages and
 * the oscillator are the platform's own, fetched alongside the bars rather
 * than computed here: a chart working them out in the browser would use a
 * different warm-up period and a different handling of gaps from the rule
 * engine, and the two would disagree about where a crossover happened --
 * the one thing a chart on a backtesting platform must not do.
 *
 * The controls live here rather than on the page, so this drops into an
 * instrument page or a comparison with its settings intact.
 */

import { useCallback, useMemo, useState } from "react";

import type { ChartPoint, PriceBands } from "@/api/client";
import { type Candle, Chart, type ChartInstrument, type Series } from "@/components/Chart";
import {
  type ChartScale,
  type ChartStyle,
  ChartControls,
  type Overlay,
  ScaleChooser,
} from "@/components/ChartControls";
import { DrawingToolbar } from "@/components/DrawingToolbar";
import { ForecastNote } from "@/components/ForecastNote";
import { LineStylesDialog } from "@/components/LineStylesDialog";
import { useChartDrawings } from "@/hooks/useChartDrawings";
import { drawnBand } from "@/lib/forecastBands";
import { readPreferences, writePreferences } from "@/lib/preferences";
import { CHART_LINES, type LineLook } from "@/lib/chartLines";
import { FALL, RISE } from "@/lib/chartPalette";
import type { ChartMarker } from "@/lib/chartMarkers";
import type { ChartSync } from "@/lib/chartSync";
import { toNumber } from "@/lib/format";
import { useLineStyles } from "@/lib/lineStyles";

/** No extra lines, as one value so the series are not rebuilt each render. */
const NO_EXTRA: Series[] = [];

interface PriceChartProps {
  points: ChartPoint[] | null;
  /** The instrument drawn, offered as a link out. */
  instrument?: ChartInstrument;
  /** What is drawn over the price to begin with. */
  initialOverlays?: Overlay[];
  /** Where the price may go past its last session; absent or null for none. */
  forecast?: PriceBands | null;
  loading?: boolean;
  /** Work done on the chart each time it is built: markers, drawings. Stable. */
  decorate?: React.ComponentProps<typeof Chart>["decorate"];
  /** Lines laid over the price, as another instrument for comparison. */
  extra?: Series[];
  /** Marks on the price: a strategy's trades, a company's bonuses and splits. */
  markers?: ChartMarker[];
  /** A group of charts this one keeps in step with. */
  sync?: ChartSync;
  /** How tall the price pane is drawn; the chart's own height unless asked. */
  height?: number;
  /**
   * The instrument whose drawings are shown and drawn on this chart: the
   * reader's own, on every chart of it. Absent where nothing is drawn.
   */
  drawingsOf?: string;
  /** What leads the bar over the chart: the instrument, what is laid over it. */
  lead?: React.ReactNode;
  /** What closes that bar at its far end, such as making the chart fill the view. */
  trail?: React.ReactNode;
  /** The span shown, chosen under the plot at its left as a trading screen has it. */
  range?: React.ReactNode;
}

/** The averages, and which figure each reads. */
const AVERAGES: Record<"sma_20" | "sma_50" | "sma_200", (point: ChartPoint) => string | null> = {
  sma_20: (point) => point.sma_20,
  sma_50: (point) => point.sma_50,
  sma_200: (point) => point.sma_200,
};

/** What an RSI is read against: oversold below thirty, overbought above seventy. */
const RSI_THRESHOLDS = [
  { value: 70, label: "70" },
  { value: 30, label: "30" },
];

/**
 * What is drawn over the price unless a caller says otherwise.
 *
 * All three averages: the twenty against the fifty is what a reader looks
 * at first, and leaving the short one off meant turning it on every time.
 * In the order the menu offers them, so the set always draws the same way
 * round.
 */
/**
 * The shape a chart opens in.
 *
 * A line rather than candles. Candles are read a session at a time and a
 * line is read as a shape, and a chart somebody has just opened is being
 * read as a shape -- the candles are one choice away for whoever wants
 * them.
 */
/**
 * Draw the sessions.
 *
 * @param props - The sessions, and the instrument they belong to.
 * @returns The chart and the controls that shape it.
 */
export function PriceChart({
  points,
  instrument,
  initialOverlays,
  forecast = null,
  loading = false,
  decorate,
  extra = NO_EXTRA,
  markers,
  sync,
  height,
  drawingsOf,
  lead,
  trail,
  range,
}: PriceChartProps): React.JSX.Element {
  const drawings = useChartDrawings(drawingsOf ?? null);
  const lines = useLineStyles();
  const [styling, setStyling] = useState(false);
  const own = drawings.decorate;
  // The drawings and whatever the caller adds, both on each build, both undone.
  const decorated = useCallback(
    (...build: Parameters<typeof own>) => {
      const mine = own(...build);
      const theirs = decorate?.(...build);
      return mine === undefined && theirs === undefined
        ? undefined
        : () => {
            mine?.();
            theirs?.();
          };
    },
    [own, decorate],
  );
  // What the reader chose last time, unless the page asks for something
  // particular; what they choose now is remembered for next time.
  const [style, setStyle] = useState<ChartStyle>(() => readPreferences().chartStyle);
  const [overlays, setOverlays] = useState<Overlay[]>(
    () => initialOverlays ?? readPreferences().overlays,
  );
  const chooseStyle = (next: ChartStyle): void => {
    setStyle(next);
    writePreferences({ chartStyle: next });
  };
  const chooseOverlays = (next: Overlay[]): void => {
    setOverlays(next);
    writePreferences({ overlays: next });
  };
  const [scale, setScale] = useState<ChartScale>(() => readPreferences().chartScale);
  const [inverted, setInverted] = useState(false);
  const chooseScale = (next: ChartScale): void => {
    setScale(next);
    writePreferences({ chartScale: next });
  };
  const [showForecast, setShowForecast] = useState<boolean>(() => readPreferences().forecast);
  const chooseForecast = (next: boolean): void => {
    setShowForecast(next);
    writePreferences({ forecast: next });
  };
  const band = forecast !== null && showForecast ? forecast : null;
  // With other instruments laid over the price, a price axis flattens the
  // cheaper ones into the floor; per cent from the first session shown puts
  // them on one footing. Indexed to a hundred does too, so it is kept.
  const shownScale: ChartScale = extra.length > 0 && scale !== "indexed" ? "percent" : scale;
  const sessions = useMemo(() => points ?? [], [points]);

  const series = useMemo<Series[]>(() => {
    if (sessions.length === 0) {
      return [];
    }
    const showing = new Set(overlays);
    const drawn: Series[] = [priceOf(sessions, style, lines.drawn("price"))];

    if (showing.has("volume")) {
      drawn.push({
        kind: "bars",
        label: "Volume",
        points: sessions.map((point) => ({
          time: point.day,
          value: point.volume,
          color: (toNumber(point.close) ?? 0) >= (toNumber(point.open) ?? 0) ? RISE : FALL,
        })),
      });
    }

    for (const key of ["sma_20", "sma_50", "sma_200"] as const) {
      if (showing.has(key)) {
        drawn.push({
          kind: "line",
          label: CHART_LINES[key].label,
          ...lines.drawn(key),
          points: valuesOf(sessions, AVERAGES[key]),
        });
      }
    }

    if (showing.has("rsi")) {
      drawn.push({
        kind: "line",
        label: "RSI",
        ...lines.drawn("rsi"),
        // A band of its own: an oscillator on a nought to a hundred scale
        // drawn over a price is a flat line along the bottom.
        pane: 1,
        thresholds: RSI_THRESHOLDS,
        points: valuesOf(sessions, (point) => point.rsi),
      });
    }

    if (band !== null) {
      const bands = drawnBand(band);
      const edges = lines.drawn("forecast_edges");
      drawn.push(
        { kind: "line", label: "Forecast 90%", ...edges, dashed: true, points: bands.high },
        {
          kind: "line",
          label: "Forecast middle",
          ...lines.drawn("forecast_middle"),
          dashed: true,
          points: bands.median,
          // The band's range and record, behind a mark in the legend.
          about: <ForecastNote bands={band} />,
        },
        { kind: "line", label: "Forecast 10%", ...edges, dashed: true, points: bands.low },
      );
    }

    drawn.push(...extra);
    return drawn;
  }, [sessions, style, overlays, band, extra, lines]);

  return (
    <div className="space-y-2">
      {/* As a trading screen lays a chart out (the owner, 2026-11-08: "the
          scale and other tools should be visible on the chart something like
          how trading view does"): one bar over it, the drawing tools down its
          left, its legend over the plot and its span and price axis under it. */}
      <div className="flex flex-wrap items-center gap-2">
        {lead}
        <ChartControls
          className="contents"
          style={style}
          overlays={overlays}
          onStyle={chooseStyle}
          onOverlays={chooseOverlays}
          onStyles={() => {
            setStyling(true);
          }}
          {...(forecast === null
            ? {}
            : { forecast: { shown: showForecast, onToggle: chooseForecast } })}
        />
        {trail !== undefined && <div className="ml-auto flex items-center gap-2">{trail}</div>}
      </div>
      <div className="relative flex gap-2">
        <DrawingToolbar drawings={drawings} />
        <Chart
          className="min-w-0 flex-1"
          series={series}
          instruments={instrument ? [instrument] : []}
          loading={loading}
          empty="No sessions to draw"
          priceScale={shownScale}
          inverted={inverted}
          imageName={instrument?.label ?? "chart"}
          decorate={decorated}
          framed={{
            start: range,
            end: (
              <ScaleChooser
                chosen={shownScale}
                inverted={inverted}
                onScale={chooseScale}
                onInvert={setInverted}
              />
            ),
          }}
          {...(markers === undefined ? {} : { markers })}
          {...(sync === undefined ? {} : { sync })}
          {...(height === undefined ? {} : { height })}
        />
      </div>
      <LineStylesDialog
        open={styling}
        onClose={() => {
          setStyling(false);
        }}
      />
    </div>
  );
}

/**
 * Build the price itself, in whichever shape was asked for.
 *
 * @param sessions - The sessions.
 * @param style - The shape.
 * @param look - The price line's colour and width, the reader's where set; a
 *   baseline takes only the width, its colours being a rise's and a fall's.
 * @returns The series.
 */
function priceOf(sessions: ChartPoint[], style: ChartStyle, look: LineLook): Series {
  if (style === "candles" || style === "hollow") {
    return {
      kind: "candles",
      label: "Price",
      points: candlesOf(sessions),
      hollow: style === "hollow",
    };
  }
  if (style === "ohlc") {
    return { kind: "ohlc", label: "Price", points: candlesOf(sessions) };
  }
  const closes = valuesOf(sessions, (point) => point.close);
  if (style === "baseline") {
    // Above the first session shown is a rise, below it a fall.
    return { kind: "baseline", label: "Price", width: look.width, points: closes };
  }
  return { kind: style === "area" ? "area" : "line", label: "Price", ...look, points: closes };
}

/**
 * The sessions as open, high, low and close, for candles and bars alike.
 *
 * @param sessions - The sessions.
 * @returns The points. A session whose prices will not parse is left out
 *   rather than drawn at nought, which would put a candle crashing to zero
 *   in the middle of the series and look like a real event.
 */
function candlesOf(sessions: ChartPoint[]): Candle[] {
  return sessions.flatMap((point) => {
    const open = toNumber(point.open);
    const high = toNumber(point.high);
    const low = toNumber(point.low);
    const close = toNumber(point.close);
    return open === null || high === null || low === null || close === null
      ? []
      : [{ time: point.day, open, high, low, close }];
  });
}

/**
 * Take one figure from every session it exists for.
 *
 * @param sessions - The sessions.
 * @param of - Which figure.
 * @returns The points. Sessions the figure does not exist for yet are left
 *   out rather than drawn as nought, which would put a cliff at the start
 *   of every line.
 */
function valuesOf(
  sessions: ChartPoint[],
  of: (point: ChartPoint) => string | null,
): { time: string; value: number }[] {
  return sessions
    .map((point) => ({ time: point.day, value: toNumber(of(point)) }))
    .filter((entry): entry is { time: string; value: number } => entry.value !== null);
}
