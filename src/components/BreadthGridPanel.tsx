/**
 * Every sector, or every index, side by side.
 *
 * The question a grid answers is which parts of the market are working and
 * which are not — and then, a step behind it, which are changing. Where a
 * sector stands and which way it is turning are two different readings,
 * and the first without the second misses one that has fallen from eighty
 * per cent to sixty and still looks strong.
 *
 * The one table, as everywhere else, so sorting and a numeric cell behave
 * the way they do on every other screen.
 */

import { useMemo } from "react";

import type { ScopeBreadth } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Meter } from "@/components/Meter";
import { Badge } from "@/components/ui/badge";
import { describeRegime } from "@/lib/breadthReadings";
import { ABSENT, formatDay, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BreadthGridPanelProps {
  scopes: ScopeBreadth[];
  /** The session the rotation is measured from, when there is one. */
  comparedWith?: string | null | undefined;
  loading?: boolean;
  /** Called when a population is chosen, making rows clickable when given. */
  onSelect?: (scopeKey: string) => void;
  /** Where a population's own page is, so its name becomes the link. */
  linkTo?: (scopeKey: string) => string;
}

/** How each band is painted as a chip. */
const CHIPS = {
  good: "border-gain/40 bg-gain/10 text-gain",
  bad: "border-loss/40 bg-loss/10 text-loss",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

/**
 * Lay the populations out.
 *
 * @param props - The populations, and what choosing one means.
 * @returns The grid.
 */
export function BreadthGridPanel({
  scopes,
  comparedWith,
  loading = false,
  onSelect,
  linkTo,
}: BreadthGridPanelProps): React.JSX.Element {
  const columns = useMemo<Column<ScopeBreadth>[]>(
    () => [
      {
        id: "scope_key",
        header: "Population",
        accessorFn: (row) => row.scope_key,
        cell: ({ row }) => <span className="font-medium">{label(row.original.scope_key)}</span>,
      },
      {
        id: "regime",
        header: "Regime",
        cell: ({ row }) => <RegimeChip scope={row.original} />,
        // Not sortable: the bands are read off the share in the next
        // column, so sorting here would order the rows identically and
        // offer a second control that does the same thing.
        enableSorting: false,
      },
      {
        id: "above_sma_200",
        header: "Above 200-day",
        accessorFn: (row) => toNumber(row.above_sma_200) ?? 0,
        cell: ({ row }) => (
          <Meter
            label={`${label(row.original.scope_key)} above their 200-day`}
            percent={toNumber(row.original.above_sma_200)}
            className="min-w-32"
          />
        ),
      },
      {
        id: "above_sma_50",
        header: "Above 50-day",
        accessorFn: (row) => toNumber(row.above_sma_50) ?? 0,
        cell: ({ row }) => percent(row.original.above_sma_50),
        meta: { align: "right" },
      },
      {
        id: "rotation",
        header: comparedWith ? `Since ${formatDay(comparedWith)}` : "Change",
        accessorFn: (row) => toNumber(row.rotation) ?? 0,
        cell: ({ row }) => <Rotation points={toNumber(row.original.rotation)} />,
        meta: { align: "right" },
      },
      {
        id: "participation",
        header: "Advancing",
        accessorFn: (row) => row.advancing - row.declining,
        cell: ({ row }) => (
          <span className="tabular text-xs">
            <span className="text-gain">{row.original.advancing}</span>
            {" / "}
            <span className="text-loss">{row.original.declining}</span>
          </span>
        ),
        meta: { align: "right" },
      },
      {
        id: "instruments",
        header: "Counted",
        accessorFn: (row) => row.instruments,
        cell: ({ row }) => row.original.instruments,
        meta: { align: "right" },
      },
    ],
    [comparedWith],
  );

  return (
    <DataTable
      columns={columns}
      rows={scopes}
      loading={loading}
      empty="Nothing counted for this kind of population"
      placeholderRows={8}
      {...(onSelect
        ? {
            onSelect: (row: ScopeBreadth) => {
              onSelect(row.scope_key);
            },
          }
        : {})}
      {...(linkTo ? { linkTo: (row: ScopeBreadth) => linkTo(row.scope_key) } : {})}
    />
  );
}

/** One population's band, as a chip. */
function RegimeChip({ scope }: { scope: ScopeBreadth }): React.JSX.Element {
  const reading = describeRegime(scope.regime);
  if (reading === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", CHIPS[reading.tone])}>
      {reading.label}
    </Badge>
  );
}

/** How far the long-average share has moved, in percentage points. */
function Rotation({ points }: { points: number | null }): React.JSX.Element {
  if (points === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  return (
    <span
      className={cn(
        "tabular",
        points > 0 ? "text-gain" : points < 0 ? "text-loss" : "text-muted-foreground",
      )}
      // Percentage points, not per cent: a sector going from 50% to 60% has
      // gained ten points and twenty per cent, and saying the wrong one
      // makes every rotation figure ambiguous.
      title="Change in the share above the 200-day, in percentage points"
    >
      {points > 0 ? "+" : ""}
      {points.toFixed(1)} pp
    </span>
  );
}

/** A percentage, or a dash. */
function percent(value: string | null): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : `${parsed.toFixed(0)}%`;
}

/**
 * Shorten an index key to what it is called.
 *
 * Sector keys are already names; index keys carry the exchange segment in
 * front of them, which is noise in a column of forty rows.
 *
 * @param scopeKey - The key as the platform stores it.
 * @returns What to show.
 */
function label(scopeKey: string): string {
  // Matched rather than split: a split always yields something, so the
  // "there was no segment" case has to be invented afterwards, and a
  // case invented afterwards is one nothing ever reaches.
  const [, named] = /\|(.+)$/.exec(scopeKey) ?? [];
  return named ?? scopeKey;
}
