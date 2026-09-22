/**
 * Participation over time, as a grid: a row per population, a column per
 * session, each cell the share of members above a moving average.
 *
 * StockEdge's breadth view, and the densest way to see a rotation: a band
 * of red spreading across the rows is a market narrowing, before any index
 * says so. Colour is never the only carrier -- every cell names its
 * population, its session and its figure for a screen reader and a hover.
 */

import { Link } from "react-router-dom";

import type { BreadthSession } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Which moving average a cell measures members against. */
export type BreadthMeasure = "above_sma_20" | "above_sma_50" | "above_sma_200";

/** One row: a population and its counted sessions, oldest first. */
export interface HeatmapRow {
  key: string;
  label: string;
  href: string;
  sessions: BreadthSession[];
}

interface BreadthHeatmapProps {
  rows: HeatmapRow[];
  measure: BreadthMeasure;
  /** How the measure reads in a label, such as `50-day`. */
  measureLabel: string;
  loading?: boolean;
}

/** The five steps a share falls into, lowest first, with their colour. */
const STEPS: readonly { below: number; className: string; label: string }[] = [
  { below: 20, className: "bg-loss/80", label: "under 20%" },
  { below: 40, className: "bg-loss/40", label: "20–40%" },
  { below: 60, className: "bg-caution/45", label: "40–60%" },
  { below: 80, className: "bg-gain/40", label: "60–80%" },
  { below: Number.POSITIVE_INFINITY, className: "bg-gain/80", label: "80% and over" },
];

/**
 * Draw the grid.
 *
 * @param props - The populations, which share to show, and whether they are loading.
 * @returns The heatmap with its legend.
 */
export function BreadthHeatmap({
  rows,
  measure,
  measureLabel,
  loading = false,
}: BreadthHeatmapProps): React.JSX.Element {
  if (loading && rows.length === 0) {
    return <Skeleton className="h-48 w-full" />;
  }
  const drawn = rows.filter((row) => row.sessions.length > 0);
  const days = [...new Set(drawn.flatMap((row) => row.sessions.map((one) => one.as_of)))].sort();
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table
          aria-label={`Share above the ${measureLabel} average`}
          className="border-separate border-spacing-0.5"
        >
          <thead>
            <tr>
              <th className="sticky left-0 bg-card" />
              {days.map((day, position) => (
                <th
                  key={day}
                  scope="col"
                  className="px-0 text-[0.6rem] font-normal text-muted-foreground"
                >
                  {/* Every tenth session named, so the axis reads without crowding. */}
                  {position % 10 === 0 ? formatDay(day).replace(/ \d{4}$/, "") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drawn.map((row) => {
              const byDay = new Map(row.sessions.map((one) => [one.as_of, toNumber(one[measure])]));
              return (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className="sticky left-0 bg-card pr-3 text-left text-sm font-medium whitespace-nowrap"
                  >
                    <Link to={row.href} className="hover:text-primary hover:underline">
                      {row.label}
                    </Link>
                  </th>
                  {days.map((day) => {
                    const share = byDay.get(day) ?? null;
                    const text =
                      share === null
                        ? `${row.label}, ${formatDay(day)}: not counted`
                        : `${row.label}, ${formatDay(day)}: ${share.toFixed(0)}% above the ${measureLabel} average`;
                    return (
                      <td
                        key={day}
                        aria-label={text}
                        title={text}
                        className={cn(
                          "h-6 w-3 rounded-sm",
                          share === null ? "bg-muted" : stepOf(share).className,
                        )}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul
        aria-label="Legend"
        className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
      >
        {STEPS.map((step) => (
          <li key={step.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-3 w-3 rounded-sm", step.className)} />
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The step a share falls into. */
function stepOf(share: number): (typeof STEPS)[number] {
  // Unreachable fallback: the last step has no upper bound.
  return (
    STEPS.find((step) => share < step.below) ?? (STEPS[STEPS.length - 1] as (typeof STEPS)[number])
  );
}
