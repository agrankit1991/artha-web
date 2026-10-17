/**
 * How far a quarter's results season has come, as far as the platform holds results.
 *
 * SEBI gives a company 45 days after a quarter to publish its results (60
 * after March, with the audited year), so the deadline is certain; the day
 * each company announces is not known here. What the platform knows is when
 * a company's results first reached it, which is some days after the
 * announcement, so the count is of results held, never of results
 * announced, and the page says so. The companies load only when asked:
 * late in a season they are four thousand rows.
 */

import { useCallback, useState } from "react";

import { type ResultsSeason, type SeasonCompany, fetchSeasonCompanies } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Failed } from "@/components/Failed";
import { type Identity, nameColumn, symbolColumn } from "@/components/identityColumns";
import { Meter } from "@/components/Meter";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { daysBetween } from "@/lib/calendar";
import { EVENT_COLOURS } from "@/lib/chartPalette";
import { formatCount, formatDay, formatDayMonth } from "@/lib/format";
import { companyPath } from "@/lib/paths";

/** What the "held since" figure is, said once. */
const HELD_SINCE_HINT =
  "The day the platform first held the company's results for the quarter. Its provider carries results some days after a company announces them, so this is not the announcement's date.";

/**
 * A company as its columns show it: its symbol, or its ISIN when it has no listing today.
 *
 * @param row - The company.
 * @returns Its symbol and name.
 */
const identity = (row: SeasonCompany): Identity => ({
  symbol: row.symbol ?? row.isin,
  name: row.name,
});

const COLUMNS: Column<SeasonCompany>[] = [
  symbolColumn(identity),
  nameColumn(identity),
  {
    id: "seen_on",
    header: "Held since",
    accessorFn: (row) => row.seen_on,
    cell: ({ row }) => formatDay(row.original.seen_on),
    meta: { hint: HELD_SINCE_HINT, align: "right" },
  },
];

interface ResultsSeasonPanelProps {
  season: ResultsSeason;
  /** India's date today, for the days left. */
  today: string;
  /** When companies' statements were last fetched; null before the first fetch. */
  fetchedOn: string | null;
}

/**
 * Draw the season.
 *
 * @param props - The season and today.
 * @returns The panel.
 */
export function ResultsSeasonPanel({
  season,
  today,
  fetchedOn,
}: ResultsSeasonPanelProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const left = daysBetween(today, season.deadline);
  const percent = season.expected === 0 ? null : (season.held / season.expected) * 100;
  const busiest = Math.max(1, ...season.by_week.map((week) => week.companies));
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-panel font-semibold">{season.quarter} results</h3>
        <span className="text-sm text-muted-foreground">
          Due by {formatDay(season.deadline)}
          {left > 0 ? `, ${String(left)} days left` : left === 0 ? ", today" : ", passed"}
        </span>
      </div>
      {season.held === 0 && (
        <p className="text-sm">
          No company's {season.quarter} results are held yet. They arrive with the next fetch of
          statements after a company announces them.
        </p>
      )}
      <Meter
        label="Results held"
        percent={percent}
        caption={`${formatCount(season.held)} of about ${formatCount(season.expected)} companies, counting those that reported the quarter before. Held, not announced: results reach the platform some days after a company announces them.`}
      />
      <p className="text-xs text-muted-foreground">
        {fetchedOn === null
          ? "Companies' statements have not been fetched yet; they are fetched each Saturday."
          : `Companies' statements are fetched each Saturday; the last fetch finished on ${formatDay(fetchedOn)}.`}
      </p>
      {season.by_week.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Arrived each week</p>
          <ul className="space-y-1">
            {season.by_week.map((week) => (
              <li key={week.week} className="flex items-center gap-2 text-xs">
                <span className="tabular w-24 shrink-0 text-muted-foreground">
                  Week of {formatDayMonth(week.week)}
                </span>
                <span className="h-2 flex-1 rounded-full bg-muted">
                  <span
                    className="block h-2 rounded-full"
                    style={{
                      width: `${String((week.companies / busiest) * 100)}%`,
                      backgroundColor: EVENT_COLOURS.results,
                    }}
                  />
                </span>
                <span className="tabular w-12 shrink-0 text-right">
                  {formatCount(week.companies)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {open ? "Hide the companies" : "Show the companies"}
      </Button>
      {open && <SeasonCompanies quarterEnd={season.quarter_end} />}
    </div>
  );
}

/**
 * The companies whose results for the quarter are held, newest first.
 *
 * @param props - The quarter's last day.
 * @returns The table.
 */
function SeasonCompanies({ quarterEnd }: { quarterEnd: string }): React.JSX.Element {
  const load = useCallback(() => fetchSeasonCompanies(quarterEnd), [quarterEnd]);
  const companies = useResource(load);
  if (companies.error !== null) {
    return <Failed message={companies.error} />;
  }
  return (
    <DataTable
      columns={COLUMNS}
      rows={companies.data ?? []}
      loading={companies.loading}
      linkTo={(row) =>
        row.instrument_key === null || row.symbol === null
          ? null
          : companyPath(row.instrument_key, row.symbol)
      }
      label="Companies with results held"
      empty="No company's results for this quarter are held yet."
      maxHeight="24rem"
    />
  );
}
