/**
 * A company's price-to-earnings and price-to-book over its own sessions.
 *
 * Today's multiple is a claim; the same multiple drawn over ten years, with
 * a line at its median and a meter saying where today falls, is a reading.
 * Two meters lead: how far along its own range each ratio sits today and
 * the share of sessions it has been below. The chart beneath has the
 * price-to-earnings in the main pane against its median, the
 * price-to-book in a second, and the earnings per share the first stands
 * on in a third, stepping up or down each year as the results arrive.
 *
 * The ratios stand on the annual standalone statements rather than the
 * trailing quarters the headline tiles use, because the annual series is
 * fifteen years deep and the quarterly four quarters. The platform says so
 * in its response; this component says so under the chart.
 */

import { useMemo } from "react";

import type { CompanyValuationHistory, RangeReading } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { Hint } from "@/components/Hint";
import { RangeMeter } from "@/components/RangeMeter";
import { CANDLE_UP, OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ABSENT, formatPrice, toNumber } from "@/lib/format";

interface ValuationHistoryChartProps {
  history: CompanyValuationHistory | null;
  loading?: boolean;
  years: number;
  onYears: (years: number) => void;
}

/** How far back the run may be asked to reach. Keyed as the chooser keys, by name. */
export const SPANS: { key: string; label: string }[] = [
  { key: "3", label: "3Y" },
  { key: "5", label: "5Y" },
  { key: "10", label: "10Y" },
  { key: "15", label: "15Y" },
];

/**
 * Render the meters and the chart.
 *
 * @param props - The run, how far back it reaches, and how to change that.
 * @returns The panel.
 */
export function ValuationHistoryChart({
  history,
  loading = false,
  years,
  onYears,
}: ValuationHistoryChartProps): React.JSX.Element {
  const series = useMemo<Series[]>(() => (history === null ? [] : drawn(history)), [history]);
  const ready = !loading && history !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <Standing label="Price to earnings" reading={history?.pe ?? null} loading={!ready} />
          <Standing label="Price to book" reading={history?.pb ?? null} loading={!ready} />
        </div>
        <Chooser
          options={SPANS}
          chosen={String(years)}
          onChange={(key) => {
            onYears(Number(key));
          }}
          label="Span"
        />
      </div>
      <Chart
        series={series}
        scale="price"
        loading={loading}
        empty="No sessions to value over"
        paneHeight={110}
      />
      <p className="text-xs text-muted-foreground">
        Against each financial year&rsquo;s standalone earnings and book value per share, applied
        from sixty days after the year-end, which is the deadline for audited results. The headline
        tiles above use the trailing four quarters instead; the annual statements reach back fifteen
        years where the quarters reach back one. A loss-making year has no price to earnings and
        leaves a gap.
      </p>
    </div>
  );
}

/** Where today's reading sits in its own run, as a meter and a sentence. */
function Standing({
  label,
  reading,
  loading,
}: {
  label: string;
  reading: RangeReading | null;
  loading: boolean;
}): React.JSX.Element {
  if (loading || reading === null) {
    return <div className="h-14 animate-pulse rounded-md bg-muted/40" />;
  }
  const percentile = toNumber(reading.percentile);
  return (
    <div className="space-y-1">
      <RangeMeter
        label={label}
        low={toNumber(reading.low)}
        high={toNumber(reading.high)}
        value={toNumber(reading.latest)}
        format={multiple}
      />
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          {reading.low === null ? ABSENT : multipleOf(reading.low)} –{" "}
          {reading.high === null ? ABSENT : multipleOf(reading.high)}, median{" "}
          {reading.median === null ? ABSENT : multipleOf(reading.median)}
        </span>
        {percentile !== null && (
          <Hint
            text={`Of the ${String(reading.sample)} sessions in this span with a reading, ${percentile.toFixed(0)}% were at or below today's. Low means the share is cheap against its own past; high means dear.`}
          >
            <span className={percentile <= 25 ? "text-gain" : percentile >= 75 ? "text-loss" : ""}>
              Cheaper than {(100 - percentile).toFixed(0)}% of its past
            </span>
          </Hint>
        )}
      </div>
    </div>
  );
}

/**
 * The three panes: the multiple against its median, the other multiple,
 * and the earnings the first stands on.
 *
 * @param history - The run.
 * @returns The series to draw; none where no session had a reading.
 */
function drawn(history: CompanyValuationHistory): Series[] {
  const points = (of: (one: (typeof history.sessions)[number]) => string | null) =>
    history.sessions.flatMap((one) => {
      const value = toNumber(of(one));
      return value === null ? [] : [{ time: one.day, value }];
    });
  const pe = points((one) => one.pe);
  const median = toNumber(history.pe.median);
  const candidates: Series[] = [
    {
      kind: "line",
      label: "Price to earnings",
      colour: PRICE_LINE,
      width: PRICE_WIDTH,
      points: pe,
      thresholds: median === null ? [] : [{ value: median, label: "Median" }],
    },
    {
      kind: "line",
      label: "Price to book",
      colour: OSCILLATOR,
      width: PRICE_WIDTH,
      pane: 1,
      points: points((one) => one.pb),
    },
    {
      kind: "line",
      label: "EPS (annual, ₹)",
      colour: CANDLE_UP,
      width: PRICE_WIDTH,
      pane: 2,
      points: points((one) => one.eps),
    },
  ];
  return candidates.filter((one) => one.points.length > 0);
}

/** A multiple, for the meter. */
function multiple(value: number): string {
  return `${value.toFixed(1)}×`;
}

/** A multiple, from the platform's string. */
function multipleOf(value: string): string {
  return `${formatPrice(value)}×`;
}
