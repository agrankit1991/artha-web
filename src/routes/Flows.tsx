/**
 * What foreign and domestic institutions bought and sold.
 *
 * StockEdge's FII/DII page, which Indian market readers open daily: the
 * cash market's net buying for each side beside the Nifty's close, so a
 * run of foreign selling can be read against what the index did; and
 * foreign positioning in index and stock derivatives. Figures are rupees
 * crore, written once in each column's heading.
 */

import { useCallback, useMemo, useState } from "react";

import {
  type FlowPeriod,
  type FlowSegment,
  type InstitutionalFlow,
  type InstrumentOverview,
  fetchFlows,
  fetchOverviewHistory,
} from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { DivergingBar } from "@/components/DivergingBars";
import { Failed } from "@/components/Failed";
import { FlowBars } from "@/components/FlowBars";
import { PageHeader } from "@/components/PageHeader";
import { RangeSelector } from "@/components/RangeSelector";
import { StatGrid, StatTile } from "@/components/StatTile";
import { type Tab, Tabs } from "@/components/Tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import {
  ABSENT,
  formatCroreSigned,
  formatDay,
  formatPercent,
  formatPrice,
  formatSignedPrice,
  sentence,
  toNumber,
} from "@/lib/format";
import {
  BENCHMARK as CHART_BENCHMARK,
  coloured,
  PRICE_LINE,
  PRICE_WIDTH,
} from "@/lib/chartPalette";
import { BENCHMARK } from "@/lib/indices";
import type { Range } from "@/lib/priceRanges";

/** How many sessions or months a page of flows reads. */
const SESSIONS = 60;

/**
 * The windows the running totals offer, by period: sessions for daily
 * flows, months for monthly ones. The platform serves at most 400 at once,
 * so a year is the longest daily window.
 */
const WINDOWS: Record<FlowPeriod, readonly Range[]> = {
  DAY: [
    { label: "1M", sessions: 21 },
    { label: "50D", sessions: 50 },
    { label: "3M", sessions: 63 },
    { label: "6M", sessions: 126 },
    { label: "1Y", sessions: 252 },
  ],
  MONTH: [
    { label: "6M", sessions: 6 },
    { label: "1Y", sessions: 12 },
    { label: "2Y", sessions: 24 },
    { label: "5Y", sessions: 60 },
  ],
};

/** Where the running totals open: about the page's own reach. */
const OPENING_WINDOW: Record<FlowPeriod, number> = { DAY: 63, MONTH: 60 };

/** How many sessions the "last few" totals sum over. */
const RECENT = 5;

const PERIODS: { key: FlowPeriod; label: string }[] = [
  { key: "DAY", label: "Daily" },
  { key: "MONTH", label: "Monthly" },
];

type View = "cash" | "derivatives";

const VIEWS: Tab<View>[] = [
  { key: "cash", label: "Cash market" },
  { key: "derivatives", label: "FII derivatives" },
];

const SEGMENTS: { key: Exclude<FlowSegment, "CASH">; label: string }[] = [
  { key: "INDEX_FUTURES", label: "Index futures" },
  { key: "STOCK_FUTURES", label: "Stock futures" },
  { key: "INDEX_OPTIONS", label: "Index options" },
  { key: "STOCK_OPTIONS", label: "Stock options" },
];

