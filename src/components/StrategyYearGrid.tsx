/**
 * Every strategy's return in every year, as one coloured table.
 *
 * What worked each year once showed one year at a time; a strategy that led
 * one year and sank the next was only seen by clicking through. Here a row
 * is a strategy and a column a year, so a row that stays green is a
 * strategy that held up and a column that is red everywhere is a year
 * nothing escaped. The Nifty 500 leads as the row every column is read
 * against.
 *
 * Coloured as the heatmap colours a company's year (`src/lib/heatColour.ts`:
 * a ±50% reach, mixed in OKLab, text chosen by contrast), so the two agree
 * on what a strong year looks like. Every cell prints its figure too.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { YearReview } from "@/api/client";
import { percent } from "@/lib/backtestFigures";
import { useHeatPalette } from "@/hooks/useHeatPalette";
import { heatPaint, heatShare } from "@/lib/heatColour";
import { strategyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** The move a full colour stands for: a year's, as the heatmap's 1Y. */
const REACH = 50;

/** One row of the table: a name, where it leads, and its return by year. */
interface GridRow {
  key: string;
  name: string;
  href: string | null;
  byYear: Map<number, number | null>;
}

/**
 * Lay the reviews out as rows: the market first, then each strategy by name.
 *
 * @param reviews - One review per year.
 * @returns The years, oldest first, and the rows.
 */
export function gridOf(reviews: readonly YearReview[]): { years: number[]; rows: GridRow[] } {
  const years = reviews.map((review) => review.year).sort((a, b) => a - b);
  const market: GridRow = {
    key: "market",
    name: "Nifty 500",
    href: null,
    byYear: new Map(reviews.map((review) => [review.year, review.market?.nifty500 ?? null])),
  };
  const strategies = new Map<number, GridRow>();
  for (const review of reviews) {
    for (const one of review.strategies) {
      const row = strategies.get(one.strategy_id) ?? {
        key: String(one.strategy_id),
        name: one.name,
        href: strategyPath(one.strategy_id),
        byYear: new Map<number, number | null>(),
      };
      row.byYear.set(review.year, one.change);
      strategies.set(one.strategy_id, row);
    }
  }
  const named = [...strategies.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { years, rows: [market, ...named] };
}

/**
 * Render the table.
 *
 * @param props - The reviews, one per year.
 * @returns The table, scrolling sideways with the names held in place.
 */
export function StrategyYearGrid({
  reviews,
}: {
  reviews: readonly YearReview[];
}): React.JSX.Element {
  const palette = useHeatPalette();
  const { years, rows } = useMemo(() => gridOf(reviews), [reviews]);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table aria-label="Return by strategy and year" className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th scope="col" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium">
              Strategy
            </th>
            {years.map((year) => (
              <th key={year} scope="col" className="px-2 py-2 text-right font-medium tabular">
                {String(year)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={cn("border-b last:border-0", row.href === null && "font-medium")}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-[14rem] truncate bg-card px-3 py-1.5 text-left font-normal"
                title={row.name}
              >
                {row.href === null ? (
                  <span className="font-medium">{row.name}</span>
                ) : (
                  <Link to={row.href} className="text-primary hover:underline">
                    {row.name}
                  </Link>
                )}
              </th>
              {years.map((year) => {
                const change = row.byYear.get(year) ?? null;
                if (change === null) {
                  return (
                    <td key={year} className="px-2 py-1.5 text-right text-muted-foreground">
                      -
                    </td>
                  );
                }
                const paint = heatPaint(heatShare(change, REACH), palette);
                return (
                  <td
                    key={year}
                    className="px-2 py-1.5 text-right tabular"
                    style={{ backgroundColor: paint.fill, color: paint.ink }}
                  >
                    {percent(change)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
