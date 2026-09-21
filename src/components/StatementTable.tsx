/**
 * One financial statement: line items down, reporting periods across.
 *
 * The transpose of every other table on this site, and deliberately. A
 * statement is read down a column -- revenue, then what it cost, then what
 * was left -- and across a row to see whether that figure is growing. Rows
 * of periods would make both readings awkward and neither natural.
 *
 * The line items come from the platform rather than from whichever period
 * happens to be longest: a period may be missing any of them, and a row
 * that vanishes because the newest quarter has not reported it yet would
 * look like a figure that had ceased to exist.
 */

import { useMemo } from "react";

import type { Statement } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";

interface StatementTableProps {
  statement: Statement | null;
  loading?: boolean;
  /** What to say when the company has reported nothing of this kind. */
  empty?: string;
  /**
   * What this table is, for a reader who cannot see it. A page may show
   * more than one statement, and two tables answering to one name are
   * indistinguishable to anyone not looking at the screen.
   */
  label?: string;
}

/** One line item across every period, as a row of the table. */
interface Line {
  lineItem: string;
  units: string;
  /** What was reported in each period, by period end. */
  reported: Record<string, string | undefined>;
}

/**
 * Draw one statement.
 *
 * @param props - The statement, and whether it is still arriving.
 * @returns The table.
 */
export function StatementTable({
  statement,
  loading = false,
  empty = "Nothing reported",
  label = "Reported figures",
}: StatementTableProps): React.JSX.Element {
  const lines = useMemo(() => linesOf(statement), [statement]);

  const columns = useMemo<Column<Line>[]>(
    () => [
      {
        id: "line_item",
        header: "",
        accessorFn: (row) => row.lineItem,
        cell: ({ row }) => <span className="font-medium">{readable(row.original.lineItem)}</span>,
      },
      ...(statement?.periods ?? []).map((period): Column<Line> => ({
        id: period.period_end,
        header: heading(period.period_end),
        accessorFn: (row) => toNumber(row.reported[period.period_end] ?? null) ?? 0,
        cell: ({ row }) => written(row.original.reported[period.period_end], row.original.units),
        meta: { align: "right" },
      })),
    ],
    [statement],
  );

  return (
    <DataTable
      columns={columns}
      rows={lines}
      loading={loading}
      empty={empty}
      placeholderRows={6}
      label={label}
      full
      maxHeight="max-h-[32rem]"
    />
  );
}

/**
 * Turn periods of figures into one row per line item.
 *
 * @param statement - The statement, when one has arrived.
 * @returns The rows, in the order the statement reads.
 */
function linesOf(statement: Statement | null): Line[] {
  if (statement === null) {
    return [];
  }
  const units = new Map<string, string>();
  const reported = new Map<string, Record<string, string>>();
  for (const period of statement.periods) {
    for (const figure of period.figures) {
      units.set(figure.line_item, figure.units);
      const row = reported.get(figure.line_item) ?? {};
      row[period.period_end] = figure.value;
      reported.set(figure.line_item, row);
    }
  }
  return statement.line_items.map((lineItem) => ({
    lineItem,
    units: units.get(lineItem) ?? "",
    reported: reported.get(lineItem) ?? {},
  }));
}

/**
 * Write a figure the way its own units are read.
 *
 * @param value - What was reported, if anything was.
 * @param units - What the value is in.
 * @returns The figure, or a dash.
 */
function written(value: string | undefined, units: string): string {
  if (value === undefined) {
    return ABSENT;
  }
  return units === "percent" ? formatPercent(value) : formatPrice(value);
}

/**
 * Name a period by the quarter or year it ends.
 *
 * @param periodEnd - The last day of the period.
 * @returns A short heading.
 */
function heading(periodEnd: string): string {
  return formatDay(periodEnd);
}

/**
 * Make a provider's own label readable.
 *
 * The provider publishes some line items in prose (`Profit After Tax`) and
 * others as identifiers (`retail_and_other`), depending on which report
 * they came from. Shown as published, one statement reads like a document
 * and the next like a database.
 *
 * @param lineItem - The label as published.
 * @returns It, made readable.
 */
function readable(lineItem: string): string {
  if (!lineItem.includes("_")) {
    return lineItem;
  }
  const words = lineItem.split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
