/**
 * The strategies' returns in each calendar year, beside the market's.
 *
 * One row per strategy and one for the Nifty 500, one column per year,
 * newest first so the years that answer "what is working now" sit next to
 * the names. Those two years are tinted and their leaders named in words
 * above the table, the strategy that led each year is marked, and a figure
 * for only part of a year says so. Every column sorts, so a year can be
 * read as a ranking.
 */

import { Trophy } from "lucide-react";

import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ABSENT, formatDay, formatDayMonth, formatMonth, formatPercentTenths } from "@/lib/format";
import { NIFTY_500 } from "@/lib/indices";
import { populationPath } from "@/lib/paths";
import {
  RECENT_YEARS,
  RUNNING_YEAR,
  isLateStart,
  returnIn,
  yearLeaders,
  yearsCovered,
} from "@/lib/returnsByYear";
import {
  NIFTY_500_YEARS,
  STRATEGIES_DATA_THROUGH,
  SWITCH_SHUT_SINCE,
  type Strategy,
  type StrategyScan,
  scanPath,
} from "@/lib/scans";

/** One row: a strategy, or the market. */
interface YearRow {
  label: string;
  /** The lab's card id; null for the market's row. */
  id: string | null;
  /** Where its name leads: the strategy's screen, or the index's page. */
  path: string;
  years: Readonly<Record<number, number>>;
  /** The strategy behind the row; null for the market, which never leads a year. */
  strategy: Strategy | null;
}

interface ReturnsByYearProps {
  /** The strategies to compare, in the order their rows are shown. */
  scans: readonly StrategyScan[];
}

/**
 * Render the table in a card, with what its marks mean underneath.
 *
 * @param props - The strategies.
 * @returns The card.
 */
