/**
 * The one table.
 *
 * Every list in this application is this component with different columns:
 * the mover panels, an index's constituents, a company list, a comparison.
 * Sorting, the empty and loading states, density, and the way a numeric cell
 * is aligned are decided here once, so a table learned on one screen is
 * already understood on the next.
 *
 * A second, nearly-identical table is a bug in this codebase rather than a
 * shortcut -- it is how two screens start disagreeing about what a falling
 * price looks like.
 */

import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** A column of one of this application's tables. */
export type Column<Row extends RowData> = ColumnDef<Row>;

/** What a column means for alignment: figures right, names left. */
export type ColumnAlignment = "left" | "right";

/** Extra column options this application adds to TanStack's own. */
export interface ColumnLayout {
  align?: ColumnAlignment;
}

interface DataTableProps<Row extends RowData> {
  columns: Column<Row>[];
  rows: Row[];
  /** What to say when there is nothing, which is not the same as loading. */
  empty?: string;
  /** Whether the rows are still on their way. */
  loading?: boolean;
  /** Called when a row is chosen, making rows clickable when given. */
  onSelect?: (row: Row) => void;
  /** Rows to leave room for while loading, so the page does not jump. */
  placeholderRows?: number;
  /**
   * What the table lists, for a reader who cannot see the heading above
   * it. Worth giving wherever a screen carries more than one table.
   */
  label?: string;
}

/**
 * Render a sortable table.
 *
 * @param props - The columns, the rows, and what to do about neither.
 * @returns The table.
 */
export function DataTable<Row extends RowData>({
  columns,
  rows,
  empty = "Nothing to show",
  loading = false,
  onSelect,
  placeholderRows = 5,
  label,
}: DataTableProps<Row>): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table aria-label={label}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const alignment = alignmentOf(header.column.columnDef);
              const sorted = header.column.getIsSorted();
              return (
                <TableHead key={header.id} className={cn(alignment === "right" && "text-right")}>
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        alignment === "right" && "flex-row-reverse",
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortMark sorted={sorted} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading ? (
          <LoadingRows columns={columns.length} rows={placeholderRows} />
        ) : table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={
                onSelect
                  ? () => {
                      onSelect(row.original);
                    }
                  : undefined
              }
              className={cn(onSelect && "cursor-pointer")}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    alignmentOf(cell.column.columnDef) === "right" && "text-right tabular",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

/** Read the alignment a column declared, defaulting to the left. */
function alignmentOf(column: { meta?: unknown }): ColumnAlignment {
  const meta = column.meta as ColumnLayout | undefined;
  return meta?.align ?? "left";
}

/** The mark on a sortable header, saying whether and which way it is sorted. */
function SortMark({ sorted }: { sorted: false | "asc" | "desc" }): React.JSX.Element {
  if (sorted === "asc") {
    return <ArrowUp className="size-3" />;
  }
  if (sorted === "desc") {
    return <ArrowDown className="size-3" />;
  }
  // Shown faintly rather than hidden: a header that only reveals it can be
  // sorted once hovered is a feature nobody discovers.
  return <ChevronsUpDown className="size-3 opacity-40" />;
}

/** Rows of grey while the real ones are on their way. */
function LoadingRows({ columns, rows }: { columns: number; rows: number }): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }, (_unused, index) => (
        <TableRow key={index}>
          {Array.from({ length: columns }, (_also, cell) => (
            <TableCell key={cell}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
