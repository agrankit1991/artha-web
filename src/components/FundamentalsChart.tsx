/**
 * A company's reported figures, drawn over the years.
 *
 * Two readings of the statement history the tables already carry: how the
 * business has grown -- revenue and profit over every year reported -- and
 * who has owned it, quarter by quarter. A table says what each year was; a
 * line says whether the years are going anywhere, which is what anybody
 * scanning fifteen of them wants to know.
 *
 * Revenue and profit sit in two panes. They are both in crore and a hundred
 * times apart, and on one axis the profit is a flat line along the bottom.
 */

import { useMemo } from "react";

import type { Statement } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { CANDLE_UP, OSCILLATOR, PRICE_LINE, PRICE_WIDTH } from "@/lib/chartPalette";
import { toNumber } from "@/lib/format";

interface GrowthChartProps {
  /** Every statement the company has filed. */
  statements: Statement[] | null;
  loading?: boolean;
}

/**
 * Revenue and profit over every year the company has reported.
 *
 * On the consolidated basis where it exists and standalone where it does
 * not, because the group is the business a shareholder owns; the basis
 * drawn is said in the legend.
 *
 * @param props - The statements.
 * @returns The chart.
 */
export function GrowthChart({ statements, loading = false }: GrowthChartProps): React.JSX.Element {
  const series = useMemo<Series[]>(() => {
    const annual = pick(statements, "INCOME_STATEMENT", "YEARLY");
    if (annual === null) {
      return [];
    }
    const basis = annual.basis === "CONSOLIDATED" ? "consolidated" : "standalone";
    const drawn: Series[] = [
      {
        kind: "line",
        label: `Revenue (${basis})`,
        colour: PRICE_LINE,
        width: PRICE_WIDTH,
        points: line(annual, "Revenue"),
      },
      {
        kind: "line",
        label: `Profit after tax (${basis})`,
        colour: CANDLE_UP,
        width: PRICE_WIDTH,
        pane: 1,
        thresholds: [{ value: 0 }],
        points: line(annual, "Profit After Tax"),
      },
    ];
    return drawn.filter((one) => one.points.length > 0);
  }, [statements]);

  return (
    <Chart
      series={series}
      scale="price"
      loading={loading}
      empty="No annual income statement filed for this company"
      paneHeight={140}
    />
  );
}

/** The holders the pattern is filed under, in the order it is read. */
const HOLDERS: { item: string; label: string; colour: string }[] = [
  { item: "promoters", label: "Promoters", colour: PRICE_LINE },
  { item: "fii", label: "Foreign institutions", colour: OSCILLATOR },
  { item: "mutual_funds", label: "Mutual funds", colour: CANDLE_UP },
  { item: "other_dii", label: "Other domestic institutions", colour: "#d97706" },
  { item: "retail_and_other", label: "Retail and others", colour: "#a855f7" },
];

/**
 * Who has owned the company, quarter by quarter.
 *
 * Five lines rather than a stacked band: a stack shows the whole and hides
 * the movement in any one part, and the movement -- promoters selling
 * down, institutions building -- is the reading.
 *
 * @param props - The statements.
 * @returns The chart.
 */
export function ShareholdingChart({
  statements,
  loading = false,
}: GrowthChartProps): React.JSX.Element {
  const series = useMemo<Series[]>(() => {
    const pattern = pick(statements, "SHAREHOLDING", "QUARTERLY");
    if (pattern === null) {
      return [];
    }
    return HOLDERS.map((holder): Series => ({
      kind: "line",
      label: holder.label,
      colour: holder.colour,
      width: PRICE_WIDTH,
      points: line(pattern, holder.item),
    })).filter((one) => one.points.length > 0);
  }, [statements]);

  return (
    <Chart
      series={series}
      scale="percent"
      loading={loading}
      empty="No shareholding pattern filed for this company"
    />
  );
}

/**
 * The statement to draw, preferring the consolidated basis.
 *
 * @param statements - Every statement filed.
 * @param kind - Which statement.
 * @param frequency - Which frequency.
 * @returns The statement, or null when none of that kind was filed.
 */
function pick(
  statements: Statement[] | null,
  kind: Statement["statement"],
  frequency: Statement["frequency"],
): Statement | null {
  const filed = (statements ?? []).filter(
    (one) => one.statement === kind && one.frequency === frequency,
  );
  return filed.find((one) => one.basis === "CONSOLIDATED") ?? filed[0] ?? null;
}

/**
 * One line item over the periods, oldest first, as points.
 *
 * @param statement - The statement.
 * @param lineItem - Which figure.
 * @returns The points a chart draws.
 */
function line(statement: Statement, lineItem: string): { time: string; value: number }[] {
  return [...statement.periods].reverse().flatMap((period) => {
    const figure = period.figures.find((one) => one.line_item === lineItem);
    const value = figure === undefined ? null : toNumber(figure.value);
    return value === null ? [] : [{ time: period.period_end, value }];
  });
}
