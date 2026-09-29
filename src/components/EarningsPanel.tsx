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

import { useMemo, useState } from "react";

import type { Cadence, Earnings, EarningsPeriod, GrowthFigure } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { GrowingShare, GrowthCell } from "@/components/GrowthCell";
import { Button } from "@/components/ui/button";
import { OSCILLATOR, PRICE_WIDTH, PROFIT, REVENUE } from "@/lib/chartPalette";
import { broadGrowth, broadPeriods } from "@/lib/earningsCoverage";
import { ABSENT, formatDay, formatWhole, toNumber } from "@/lib/format";

interface EarningsPanelProps {
  earnings: Earnings | null;
  loading?: boolean;
  cadence: Cadence;
  /**
   * How to change the cadence, when the panel offers the choice itself.
   * A page whose other sections follow the same choice puts it in its
   * header instead and leaves this out.
   */
  onCadence?: (cadence: Cadence) => void;
}

/** The two series on offer, and what each can say. */
export const CADENCES: { key: Cadence; label: string }[] = [
  { key: "annual", label: "Annual" },
  { key: "quarterly", label: "Quarterly" },
];

/** What each series can and cannot say, said once above the chart. */
export const NOTES: Record<Cadence, string> = {
  annual:
    "Year on year, over the companies present in both years. The chart draws what most of these companies reported: the years most of them filed, and growth where most were present in both. A company whose year ends in another month, and the few whose statements reach further back, are listed under every period end.",
  quarterly:
    "Quarter on quarter, over the companies present in both quarters, drawn where most of them were. The provider keeps four quarters per company, so a year-ago quarter is seldom held: year on year is listed in the table, with its small sample, and not drawn.",
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
  // Oldest first for the chart, and only the periods that speak for the
  // population: see `broadPeriods`.
  const series = useMemo<Series[]>(
    () => drawn(broadPeriods([...(earnings?.periods ?? [])].reverse()), cadence),
    [earnings, cadence],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">{NOTES[cadence]}</p>
        {onCadence !== undefined && (
          <Chooser options={CADENCES} chosen={cadence} onChange={onCadence} label="Series" />
        )}
      </div>
      {!loading && earnings !== null && earnings.periods.length === 0 ? (
        <Empty
          title="No statements held for these companies"
          reason="None of them has an income statement on record for this series."
        />
      ) : (
        <Chart
          series={series}
          scale="crore"
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
 * Growth is year on year for the annual series and quarter on quarter for
 * the quarterly one, whose year-ago quarter is held for a handful of
 * companies: on the market's latest quarter, 123 against 3,911.
 *
 * @param periods - The periods to draw, oldest first.
 * @param cadence - Which series they are.
 * @returns The series to draw.
 */
function drawn(periods: EarningsPeriod[], cadence: Cadence): Series[] {
  if (periods.length === 0) {
    return [];
  }
  const points = (of: (one: EarningsPeriod) => string | null): { time: string; value: number }[] =>
    periods.flatMap((one) => {
      const value = toNumber(of(one));
      return value === null ? [] : [{ time: one.period_end, value }];
    });
  const quarterly = cadence === "quarterly";
  const against = quarterly ? "quarter on quarter" : "year on year";
  const revenueGrowth = broadGrowth(periods, (one) => growthOf(one, "revenue", cadence));
  const profitGrowth = broadGrowth(periods, (one) => growthOf(one, "profit", cadence));
  const candidates: Series[] = [
    {
      kind: "line",
      label: "Revenue (₹ cr)",
      colour: REVENUE,
      width: PRICE_WIDTH,
      points: points((one) => one.revenue),
    },
    {
      kind: "line",
      label: "Profit (₹ cr)",
      colour: PROFIT,
      width: PRICE_WIDTH,
      points: points((one) => one.profit),
    },
    {
      kind: "line",
      label: `Revenue growth, ${against}`,
      colour: REVENUE,
      width: PRICE_WIDTH,
      pane: 1,
      scale: "percent",
      thresholds: [{ value: 0 }],
      points: points((one) => revenueGrowth(one)?.percent ?? null),
    },
    {
      kind: "line",
      label: `Profit growth, ${against}`,
      colour: PROFIT,
      width: PRICE_WIDTH,
      pane: 1,
      scale: "percent",
      points: points((one) => profitGrowth(one)?.percent ?? null),
    },
    {
      kind: "line",
      label: "Share of companies growing revenue",
      colour: OSCILLATOR,
      width: PRICE_WIDTH,
      pane: 2,
      scale: "percent",
      thresholds: [{ value: 50, label: "Half" }],
      points: points((one) => revenueGrowth(one)?.growing ?? null),
    },
  ];
  return candidates.filter((one) => one.points.length > 0);
}

/**
 * The comparison a cadence is read by: a year before for the annual
 * series, a quarter before for the quarterly one, whose year-ago quarter is
 * seldom held.
 *
 * @param period - The period.
 * @param figure - Revenue or profit.
 * @param cadence - Which series it belongs to.
 * @returns The growth figure, or null where none is held.
 */
function growthOf(
  period: EarningsPeriod,
  figure: "revenue" | "profit",
  cadence: Cadence,
): GrowthFigure | null {
  return period[`${figure}_${cadence === "quarterly" ? "qoq" : "yoy"}`];
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
  const [every, setEvery] = useState(false);
  const broad = useMemo(() => broadPeriods(periods), [periods]);
  const hidden = periods.length - broad.length;
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
        accessorFn: (row) => toNumber(growthOf(row, "revenue", cadence)?.growing ?? null) ?? -1,
        cell: ({ row }) => <GrowingShare figure={growthOf(row.original, "revenue", cadence)} />,
        meta: { align: "right" },
      },
    ];
    return cadence === "quarterly"
      ? [...always, growth("revenue_qoq", "Revenue QoQ"), growth("profit_qoq", "Profit QoQ")]
      : always;
  }, [cadence]);

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        rows={every ? periods : broad}
        loading={loading}
        empty="No periods to show"
        placeholderRows={6}
        label="Earnings by period"
        full
        maxHeight="28rem"
      />
      {hidden > 0 && (
        <Button
          variant="link"
          size="sm"
          // A link's length on a phone: it wraps rather than widen the page.
          className="h-auto whitespace-normal px-0 text-left"
          onClick={() => {
            setEvery(!every);
          }}
        >
          {every
            ? "Show only the periods most companies reported"
            : `Show every period end (${String(hidden)} more, each reported by fewer companies)`}
        </Button>
      )}
    </div>
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

/** A sum in crore, written whole. */
function crore(value: string | null): string {
  const figure = toNumber(value);
  return figure === null ? ABSENT : formatWhole(figure);
}
