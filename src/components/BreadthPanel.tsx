/**
 * Market breadth, read in one glance.
 *
 * An index is a weighted handful of its largest members, so it can rise on
 * five companies while four hundred fall. This shows the participants, in
 * the order a reader asks about them: how today went, how it is trending,
 * and how much of the market is above water.
 */

import type { BreadthResponse, BreadthSession } from "@/api/client";
import { Meter } from "@/components/Meter";
import { Sparkline } from "@/components/Sparkline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeOscillator } from "@/lib/breadthReadings";
import { ABSENT, formatDay, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BreadthPanelProps {
  breadth: BreadthResponse | null;
  loading?: boolean;
}

/**
 * Show one population's breadth.
 *
 * @param props - The reading, and whether it is still arriving.
 * @returns The panel.
 */
export function BreadthPanel({ breadth, loading = false }: BreadthPanelProps): React.JSX.Element {
  const latest = breadth?.latest ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market breadth</CardTitle>
        <CardDescription>
          {latest === null
            ? loading
              ? "Counting…"
              : "Nothing counted yet"
            : `${String(latest.instruments)} instruments · ${formatDay(latest.as_of)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Participation latest={latest} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Meter label="Above 20-day" percent={toNumber(latest?.above_sma_20)} />
          <Meter label="Above 50-day" percent={toNumber(latest?.above_sma_50)} />
          <Meter label="Above 200-day" percent={toNumber(latest?.above_sma_200)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Trend
            label="Advance–decline line"
            hint="Its direction matters, not its level"
            values={(breadth?.sessions ?? []).map((s) => toNumber(s.advance_decline_line))}
          />
          <Trend
            label="McClellan oscillator"
            hint={describeOscillator(toNumber(breadth?.mcclellan_oscillator))}
            values={(breadth?.sessions ?? []).map((s) => toNumber(s.mcclellan_oscillator))}
            reading={toNumber(breadth?.mcclellan_oscillator)}
          />
        </div>
        <Extremes latest={latest} highLow={toNumber(breadth?.high_low_index)} />
      </CardContent>
    </Card>
  );
}

/** The advance/decline split, as one proportional bar. */
function Participation({ latest }: { latest: BreadthSession | null }): React.JSX.Element {
  const advancing = latest?.advancing ?? 0;
  const declining = latest?.declining ?? 0;
  const unchanged = latest?.unchanged ?? 0;
  const total = advancing + declining + unchanged || 1;
  const share = (count: number): string => `${String((count / total) * 100)}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="tabular font-medium text-gain">{advancing} advancing</span>
        {unchanged > 0 && (
          <span className="tabular text-xs text-muted-foreground">{unchanged} unchanged</span>
        )}
        <span className="tabular font-medium text-loss">{declining} declining</span>
      </div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${String(advancing)} advancing, ${String(declining)} declining, ${String(unchanged)} unchanged`}
      >
        <div className="bg-gain" style={{ width: share(advancing) }} />
        <div className="bg-muted-foreground/40" style={{ width: share(unchanged) }} />
        <div className="bg-loss" style={{ width: share(declining) }} />
      </div>
    </div>
  );
}

/** One measure, as a shape with a word for what the shape means. */
function Trend({
  label,
  hint,
  values,
  reading,
}: {
  label: string;
  hint: string;
  values: (number | null)[];
  reading?: number | null;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        {reading !== undefined && (
          <span
            className={cn(
              "tabular font-medium",
              reading === null ? "text-muted-foreground" : reading > 0 ? "text-gain" : "text-loss",
            )}
          >
            {reading === null ? ABSENT : reading.toFixed(0)}
          </span>
        )}
      </div>
      <Sparkline values={values} baseline={0} label={label} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** New highs against new lows, which is the same question over a year. */
function Extremes({
  latest,
  highLow,
}: {
  latest: BreadthSession | null;
  highLow: number | null;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t pt-4 text-sm">
      <span>
        <span className="tabular font-medium text-gain">{latest?.new_highs ?? 0}</span>{" "}
        <span className="text-muted-foreground">at 52-week highs</span>
      </span>
      <span>
        <span className="tabular font-medium text-loss">{latest?.new_lows ?? 0}</span>{" "}
        <span className="text-muted-foreground">at lows</span>
      </span>
      <span className="text-muted-foreground">
        High–low index{" "}
        <span className="tabular font-medium text-foreground">
          {highLow === null ? ABSENT : `${highLow.toFixed(0)}%`}
        </span>
      </span>
      <span className="text-muted-foreground">
        TRIN{" "}
        <span className="tabular font-medium text-foreground">
          {latest?.arms_index == null ? ABSENT : Number(latest.arms_index).toFixed(2)}
        </span>
      </span>
    </div>
  );
}
