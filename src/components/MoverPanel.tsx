/**
 * One mover list, as a panel.
 *
 * Every panel is this component: the seven differ in what they rank, not in
 * how they are read. The ranked figure gets its own column with the list's
 * own heading, so a reader is never left working out which number put an
 * instrument here.
 */

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Flame,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { MoverListName, MoverPanel as Panel, MoverRow } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Icon } from "@/lib/entities";
import { cn } from "@/lib/utils";
import {
  formatDay,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatVolume,
  toNumber,
} from "@/lib/format";

/** How each list is titled, and how the figure it ranks should be read. */
export const MOVER_LISTS: Record<
  MoverListName,
  {
    title: string;
    measure: string;
    render: (row: MoverRow) => React.ReactNode;
    /** The list's mark and its colour, the pairs the previous project used. */
    icon: Icon;
    tint: string;
  }
> = {
  "top-gainers": {
    title: "Top gainers",
    measure: "Change",
    render: (row) => <Delta value={row.value} />,
    icon: TrendingUp,
    tint: "text-gain",
  },
  "top-losers": {
    title: "Top losers",
    measure: "Change",
    render: (row) => <Delta value={row.value} />,
    icon: TrendingDown,
    tint: "text-loss",
  },
  "most-active": {
    title: "Most active",
    measure: "Volume",
    render: (row) => formatVolume(row.value),
    icon: Activity,
    tint: "text-blue-600 dark:text-blue-400",
  },
  "most-volatile": {
    title: "Most volatile",
    measure: "Range",
    render: (row) => formatPercent(row.value),
    icon: Flame,
    tint: "text-purple-600 dark:text-purple-400",
  },
  "unusual-volume": {
    title: "Unusual volume",
    measure: "vs average",
    render: (row) => formatMultiple(row.value),
    icon: AlertTriangle,
    tint: "text-orange-500",
  },
  "near-52wk-high": {
    title: "Near 52-week high",
    measure: "From high",
    render: (row) => <Delta value={row.value} />,
    icon: ArrowUpFromLine,
    tint: "text-green-700 dark:text-green-500",
  },
  "near-52wk-low": {
    title: "Near 52-week low",
    measure: "From low",
    render: (row) => <Delta value={row.value} />,
    icon: ArrowDownToLine,
    tint: "text-red-700 dark:text-red-500",
  },
};

/** What a list is called, for a heading or a link. */
export function titleOf(name: MoverListName): string {
  return MOVER_LISTS[name].title;
}

interface MoverPanelProps {
  panel: Panel;
  loading?: boolean;
  onSelect?: (row: MoverRow) => void;
  /**
   * Where a row's own page is. Given this, each row's symbol becomes the
   * link to it -- a list of companies leads to company pages, a list of
   * indices to index pages.
   */
  linkTo?: (row: MoverRow) => string;
  /** Where the whole list is, when a fuller page exists. */
  href?: string;
}

/**
 * Render one list.
 *
 * @param props - The list, and whether it is still arriving.
 * @returns The panel.
 */
export function MoverPanelCard({
  panel,
  loading = false,
  onSelect,
  linkTo,
  href,
}: MoverPanelProps): React.JSX.Element {
  const { title, measure, render, icon: Mark, tint } = MOVER_LISTS[panel.name];

  const columns = useMemo<Column<MoverRow>[]>(
    () => [
      symbolColumn((row) => row),
      nameColumn(
        (row) => row,
        (row) => row.streak,
      ),
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.close),
        meta: { align: "right" },
      },
      {
        id: "measure",
        header: measure,
        accessorFn: (row) => toNumber(row.value) ?? 0,
        cell: ({ row }) => render(row.original),
        meta: { align: "right" },
      },
    ],
    [measure, render],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mark aria-hidden="true" className={cn("h-5 w-5", tint)} />
              {title}
            </CardTitle>
            <CardDescription>
              {panel.as_of === null ? "No session ranked yet" : formatDay(panel.as_of)}
            </CardDescription>
          </div>
          {href !== undefined && (
            <Link
              to={href}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              See all →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={panel.rows}
          loading={loading}
          empty="Nothing in this list"
          {...(onSelect ? { onSelect } : {})}
          {...(linkTo ? { linkTo } : {})}
        />
      </CardContent>
    </Card>
  );
}
