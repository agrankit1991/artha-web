/**
 * What a population of companies earned, period by period.
 *
 * The breadth idea applied to the statements: not how far an index moved
 * but how many of its companies grew, and by how much in total. Three
 * panes read the same series three ways -- the totals, how they grew
 * against a year before, and the share of companies growing -- and the
 * table beneath states every figure with the sample it was taken over,
 * because a growth rate over three companies is not the claim one over
 * three hundred is.
 */

import { useMemo } from "react";

import type { Cadence, Earnings, EarningsPeriod, GrowthFigure } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Hint } from "@/components/Hint";
import { CANDLE_UP, OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { ABSENT, formatDay, formatPrice, toNumber } from "@/lib/format";

interface EarningsPanelProps {
  earnings: Earnings | null;
  loading?: boolean;
  cadence: Cadence;
  onCadence: (cadence: Cadence) => void;
}

/** The two series on offer, and what each can say. */
export const CADENCES: { key: Cadence; label: string }[] = [
  { key: "annual", label: "Annual" },
  { key: "quarterly", label: "Quarterly" },
];

/** What each series can and cannot say, said once above the chart. */
const NOTES: Record<Cadence, string> = {
  annual:
    "Year on year, over every March year-end reported since 2011. Growth is taken over the companies present in both years.",
  quarterly:
    "Quarter on quarter over the quarters held. The provider keeps four quarters per company, so year on year appears only where the year-ago quarter is held.",
};

/**
 * Render the panel.
 *
 * @param props - The series, which cadence it is, and how to change it.
 * @returns The panel.
 */
export function EarningsPanel({
  earnings,
  loading = false,
  cadence,
  onCadence,
}: EarningsPanelProps): React.JSX.Element {
  const periods = useMemo(() => [...(earnings?.periods ?? [])].reverse(), [earnings]);
  const series = useMemo<Series[]>(() => drawn(periods), [periods]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">{NOTES[cadence]}</p>
        <Chooser options={CADENCES} chosen={cadence} onChange={onCadence} label="Series" />
      </div>
      {!loading && earnings !== null && earnings.periods.length === 0 ? (
        <Empty
          title="No statements held for these companies"
          reason="None of them has an income statement on record for this series."
        />
      ) : (
        <Chart
          series={series}
          scale="price"
          loading={loading}
          empty="No statements held for these companies"
          paneHeight={120}
        />
      )}
      <PeriodTable periods={earnings?.periods ?? []} loading={loading} cadence={cadence} />
    </div>
  );
}

/**
 * The three readings as series: totals, growth, and the share growing.
 *
 * @param periods - The periods, oldest first.
 * @returns The series to draw.
 */
function drawn(periods: EarningsPeriod[]): Series[] {
  if (periods.length === 0) {
    return [];
  }
  const points = (of: (one: EarningsPeriod) => string | null): { time: string; value: number }[] =>
    periods.flatMap((one) => {
      const value = toNumber(of(one));
      return value === null ? [] : [{ time: one.period_end, value }];
    });
  const candidates: Series[] = [
    {
      kind: "line",
      label: "Revenue (₹ crore)",
      colour: PRICE_LINE,
      width: PRICE_WIDTH,
      points: points((one) => one.revenue),
    },
    {
      kind: "line",
      label: "Profit (₹ crore)",
      colour: CANDLE_UP,
      width: PRICE_WIDTH,
      points: points((one) => one.profit),
    },
    {
      kind: "line",
      label: "Revenue growth, year on year",
      colour: PRICE_LINE,
      width: PRICE_WIDTH,
      pane: 1,
      scale: "percent",
      thresholds: [{ value: 0 }],
      points: points((one) => one.revenue_yoy?.percent ?? null),
    },
    {
      kind: "line",
      label: "Profit growth, year on year",
      colour: CANDLE_UP,
      width: PRICE_WIDTH,
      pane: 1,
      scale: "percent",
      points: points((one) => one.profit_yoy?.percent ?? null),
    },
    {
      kind: "line",
      label: "Share of companies growing revenue",
      colour: OSCILLATOR,
      width: PRICE_WIDTH,
      pane: 2,
      scale: "percent",
      thresholds: [{ value: 50, label: "Half" }],
      points: points((one) => one.revenue_yoy?.growing ?? null),
    },
  ];
  return candidates.filter((one) => one.points.length > 0);
}

/** Every period as a row, with each figure's sample beside it. */
function PeriodTable({
  periods,
  loading,
  cadence,
}: {
  periods: EarningsPeriod[];
  loading: boolean;
  cadence: Cadence;
}): React.JSX.Element {
  const columns = useMemo<Column<EarningsPeriod>[]>(() => {
    const always: Column<EarningsPeriod>[] = [
      {
        id: "period_end",
        header: "Period",
        accessorFn: (row) => row.period_end,
        cell: ({ row }) => (
          <span className="font-medium">{formatDay(row.original.period_end)}</span>
        ),
      },
      {
        id: "reported",
        header: "Reported",
        accessorFn: (row) => row.reported,
        cell: ({ row }) => row.original.reported,
        meta: { align: "right" },
      },
      {
        id: "revenue",
        header: "Revenue (₹ cr)",
        accessorFn: (row) => toNumber(row.revenue) ?? 0,
        cell: ({ row }) => crore(row.original.revenue),
        meta: { align: "right" },
      },
      {
        id: "profit",
        header: "Profit (₹ cr)",
        accessorFn: (row) => toNumber(row.profit) ?? 0,
        cell: ({ row }) => crore(row.original.profit),
        meta: { align: "right" },
      },
      growth("revenue_yoy", "Revenue YoY"),
      growth("profit_yoy", "Profit YoY"),
      {
        id: "growing",
        header: "Growing",
        accessorFn: (row) => toNumber(row.revenue_yoy?.growing ?? null) ?? -1,
        cell: ({ row }) => share(row.original.revenue_yoy),
        meta: { align: "right" },
      },
    ];
    return cadence === "quarterly"
      ? [...always, growth("revenue_qoq", "Revenue QoQ"), growth("profit_qoq", "Profit QoQ")]
      : always;
  }, [cadence]);

  return (
    <DataTable
      columns={columns}
      rows={periods}
      loading={loading}
      empty="No periods to show"
      placeholderRows={6}
      label="Earnings by period"
      full
      maxHeight="max-h-[28rem]"
    />
  );
}

/**
 * A column of growth against a comparison period, with its sample.
 *
 * @param field - Which comparison.
 * @param header - What to call it.
 * @returns The column. A period with no comparison sorts last.
 */
function growth(
  field: "revenue_yoy" | "profit_yoy" | "revenue_qoq" | "profit_qoq",
  header: string,
): Column<EarningsPeriod> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row[field]?.percent ?? null) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <GrowthCell figure={row.original[field]} />,
    meta: { align: "right" },
  };
}

