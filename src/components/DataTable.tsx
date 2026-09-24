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
  type OnChangeFn,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Link } from "react-router-dom";
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

/**
 * How the first column is pinned in a full list.
 *
 * A rule drawn with a pseudo-element rather than a border: a real border
 * on a sticky cell scrolls away with the cell behind it and leaves the
 * column looking as though it is floating over nothing.
 */
const STICKY_COLUMN =
  "sticky left-0 z-20 bg-card after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border";

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
  /**
   * Draw it as a full list rather than a panel: the header stays put as
   * the rows scroll under it and the first column stays put as the
   * figures scroll past it. A list of five hundred companies with a
   * dozen columns is unreadable without both -- by the third screen a
   * reader has lost which column they are in and which row they are on.
   */
  full?: boolean;
  /** How tall a full list grows before it scrolls. */
  maxHeight?: string;
  /**
   * Where a row's own page is, if it has one. Given this, the first
   * column -- which is what a row is called -- becomes the link to it.
   *
   * The name rather than a chevron at the far end of a dozen columns. A
   * reader looking for a company looks at its name, and putting the way
   * in somewhere else means crossing the whole row to reach it, on a
   * table that scrolls sideways. It is also what a link looks like
   * everywhere else: the words for the thing.
   */
  linkTo?: (row: Row) => string;
  /**
   * Sort on the server rather than in the browser.
   *
   * For a list that arrives a page at a time, sorting what has arrived
   * orders twenty-five rows of twenty thousand and says nothing about the
   * rest. Given this, the table shows the rows in the order they came, draws
   * the header marks from `sorting`, and reports a click to
   * `onSortingChange` so the caller can ask the platform for the list in
   * that order.
   */
  serverSorting?: {
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
  };
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
  full = false,
  maxHeight = "max-h-[70vh]",
  linkTo,
  serverSorting,
}: DataTableProps<Row>): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting: serverSorting?.sorting ?? sorting },
    onSortingChange: serverSorting?.onSortingChange ?? setSorting,
    manualSorting: serverSorting !== undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const body = (
    <Table aria-label={label}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header, position) => {
              const alignment = alignmentOf(header.column.columnDef);
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  // The arrow is a shape; this is what it says to a screen reader.
                  {...(sorted === false
                    ? {}
                    : { "aria-sort": sorted === "asc" ? "ascending" : "descending" })}
                  className={cn(
                    alignment === "right" && "text-right",
                    full && "sticky top-0 z-30 bg-card",
                    full && position === 0 && STICKY_COLUMN,
                  )}
                >
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
              {row.getVisibleCells().map((cell, position) => {
                const drawn = flexRender(cell.column.columnDef.cell, cell.getContext());
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      alignmentOf(cell.column.columnDef) === "right" && "text-right tabular",
                      full && position === 0 && cn(STICKY_COLUMN, "bg-card"),
                    )}
                  >
                    {linkTo && position === 0 ? (
                      <Link
                        to={linkTo(row.original)}
                        className="block hover:text-primary hover:underline"
                        onClick={(event) => {
                          // Choosing a row and opening it are separate
                          // intentions, and a row may already do the first.
                          event.stopPropagation();
                        }}
                      >
                        {drawn}
                      </Link>
                    ) : (
                      drawn
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return full ? (
    <div className={cn("relative w-full overflow-auto rounded-md border", maxHeight)}>{body}</div>
  ) : (
    body
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
