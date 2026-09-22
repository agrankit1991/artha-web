/**
 * The two columns that say which company a row is about.
 *
 * The previous project's tables, which the owner preferred, gave a company
 * two columns rather than one stacked cell: the trading symbol, in the
 * accent colour because it is the way through to the company's page, and
 * the full name beside it, carrying the streak badge where a list has one.
 * Both sort. Every company table builds them here, so the decision of what
 * a company looks like in a row is made once.
 */

import type { Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { ABSENT, formatStreak } from "@/lib/format";
import { cn } from "@/lib/utils";

/** What a row must say about its company to fill the two columns. */
export interface Identity {
  symbol: string;
  name: string | null;
}

interface SymbolColumnOptions<Row> {
  /** The column's heading; `Symbol` unless the rows are not all companies. */
  header?: string;
  /** Something drawn before the symbol, such as a chart series' colour. */
  lead?: (row: Row) => React.ReactNode;
}

/**
 * Build the symbol column.
 *
 * Meant to be a table's first column, which `DataTable` pins and turns
 * into the link to the row's page when given `linkTo`.
 *
 * @param identify - Reads the company's symbol and name from a row.
 * @param options - Heading and an optional leading mark.
 * @returns The column definition.
 */
export function symbolColumn<Row>(
  identify: (row: Row) => Identity,
  { header = "Symbol", lead }: SymbolColumnOptions<Row> = {},
): Column<Row> {
  return {
    id: "symbol",
    header,
    accessorFn: (row) => identify(row).symbol,
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-2">
        {lead?.(row.original)}
        <span className="truncate font-medium text-primary">{identify(row.original).symbol}</span>
      </span>
    ),
  };
}

/**
 * Build the name column.
 *
 * @param identify - Reads the company's symbol and name from a row.
 * @param streak - Sessions in a row the company has been on the list,
 *   when the table is a ranked list; drawn as a badge beside the name.
 * @returns The column definition.
 */
export function nameColumn<Row>(
  identify: (row: Row) => Identity,
  streak?: (row: Row) => number,
): Column<Row> {
  return {
    id: "name",
    header: "Name",
    accessorFn: (row) => identify(row).name ?? "",
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="max-w-[18rem] truncate">{identify(row.original).name ?? ABSENT}</span>
        {streak !== undefined && <StreakBadge sessions={streak(row.original)} />}
      </span>
    ),
  };
}

/**
 * How many sessions in a row something has been on a list.
 *
 * Drawn only from the second session: a single day is every entry's
 * starting point, and a badge on every row would say nothing.
 *
 * @param props - The run's length, counting today.
 * @returns The badge, or nothing for a run of one.
 */
export function StreakBadge({
  sessions,
  className,
}: {
  sessions: number;
  className?: string;
}): React.JSX.Element | null {
  if (sessions <= 1) {
    return null;
  }
  return (
    <Badge
      variant="outline"
      title={`On this list for ${String(sessions)} sessions running`}
      className={cn(
        "h-4 shrink-0 border-caution/30 bg-caution/10 px-1 py-0 text-xs text-caution",
        className,
      )}
    >
      {formatStreak(sessions)}
    </Badge>
  );
}