/** One growth figure with the sample it was taken over. */
function GrowthCell({ figure }: { figure: GrowthFigure | null }): React.JSX.Element {
  if (figure === null) {
    return (
      <Hint text="No comparison period is held for these companies, or fewer than three of them reported in both.">
        <span className="text-muted-foreground">{ABSENT}</span>
      </Hint>
    );
  }
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      {figure.percent === null ? (
        <Hint text="The earlier total was nought or a loss, and growth from a loss is not a percentage anybody means. The totals still stand.">
          <span className="text-muted-foreground">n/a</span>
        </Hint>
      ) : (
        <Delta value={figure.percent} />
      )}
      <span className="text-[0.65rem] text-muted-foreground">n = {figure.sample}</span>
    </span>
  );
}

/** The share of companies growing, coloured by which side of half. */
function share(figure: GrowthFigure | null): React.JSX.Element | string {
  if (figure === null) {
    return ABSENT;
  }
  const value = toNumber(figure.growing) ?? 0;
  return <span className={value >= 50 ? "text-gain" : "text-loss"}>{value.toFixed(0)}%</span>;
}

/** A sum in crore, written whole. */
function crore(value: string | null): string {
  const figure = toNumber(value);
  return figure === null ? ABSENT : formatPrice(String(Math.round(figure)));
}
