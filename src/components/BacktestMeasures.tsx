/**
 * A backtest's risk and streaks, period by period.
 *
 * The headline figures say how much; these say for how long and how it
 * felt: how deep the worst fall went and how long it took to come back,
 * the time spent below a previous high, the longest runs of rising and
 * falling days and months, what the trades won and lost and their longest
 * streaks, and how many companies were held. One row per measure, one
 * column per period, so a figure reads across in-sample and out of sample.
 */

import type {
  BacktestMoves,
  BacktestPeriod,
  BacktestPeriodDetail,
  BacktestStreak,
} from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { count, percent, ratio, share } from "@/lib/backtestFigures";
import { ABSENT, formatDay } from "@/lib/format";

/** The periods, in the order a reader compares them. */
const PERIODS = [
  ["out-of-sample", "Out of sample"],
  ["in-sample", "In-sample"],
  ["whole", "Whole stretch"],
] as const;

type Reading = (detail: BacktestPeriodDetail) => string;

/**
 * A streak in words.
 *
 * @param streak - The streak, or null.
 * @param unit - What it counts, singular.
 * @returns Something like `9 sessions, +12.4%`, or a dash.
 */
function streak(streak: BacktestStreak | null, unit: string): string {
  return streak === null ? ABSENT : `${count(streak.length, unit)}, ${percent(streak.change)}`;
}

/** Read one figure of the months, a dash when the period spans under two months. */
function monthly(read: (months: BacktestMoves) => string): Reading {
  return (detail) => (detail.months === null ? ABSENT : read(detail.months));
}

/** Every measure the table shows, in reading order. */
const MEASURES: [string, Reading][] = [
  [
    "Deepest fall",
    ({ deepest }) =>
      deepest === null
        ? ABSENT
        : `${percent(deepest.depth)} (${formatDay(deepest.peak)} → ${formatDay(deepest.trough)})`,
  ],
  [
    "It fell for",
    ({ deepest }) => (deepest === null ? ABSENT : count(deepest.sessions_down, "session")),
  ],
  [
    "It recovered in",
    ({ deepest }) =>
      deepest === null
        ? ABSENT
        : deepest.sessions_to_recover === null
          ? "not recovered"
          : count(deepest.sessions_to_recover, "session"),
  ],
  ["Longest below a high", ({ longest_underwater }) => count(longest_underwater, "session")],
  ["Time below a high", ({ underwater }) => share(underwater)],
  ["Best day", ({ days }) => percent(days.best)],
  ["Worst day", ({ days }) => percent(days.worst)],
  ["Days that rose", ({ days }) => share(days.rising)],
  ["Longest run of rising days", ({ days }) => streak(days.longest_rise, "session")],
  ["Longest run of falling days", ({ days }) => streak(days.longest_fall, "session")],
  ["Best month", monthly((months) => percent(months.best))],
  ["Worst month", monthly((months) => percent(months.worst))],
  ["Months that rose", monthly((months) => share(months.rising))],
  ["Longest run of rising months", monthly((months) => streak(months.longest_rise, "month"))],
  ["Longest run of falling months", monthly((months) => streak(months.longest_fall, "month"))],
  ["Largest winning trade", ({ outcomes }) => percent(outcomes.largest_win)],
  ["Largest losing trade", ({ outcomes }) => percent(outcomes.largest_loss)],
  ["Average win", ({ outcomes }) => percent(outcomes.average_win)],
  ["Average loss", ({ outcomes }) => percent(outcomes.average_loss)],
  ["Profit factor", ({ outcomes }) => ratio(outcomes.profit_factor)],
  ["Most winning trades in a row", ({ outcomes }) => streak(outcomes.winning_streak, "trade")],
  ["Most losing trades in a row", ({ outcomes }) => streak(outcomes.losing_streak, "trade")],
  [
    "Companies held",
    ({ holdings }) =>
      `${String(holdings.fewest)}–${String(holdings.most)}, ${holdings.average.toFixed(1)} on average`,
  ],
];

interface MeasureRow {
  measure: string;
  readings: Record<string, string>;
}

const COLUMNS: Column<MeasureRow>[] = [
  {
    id: "measure",
    header: "Measure",
    accessorFn: (row) => row.measure,
    cell: ({ row }) => <span className="font-medium">{row.original.measure}</span>,
  },
  ...PERIODS.map(([name, header]): Column<MeasureRow> => ({
    id: name,
    header,
    accessorFn: (row) => row.readings[name] ?? ABSENT,
    cell: ({ row }) => row.original.readings[name] ?? ABSENT,
    meta: { align: "right" },
  })),
];

interface BacktestMeasuresProps {
  periods: BacktestPeriod[];
}

/**
 * Draw the measures, or nothing for a backtest kept before they existed.
 *
 * @param props - The backtest's periods.
 * @returns The table, or null.
 */
export function BacktestMeasures({ periods }: BacktestMeasuresProps): React.JSX.Element | null {
  const details = new Map(
    periods.flatMap((period) =>
      period.detail === null || period.detail === undefined ? [] : [[period.name, period.detail]],
    ),
  );
  if (details.size === 0) {
    return null;
  }
  const rows = MEASURES.map(([measure, read]) => ({
    measure,
    readings: Object.fromEntries(
      [...details].map(([name, detail]) => [name, read(detail)] as const),
    ),
  }));
  return <DataTable columns={COLUMNS} rows={rows} label="Risk and streaks" />;
}
