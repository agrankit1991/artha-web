/**
 * Every derived figure for one instrument the header does not already
 * give, grouped as they are read.
 *
 * Three groups, three across: what it has returned; where it stands in
 * its year and its trend, and how it is trading; and its momentum and
 * risk. The header above carries the level, the day's move and both
 * ranges, so none of those is repeated here: a close and a range met
 * twice in one screen is a reader checking whether they differ.
 *
 * Nothing here is computed in the browser. Every figure is the platform's,
 * so a reading on this page and the same reading in a rule or a backtest
 * cannot disagree.
 */

import type { InstrumentOverview } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Sparkline } from "@/components/Sparkline";
import { Card, CardContent } from "@/components/ui/card";
import {
  ABSENT,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatVolume,
  toNumber,
} from "@/lib/format";

interface InstrumentFiguresProps {
  overview: InstrumentOverview | null;
  loading?: boolean;
  /** The same figures over recent sessions, oldest first, for the shape beside each. */
  history?: InstrumentOverview[];
}

/**
 * Draw the figures.
 *
 * @param props - The instrument's latest snapshot.
 * @returns The panel.
 */
export function InstrumentFigures({
  overview,
  loading = false,
  history = [],
}: InstrumentFiguresProps): React.JSX.Element {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (overview === null) {
    return (
      <Empty
        title="No figures stored for this instrument yet"
        reason="The nightly rebuild found no recent sessions for it."
      />
    );
  }

  const { day, returns, year_range: range, trend, volume, momentum, risk } = overview;
  const trail = (of: (one: InstrumentOverview) => string | number | null): (number | null)[] =>
    history.map((one) => {
      const value = of(one);
      return value === null ? null : toNumber(String(value));
    });
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Group title="Returns">
        <Line
          label="1 week"
          delta={returns.one_week}
          trail={trail((one) => one.returns.one_week)}
          baseline={0}
        />
        <Line
          label="1 month"
          delta={returns.one_month}
          trail={trail((one) => one.returns.one_month)}
          baseline={0}
        />
        <Line
          label="3 months"
          delta={returns.three_months}
          trail={trail((one) => one.returns.three_months)}
          baseline={0}
        />
        <Line
          label="1 year"
          delta={returns.one_year}
          trail={trail((one) => one.returns.one_year)}
          baseline={0}
        />
        <Line label="YTD" delta={returns.year_to_date} />
      </Group>

      <Group title="Trend & volume">
        <Line label="From 52-week high" distance={range.from_high_percent} />
        <Line label="From 52-week low" distance={range.from_low_percent} />
        <Line label="Deepest fall in the year" distance={range.max_drawdown_percent} />
        <Line label="From 200-day" distance={trend.from_sma_200_percent} />
        <Line
          label="Sessions above it"
          value={
            trend.sessions_above_sma_200 === null ? ABSENT : String(trend.sessions_above_sma_200)
          }
        />
        <Line label="Volume" value={formatVolume(day.volume)} />
        <Line
          label="Against average"
          value={
            volume.relative_to_average === null
              ? ABSENT
              : formatMultiple(volume.relative_to_average)
          }
        />
        <Line label="Gap at the open" delta={day.gap_percent} />
      </Group>

      <Group title="Momentum & risk">
        {/* A level from nought to a hundred: no sign, one decimal. */}
        <Line label="RSI (14)" value={level(momentum.rsi)} />
        <Line label="MACD" value={figure(momentum.macd)} />
        <Line label="Signal" value={figure(momentum.macd_signal)} />
        <Line label="Histogram" value={figure(momentum.macd_histogram)} />
        <Line label="ATR (14)" value={figure(risk.average_true_range)} />
        <Line label="Volatility, 1 month" value={annualised(risk.volatility_month)} />
        <Line label="Volatility, 1 year" value={annualised(risk.volatility_year)} />
        <Line
          label="Streak"
          value={
            (trend.consecutive_rises ?? 0) > 0
              ? `${String(trend.consecutive_rises)} up`
              : (trend.consecutive_falls ?? 0) > 0
                ? `${String(trend.consecutive_falls)} down`
                : ABSENT
          }
        />
      </Group>
    </div>
  );
}

/** A reading from nought to a hundred, to one decimal. */
function level(value: string | null): string {
  const figure = toNumber(value);
  return figure === null ? ABSENT : figure.toFixed(1);
}

/** A plain figure, or a dash. */
function figure(value: string | null): string {
  return value === null ? ABSENT : formatPrice(value);
}

/** A volatility, which is an annualised percentage without a sign. */
function annualised(value: string | null): string {
  return value === null ? ABSENT : formatPercent(value).replace(/^\+/, "");
}

/** One group of readings. */
function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <dl className="space-y-1.5">{children}</dl>
      </CardContent>
    </Card>
  );
}

/**
 * One reading.
 *
 * A figure is given as a formatted value, as a change (which carries its
 * sign and colour), or as a distance (signed, but plain: 12% under the
 * year's high is where a price stands, not a fall). One of the three.
 */
function Line({
  label,
  value,
  delta,
  distance,
  trail,
  baseline,
}: {
  label: string;
  value?: string;
  delta?: string | null;
  distance?: string | null;
  /** The reading over recent sessions, drawn small beside it. */
  trail?: (number | null)[];
  /** A level the trail is read against, such as nought for a change. */
  baseline?: number;
}): React.JSX.Element {
  const shaped = trail !== undefined && trail.filter((one) => one !== null).length >= 2;
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2 tabular text-right font-medium">
        {shaped && (
          <Sparkline
            values={trail}
            {...(baseline === undefined ? {} : { baseline })}
            label={`${label} over recent sessions`}
            className="h-4 w-14 self-center bg-transparent"
          />
        )}
        {delta !== undefined ? (
          <Delta value={delta} />
        ) : distance !== undefined ? (
          <span className="text-muted-foreground">{formatPercent(distance)}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
