/**
 * Every derived figure for one instrument, grouped as they are read.
 *
 * Four groups rather than one grid of twenty numbers: what it did today,
 * what it has returned, where it sits in its own year, and how it is
 * trading. A reader arrives with one of those four questions and should
 * not have to scan the other fifteen figures to find it.
 *
 * Nothing here is computed in the browser. Every figure is the platform's,
 * so a reading on this page and the same reading in a rule or a backtest
 * cannot disagree.
 */

import type { InstrumentOverview } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { RangeMeter } from "@/components/RangeMeter";
import { Card, CardContent } from "@/components/ui/card";
import {
  ABSENT,
  formatDay,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatVolume,
  toNumber,
} from "@/lib/format";

interface InstrumentFiguresProps {
  overview: InstrumentOverview | null;
  loading?: boolean;
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
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Group title="Latest Session" note={formatDay(overview.as_of)}>
        <Line label="Close" value={formatPrice(day.close)} />
        <Line label="Change" delta={day.change_percent} />
        <Line label="Open" value={formatPrice(day.open)} />
        <Line label="Gap" delta={day.gap_percent} />
        <RangeMeter
          label="Day range"
          low={toNumber(day.low)}
          high={toNumber(day.high)}
          value={toNumber(day.close)}
          format={(figure) => formatPrice(String(figure))}
          className="pt-1"
        />
      </Group>

      <Group title="Returns">
        <Line label="1 week" delta={returns.one_week} />
        <Line label="1 month" delta={returns.one_month} />
        <Line label="3 months" delta={returns.three_months} />
        <Line label="1 year" delta={returns.one_year} />
        <Line label="This year" delta={returns.year_to_date} />
      </Group>

      <Group title="52-Week Range">
        <Line
          label="52-week high"
          value={formatPrice(range.high)}
          note={formatDay(range.high_day)}
        />
        <Line label="52-week low" value={formatPrice(range.low)} note={formatDay(range.low_day)} />
        <Line label="From high" delta={range.from_high_percent} />
        <Line label="From low" delta={range.from_low_percent} />
        <Line label="Deepest fall" delta={range.max_drawdown_percent} />
        <RangeMeter
          label="Within the year"
          low={toNumber(range.low)}
          high={toNumber(range.high)}
          value={toNumber(day.close)}
          format={(figure) => formatPrice(String(figure))}
          className="pt-1"
        />
      </Group>

      <Group title="Trend & Volume">
        <Line label="From 200-day" delta={trend.from_sma_200_percent} />
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
        <Line
          label="RSI"
          value={momentum.rsi === null ? ABSENT : formatPercent(momentum.rsi).replace("%", "")}
        />
      </Group>

      <Group title="Momentum & Risk">
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
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {note !== undefined && <span className="text-xs text-muted-foreground">{note}</span>}
        </div>
        <dl className="space-y-1.5">{children}</dl>
      </CardContent>
    </Card>
  );
}

/**
 * One reading.
 *
 * A figure is given either as a formatted value or as a percentage change,
 * which carries its own sign and colour. Both at once would be two
 * readings pretending to be one.
 */
function Line({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value?: string;
  delta?: string | null;
  note?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular text-right font-medium">
        {delta === undefined ? value : <Delta value={delta} />}
        {note !== undefined && note !== ABSENT && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{note}</span>
        )}
      </dd>
    </div>
  );
}
