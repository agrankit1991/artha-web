/**
 * A watchlist's companies, as a table with the reader's own levels beside
 * the price.
 *
 * Three facts about adding a company sat in three columns apart ("Since
 * added", "Added at" and "Added"); they are one column now, the change
 * since first, the day and the price under it. The target and the stop are
 * one meter from stop to target with the price between, which says "how
 * close to either" at a glance, and the column sorts by the nearer of the
 * two. Being near a level is said in words, not by an icon's colour.
 */

import { Pencil, Star, Target, Trash2, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import type { WatchedInstrument } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { RangeMeter } from "@/components/RangeMeter";
import { symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ABSENT, formatDay, formatPrice, formatRupees, formatVolume, toNumber } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** How close the price must come to a level for the row to say so, in per cent. */
export const NEAR_LEVEL_PERCENT = 3;

interface WatchlistTableProps {
  items: WatchedInstrument[];
  loading: boolean;
  onEdit: (item: WatchedInstrument) => void;
  onRemove: (item: WatchedInstrument) => void;
  onStar: (item: WatchedInstrument) => void;
}

/**
 * Render the table.
 *
 * @param props - The items, whether they are still loading, and what each
 *   row's star, edit and remove do.
 * @returns The table, each company leading to its page.
 */
export function WatchlistTable({
  items,
  loading,
  onEdit,
  onRemove,
  onStar,
}: WatchlistTableProps): React.JSX.Element {
  const columns = useMemo<Column<WatchedInstrument>[]>(
    () => [
      symbolColumn((row) => row, {
        // The star the reader sets, before the symbol.
        lead: (row) => <StarButton item={row} onStar={onStar} />,
      }),
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[18rem] space-y-1">
            <div className="truncate">{row.original.name}</div>
            {row.original.notes !== null && (
              <div className="truncate text-xs text-muted-foreground" title={row.original.notes}>
                {row.original.notes}
              </div>
            )}
            {(row.original.tags.length > 0 || nearLevel(row.original) !== null) && (
              <div className="flex flex-wrap gap-1">
                <NearLevel item={row.original} />
                {row.original.tags.map((one) => (
                  <Badge key={one} variant="outline" className="px-1 text-xs">
                    {one}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.close),
        meta: { align: "right" },
      },
      move("change", "Today", (row) => row.change_percent),
      {
        id: "added",
        header: "Added",
        accessorFn: (row) => toNumber(row.since_added_percent) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => (
          <span className="inline-flex flex-col items-end leading-tight">
            <Delta value={row.original.since_added_percent} />
            <span className="text-xs text-muted-foreground">
              {formatDay(row.original.added_on)} at {formatRupees(row.original.added_close)}
            </span>
          </span>
        ),
        meta: { align: "right" },
      },
      {
        id: "levels",
        header: "Stop to target",
        // The nearer level first, on the first click too: the row that
        // needs a look soonest. A figure column would start largest first.
        sortDescFirst: false,
        accessorFn: (row) => nearest(row) ?? Number.POSITIVE_INFINITY,
        cell: ({ row }) => <Levels item={row.original} />,
      },
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.volume),
        meta: { align: "right" },
      },
      move("one_month", "1M", (row) => row.one_month),
      move("one_year", "1Y", (row) => row.one_year),
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${row.original.symbol}`}
              onClick={() => {
                onEdit(row.original);
              }}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${row.original.symbol}`}
              onClick={() => {
                onRemove(row.original);
              }}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </span>
        ),
      },
    ],
    [onEdit, onRemove, onStar],
  );
  return (
    <DataTable
      columns={columns}
      rows={items}
      loading={loading}
      empty="Nothing on this list yet"
      placeholderRows={4}
      label="Watched companies"
      full
      linkTo={(row) => companyPath(row.instrument_key, row.symbol)}
    />
  );
}

/** A column of moves, coloured by their sign; unknown ones sort last. */
function move(
  id: string,
  header: string,
  of: (row: WatchedInstrument) => string | null,
): Column<WatchedInstrument> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}

/**
 * How far the price is from the nearer of the reader's levels.
 *
 * @param item - The item.
 * @returns The distance in per cent, unsigned, or null with no level set.
 */
function nearest(item: WatchedInstrument): number | null {
  const distances = [item.to_target_percent, item.to_stop_percent].flatMap((one) => {
    const value = toNumber(one);
    return value === null ? [] : [Math.abs(value)];
  });
  return distances.length === 0 ? null : Math.min(...distances);
}

/**
 * Which level the price is near, if either.
 *
 * @param item - The item.
 * @returns The level within `NEAR_LEVEL_PERCENT`, the target first, or null.
 */
export function nearLevel(item: WatchedInstrument): "target" | "stop" | null {
  const near = (value: string | null): boolean => {
    const distance = toNumber(value);
    return distance !== null && Math.abs(distance) <= NEAR_LEVEL_PERCENT;
  };
  if (near(item.to_target_percent)) {
    return "target";
  }
  return near(item.to_stop_percent) ? "stop" : null;
}

/** "Near target" or "Near stop", in words with an icon of its own. */
function NearLevel({ item }: { item: WatchedInstrument }): React.JSX.Element | null {
  const which = nearLevel(item);
  if (which === null) {
    return null;
  }
  return which === "target" ? (
    <Badge
      variant="outline"
      className="gap-1 border-primary/40 bg-primary/10 px-1 text-xs text-primary"
    >
      <Target aria-hidden="true" className="h-3 w-3" />
      Near target
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 border-caution/40 bg-caution/10 px-1 text-xs text-caution"
    >
      <TriangleAlert aria-hidden="true" className="h-3 w-3" />
      Near stop
    </Badge>
  );
}

/**
 * The reader's levels: a meter from stop to target with the price between
 * when both are set, or the one that is with how far away it is.
 */
function Levels({ item }: { item: WatchedInstrument }): React.JSX.Element {
  const stop = toNumber(item.stop_loss);
  const target = toNumber(item.target_price);
  if (stop !== null && target !== null && target > stop) {
    return (
      <RangeMeter
        label={`${item.symbol} between its stop and its target`}
        low={stop}
        high={target}
        value={toNumber(item.close)}
        format={(value) => formatRupees(String(value))}
        reading={false}
        className="min-w-[9rem]"
      />
    );
  }
  const one =
    target !== null
      ? { name: "Target", level: item.target_price, distance: item.to_target_percent }
      : stop !== null
        ? { name: "Stop", level: item.stop_loss, distance: item.to_stop_percent }
        : null;
  if (one === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="text-xs text-muted-foreground">
        {one.name} {formatRupees(one.level)}
      </span>
      <Delta value={one.distance} className="text-xs" />
    </span>
  );
}

/** The star that keeps an item at the top of its list, in the brand's orange. */
function StarButton({
  item,
  onStar,
}: {
  item: WatchedInstrument;
  onStar: (item: WatchedInstrument) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={item.featured ? `Unstar ${item.symbol}` : `Star ${item.symbol}`}
      aria-pressed={item.featured}
      onClick={(event) => {
        // The row is a link; starring must not also open the company.
        event.preventDefault();
        event.stopPropagation();
        onStar(item);
      }}
      className="rounded-full p-0.5 hover:bg-muted"
    >
      <Star
        aria-hidden="true"
        className={cn("h-4 w-4", item.featured ? "fill-brand text-brand" : "text-muted-foreground")}
      />
    </button>
  );
}