/** One session of the cash market: both sides, and the benchmark beside them. */
interface CashDay {
  day: string;
  fii: InstitutionalFlow | undefined;
  dii: InstitutionalFlow | undefined;
  benchmark: InstrumentOverview | undefined;
}

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Flows(): React.JSX.Element {
  const [period, setPeriod] = useState<FlowPeriod>("DAY");
  const [view, setView] = useState<View>("cash");
  const [segment, setSegment] = useState<Exclude<FlowSegment, "CASH">>("INDEX_FUTURES");

  const load = useCallback(() => fetchFlows(period, SESSIONS), [period]);
  const flows = useResource(load);
  const loadBenchmark = useCallback(() => fetchOverviewHistory(BENCHMARK.key, SESSIONS), []);
  const benchmark = useResource(loadBenchmark);

  const cash = useMemo(
    () => cashDays(flows.data ?? [], benchmark.data ?? [], period),
    [flows.data, benchmark.data, period],
  );

  const derivatives = useMemo(
    () => (flows.data ?? []).filter((one) => one.participant === "FII" && one.segment === segment),
    [flows.data, segment],
  );

  const latest = cash[0];
  // Tiles and bars hold their place while the first flows arrive.
  const arriving = flows.loading && flows.data === null;
  const recent = cash.slice(0, RECENT);
  const unit = period === "DAY" ? "session" : "month";

  return (
    <div className="space-y-6">
      <PageHeader
        title="FII / DII flows"
        description="What foreign and domestic institutions bought and sold, in rupees crore, as the exchange reports it after each session. Foreign derivatives positioning is on its own tab."
        actions={<Chooser options={PERIODS} chosen={period} onChange={setPeriod} label="Period" />}
      />

      {flows.error !== null && <Failed message={flows.error} />}

      <StatGrid>
        <StatTile
          label={`FII net, latest ${unit}`}
          value={<Delta value={latest?.fii?.net_amount} format={formatCroreSigned} arrow={false} />}
          loading={arriving}
          {...(latest === undefined ? {} : { hint: formatDay(latest.day) })}
        />
        <StatTile
          label={`DII net, latest ${unit}`}
          value={<Delta value={latest?.dii?.net_amount} format={formatCroreSigned} arrow={false} />}
          loading={arriving}
          {...(latest === undefined ? {} : { hint: formatDay(latest.day) })}
        />
        <StatTile
          label={`FII net, last ${String(recent.length)} ${unit}s`}
          value={
            <Delta
              value={total(recent.map((one) => one.fii))}
              format={formatCroreSigned}
              arrow={false}
            />
          }
          loading={arriving}
        />
        <StatTile
          label={`DII net, last ${String(recent.length)} ${unit}s`}
          value={
            <Delta
              value={total(recent.map((one) => one.dii))}
              format={formatCroreSigned}
              arrow={false}
            />
          }
          loading={arriving}
        />
      </StatGrid>

      <Tabs tabs={VIEWS} active={view} onChange={setView} label="Market">
        {view === "cash" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Net buying, oldest to latest</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(["fii", "dii"] as const).map((side) => (
                  <div key={side} className="space-y-1">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      {side === "fii" ? "Foreign (FII/FPI)" : "Domestic (DII)"}
                    </div>
                    <FlowBars
                      label={`${side.toUpperCase()} net buying by ${unit}`}
                      bars={[...cash].reverse().map((one) => ({
                        day: one.day,
                        net: one[side]?.net_amount ?? null,
                        title: `${formatDay(one.day)}: ${formatCroreSigned(one[side]?.net_amount)}`,
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Its own window, so a year of totals does not load a year of rows below. */}
            <CumulativeFlows key={period} period={period} />
            <DataTable
              columns={cashColumns(period, cash)}
              rows={cash}
              loading={flows.loading}
              empty="No flows recorded yet"
              placeholderRows={10}
              label="Cash market flows"
              full
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Chooser options={SEGMENTS} chosen={segment} onChange={setSegment} label="Segment" />
            <LongShare
              rows={derivatives}
              segment={SEGMENTS.find((one) => one.key === segment)?.label ?? ""}
              loading={arriving}
            />
            <DataTable
              columns={DERIVATIVE_COLUMNS}
              rows={derivatives}
              loading={flows.loading}
              empty="No derivatives flows recorded yet"
              placeholderRows={10}
              label="FII derivatives flows"
              full
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}

/**
 * Lay flows out as cash-market days: both sides, and the benchmark beside them.
 *
 * @param rows - The flows, any segment.
 * @param closes - The benchmark's history; matched only to sessions.
 * @param period - Sessions or months.
 * @returns A row per day or month, newest first.
 */
function cashDays(
  rows: readonly InstitutionalFlow[],
  closes: readonly InstrumentOverview[],
  period: FlowPeriod,
): CashDay[] {
  const byDay = new Map(closes.map((one) => [one.as_of, one]));
  const days = [...new Set(rows.map((one) => one.day))].sort().reverse();
  return days.map((day) => ({
    day,
    fii: rows.find((one) => one.day === day && one.participant === "FII" && one.segment === "CASH"),
    dii: rows.find((one) => one.day === day && one.participant === "DII" && one.segment === "CASH"),
    // A month's row is dated its first day; the index is only matched to sessions.
    benchmark: period === "DAY" ? byDay.get(day) : undefined,
  }));
}

/** The sum of some flows' net figures, or null when none is known. */
function total(flows: (InstitutionalFlow | undefined)[]): string | null {
  const known = flows.flatMap((one) => {
    const value = toNumber(one?.net_amount);
    return value === null ? [] : [value];
  });
  return known.length === 0 ? null : known.reduce((sum, one) => sum + one, 0).toFixed(2);
}

/** A column of rupees crore, bought or sold. */
function amount<Row>(
  id: string,
  header: string,
  of: (row: Row) => string | null | undefined,
): Column<Row> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => formatPrice(of(row.original)),
    meta: { align: "right" },
  };
}

/**
 * A net column: signed, coloured by which way the money went, and drawn as
 * a bar under the figure when given the column's reach, so a run of selling
 * shows down the column as the Breadth grid's shares do.
 *
 * @param id - The column's id.
 * @param header - Its heading, with the unit.
 * @param of - The figure.
 * @param reach - The largest figure in the column either way, for the bars;
 *   none draws the figures alone.
 * @param format - How a figure is written.
 * @returns The column.
 */
function net<Row>(
  id: string,
  header: string,
  of: (row: Row) => string | null | undefined,
  reach?: number,
  format: (value: string | null | undefined) => string = formatSignedPrice,
): Column<Row> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    // Bare in a cell; the unit is in the column's header.
    cell: ({ row }) => {
      const value = toNumber(of(row.original));
      return (
        <span className="inline-flex flex-col items-end gap-1">
          <Delta value={of(row.original)} format={format} arrow={false} />
          {reach !== undefined && value !== null && (
            <DivergingBar value={value} largest={reach} className="h-1.5 w-24" tone />
          )}
        </span>
      );
    },
    meta: { align: "right" },
  };
}

/**
 * The largest figure of a column, either way, for its bars.
 *
 * @param rows - The column's rows.
 * @param of - The figure.
 * @returns The largest size, never nought.
 */
function reachOf<Row>(rows: readonly Row[], of: (row: Row) => string | null | undefined): number {
  return Math.max(...rows.map((row) => Math.abs(toNumber(of(row)) ?? 0)), Number.EPSILON);
}

/** The cash market's columns; the benchmark only beside sessions, not months. */
function cashColumns(period: FlowPeriod, rows: readonly CashDay[]): Column<CashDay>[] {
  const fii = (row: CashDay): string | null | undefined => row.fii?.net_amount;
  const dii = (row: CashDay): string | null | undefined => row.dii?.net_amount;
  const moved = (row: CashDay): string | null | undefined => row.benchmark?.day.change_percent;
  return [
    {
      id: "day",
      header: period === "DAY" ? "Session" : "Month",
      accessorFn: (row) => row.day,
      cell: ({ row }) => <span className="font-medium">{formatDay(row.original.day)}</span>,
    },
    amount("fii_buy", "FII buy ₹ Cr", (row) => row.fii?.buy_amount),
    amount("fii_sell", "FII sell ₹ Cr", (row) => row.fii?.sell_amount),
    net("fii_net", "FII net ₹ Cr", fii, reachOf(rows, fii)),
    amount("dii_buy", "DII buy ₹ Cr", (row) => row.dii?.buy_amount),
    amount("dii_sell", "DII sell ₹ Cr", (row) => row.dii?.sell_amount),
    net("dii_net", "DII net ₹ Cr", dii, reachOf(rows, dii)),
    ...(period === "DAY"
      ? [
          amount<CashDay>("benchmark", BENCHMARK.name, (row) => row.benchmark?.day.close),
          net<CashDay>(
            "benchmark_change",
            `${BENCHMARK.name} %`,
            moved,
            reachOf(rows, moved),
            formatPercent,
          ),
        ]
      : []),
  ];
}

/** Share of contracts held long, of all held long or short. */
function longShare(row: InstitutionalFlow): string | null {
  const long = row.long_contracts;
  const short = row.short_contracts;
  if (long === null || short === null || long + short === 0) {
    return null;
  }
  return ((long / (long + short)) * 100).toFixed(1);
}

const DERIVATIVE_COLUMNS: Column<InstitutionalFlow>[] = [
  {
    id: "day",
    header: "Date",
    accessorFn: (row) => row.day,
    cell: ({ row }) => <span className="font-medium">{formatDay(row.original.day)}</span>,
  },
  amount("buy", "Buy ₹ Cr", (row) => row.buy_amount),
  amount("sell", "Sell ₹ Cr", (row) => row.sell_amount),
  net("net", "Net ₹ Cr", (row) => row.net_amount),
  count("long", "Long", (row) => row.long_contracts),
  count("short", "Short", (row) => row.short_contracts),
  {
    id: "long_share",
    header: "Long %",
    accessorFn: (row) => toNumber(longShare(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const share = longShare(row.original);
      return share === null ? ABSENT : `${share}%`;
    },
    meta: { align: "right" },
  },
  count("oi", "Open interest", (row) => row.oi_contracts),
  amount("oi_amount", "OI ₹ Cr", (row) => row.oi_amount),
];

/** A column of contracts, grouped the Indian way. */
function count(
  id: string,
  header: string,
  of: (row: InstitutionalFlow) => number | null,
): Column<InstitutionalFlow> {
  return {
    id,
    header,
    accessorFn: (row) => of(row) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const value = of(row.original);
      return value === null ? ABSENT : value.toLocaleString("en-IN");
    },
    meta: { align: "right" },
  };
}

/**
 * Net buying added up over the window, FII and DII, with Nifty 50 in a pane
 * of its own below: whether foreigners have been selling into a market, and
 * what the market did meanwhile. Two panes rather than two scales on one.
 *
 * Its own window and its own request, apart from the page's: a year of
 * running totals is one line, a year of the table's rows is not.
 *
 * @param props - Whether the flows are by session or by month.
 * @returns The card.
 */
function CumulativeFlows({ period }: { period: FlowPeriod }): React.JSX.Element {
  const [span, setSpan] = useState(OPENING_WINDOW[period]);
  const load = useCallback(() => fetchFlows(period, span), [period, span]);
  const flows = useResource(load);
  const loadBenchmark = useCallback(
    () => (period === "DAY" ? fetchOverviewHistory(BENCHMARK.key, span) : Promise.resolve([])),
    [period, span],
  );
  const benchmark = useResource(loadBenchmark);
  const cash = useMemo(
    () => cashDays(flows.data ?? [], benchmark.data ?? [], period),
    [flows.data, benchmark.data, period],
  );
  const loading = flows.loading && flows.data === null;
  const oldest = cash.at(-1)?.day;
  // History is kept from the day the platform began collecting it; a window
  // reaching further back than that says so, not left to look like a quiet market.
  const short = flows.data !== null && oldest !== undefined && cash.length < span;
  const oldestFirst = [...cash].reverse();
  const running = (side: "fii" | "dii"): { time: string; value: number }[] => {
    let sum = 0;
    return oldestFirst.flatMap((one) => {
      const net = toNumber(one[side]?.net_amount);
      if (net === null) {
        return [];
      }
      sum += net;
      return [{ time: one.day, value: Math.round(sum * 100) / 100 }];
    });
  };
  const sides = coloured([
    { label: "FII, added up", side: "fii" as const },
    { label: "DII, added up", side: "dii" as const },
  ]);
  const series: Series[] = [
    ...sides.map((one) => ({
      kind: "line" as const,
      label: one.label,
      colour: one.colour,
      points: running(one.side),
      width: PRICE_WIDTH,
    })),
    // Only sessions carry the index; a month's row is dated its first day.
    ...(period === "DAY"
      ? [
          {
            kind: "line" as const,
            label: BENCHMARK.name,
            colour: CHART_BENCHMARK,
            pane: 1,
            scale: "price" as const,
            points: oldestFirst.flatMap((one) => {
              const close = toNumber(one.benchmark?.day.close);
              return close === null ? [] : [{ time: one.day, value: close }];
            }),
          },
        ]
      : []),
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle as="h2">Net buying, added up</CardTitle>
          <CardDescription>
            Each side&apos;s net buying summed from the start of the window, in rupees crore
            {period === "DAY" ? `, with ${BENCHMARK.name} below it` : ""}. A line falling steadily
            is a side selling session after session.
          </CardDescription>
        </div>
        <RangeSelector ranges={WINDOWS[period]} sessions={span} onChange={setSpan} label="Window" />
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Sums in crore, whole and grouped; the index keeps its own scale. A
            failure is said here quietly: the page above says it aloud. */}
        <Chart
          series={series}
          scale="crore"
          height={320}
          loading={loading}
          empty={flows.error === null ? "No flows recorded yet" : sentence(flows.error)}
        />
        {short && (
          <p className="text-xs text-muted-foreground">
            Flows are stored from {formatDay(oldest)}, so this window holds {String(cash.length)} of
            its {String(span)} {period === "DAY" ? "sessions" : "months"}; it fills in as they are
            collected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * How much of the FII's position in one segment was long, session by
 * session, against the even line: above half, more bought than sold short.
 *
 * @param props - The segment's rows, newest first, and what it is called.
 * @returns The chart.
 */
function LongShare({
  rows,
  segment,
  loading,
}: {
  rows: InstitutionalFlow[];
  segment: string;
  loading: boolean;
}): React.JSX.Element {
  const points = [...rows].reverse().flatMap((row) => {
    const share = toNumber(longShare(row));
    return share === null ? [] : [{ time: row.day, value: share }];
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">FII long share, {segment.toLowerCase()}</CardTitle>
        <CardDescription>
          Of the contracts foreign institutions held, the share that was long. Above the even line
          they held more bought than sold short.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Chart
          series={[
            {
              kind: "line",
              label: "Long share",
              colour: PRICE_LINE,
              width: PRICE_WIDTH,
              points,
              thresholds: [{ value: 50, label: "Even" }],
            },
          ]}
          scale="share"
          height={260}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}
