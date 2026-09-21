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
import { Card, CardContent } from "@/components/ui/card";
import {
  ABSENT,
  formatDay,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatVolume,
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
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No figures stored for this instrument yet.
        </CardContent>
      </Card>
    );
  }

  const { day, returns, year_range: range, trend, volume, momentum } = overview;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Group title="Latest session" note={formatDay(overview.as_of)}>
        <Line label="Close" value={formatPrice(day.close)} />
        <Line label="Change" delta={day.change_percent} />
        <Line label="Open" value={formatPrice(day.open)} />
        <Line label="Day range" value={`${formatPrice(day.low)} – ${formatPrice(day.high)}`} />
        <Line label="Gap" delta={day.gap_percent} />
      </Group>

      <Group title="Returns">
        <Line label="1 week" delta={returns.one_week} />
        <Line label="1 month" delta={returns.one_month} />
        <Line label="3 months" delta={returns.three_months} />
        <Line label="1 year" delta={returns.one_year} />
        <Line label="This year" delta={returns.year_to_date} />
      </Group>

      <Group title="Its own year">
        <Line
          label="52-week high"
          value={formatPrice(range.high)}
          note={formatDay(range.high_day)}
        />
        <Line label="52-week low" value={formatPrice(range.low)} note={formatDay(range.low_day)} />
        <Line label="From high" delta={range.from_high_percent} />
        <Line label="From low" delta={range.from_low_percent} />
        <Line label="Deepest fall" delta={range.max_drawdown_percent} />
      </Group>

      <Group title="How it is trading">
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
              : `${formatMultiple(volume.relative_to_average)}×`
          }
        />
        <Line
          label="RSI"
          value={momentum.rsi === null ? ABSENT : formatPercent(momentum.rsi).replace("%", "")}
        />
      </Group>
    </div>
  );
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