export function ReturnsByYear({ scans }: ReturnsByYearProps): React.JSX.Element {
  const strategies = scans.map((scan) => scan.strategy);
  const rows: YearRow[] = [
    ...scans.map((scan) => ({
      label: scan.label,
      id: scan.strategy.id,
      path: scanPath(scan),
      years: scan.strategy.years,
      strategy: scan.strategy,
    })),
    {
      label: NIFTY_500.name,
      id: null,
      path: populationPath("index", NIFTY_500.key),
      years: NIFTY_500_YEARS,
      strategy: null,
    },
  ];
  const years = yearsCovered(rows.map((row) => row.years));
  const lateStarts = strategies.filter((strategy) =>
    years.some((year) => isLateStart(strategy, year)),
  );

  const columns: Column<YearRow>[] = [
    {
      id: "strategy",
      header: "Strategy",
      accessorFn: (row) => row.label,
      cell: ({ row }) => (
        // Cells do not wrap; a strategy's name may, or the pinned column
        // would take most of a phone's width.
        <span className="flex w-40 flex-col whitespace-normal">
          <span className="font-medium">{row.original.label}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.id ?? "the market"}
          </span>
        </span>
      ),
    },
    ...years.map<Column<YearRow>>((year) => {
      const leaders = yearLeaders(strategies, year);
      return {
        id: String(year),
        header: () =>
          year === RUNNING_YEAR ? (
            <span className="flex flex-col items-end leading-tight">
              <span>{year}</span>
              <span className="text-[10px] font-normal">
                to {formatDayMonth(STRATEGIES_DATA_THROUGH)}
              </span>
            </span>
          ) : (
            String(year)
          ),
        accessorFn: (row) => row.years[year] ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => (
          <YearFigure
            row={row.original}
            year={year}
            leads={row.original.strategy !== null && leaders.includes(row.original.strategy.id)}
          />
        ),
        meta: { align: "right", emphasis: RECENT_YEARS.includes(year) },
      };
    }),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Returns by year</CardTitle>
        <p className="text-sm text-muted-foreground">
          Each strategy&apos;s return in each calendar year against the Nifty 500&apos;s, newest
          first. {RUNNING_YEAR} runs to {formatDayMonth(STRATEGIES_DATA_THROUGH)}. Choose a year to
          rank the strategies by it.
        </p>
        <RecentLeaders scans={scans} />
      </CardHeader>
      <CardContent className="space-y-3">
        <DataTable
          columns={columns}
          rows={rows}
          label="Returns by year"
          full
          maxHeight="max-h-none"
          linkTo={(row) => row.path}
        />
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            So far in {RUNNING_YEAR}, the strategies with a market switch have held gold since{" "}
            {formatDay(SWITCH_SHUT_SINCE)}, while momentum stocks kept rising without the Nifty 50;
            the baseline, always invested, never stepped out.
          </li>
          <li className="flex items-center gap-1">
            <Trophy aria-hidden="true" className="h-3 w-3 text-primary" />
            The best strategy that year. A figure for part of a year competes only when every figure
            that year is for part of it.
          </li>
          {lateStarts.length > 0 && (
            <li>
              * Part of the year:{" "}
              {lateStarts
                .map((strategy) => `${strategy.id} from ${formatMonth(strategy.tested.from)}`)
                .join(", ")}
              . The Nifty 500&apos;s figure for that year is the whole year.
            </li>
          )}
          <li>
            A strategy that re-picks every 21 sessions could have started its schedule on any of 21
            days. The years here follow one of those schedules; the return a year on each card is
            the median across all 21, so the years compound to a different figure: up to about 4
            points a year higher here.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The best strategy of the last whole year and of the running one, in
 * words, beside the market's return: the comparison a reader comes to the
 * table for, without reading it off two tinted columns.
 */
function RecentLeaders({ scans }: ReturnsByYearProps): React.JSX.Element {
  const strategies = scans.map((scan) => scan.strategy);
  return (
    <ul aria-label="Best of the recent years" className="space-y-1 pt-1 text-sm">
      {[...RECENT_YEARS].reverse().map((year) => {
        const leaders = yearLeaders(strategies, year);
        return (
          <li key={year}>
            <span className="font-medium">
              {year === RUNNING_YEAR
                ? `Best so far in ${String(year)} (to ${formatDayMonth(STRATEGIES_DATA_THROUGH)}):`
                : `Best in ${String(year)}:`}
            </span>{" "}
            {scans
              .filter((scan) => leaders.includes(scan.strategy.id))
              .map((scan) => (
                <span key={scan.key}>
                  {scan.label}{" "}
                  <Delta
                    value={returnIn(scan.strategy.years, year)}
                    format={formatPercentTenths}
                    arrow={false}
                  />{" "}
                </span>
              ))}
            <span className="text-muted-foreground">against the Nifty 500&apos;s</span>{" "}
            <Delta
              value={returnIn(NIFTY_500_YEARS, year)}
              format={formatPercentTenths}
              arrow={false}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** One year's figure for one row: a dash, or the return with its marks. */
function YearFigure({
  row,
  year,
  leads,
}: {
  row: YearRow;
  year: number;
  leads: boolean;
}): React.JSX.Element {
  const value = returnIn(row.years, year);
  if (value === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  const lateStart = row.strategy !== null && isLateStart(row.strategy, year);
  return (
    <span
      className={
        leads
          ? "inline-flex items-center gap-1 rounded-md bg-primary/10 px-1 font-semibold ring-1 ring-primary/30"
          : "inline-flex items-center gap-1"
      }
    >
      {leads && <Trophy aria-hidden="true" className="h-3 w-3 shrink-0 text-primary" />}
      <Delta value={value} format={formatPercentTenths} />
      {lateStart && (
        <>
          <sup className="text-muted-foreground" aria-hidden="true">
            *
          </sup>
          <span className="sr-only">(part of the year)</span>
        </>
      )}
      {leads && <span className="sr-only">(best that year)</span>}
    </span>
  );
}
