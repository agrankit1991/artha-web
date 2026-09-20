/**
 * One mover list, as a panel.
 *
 * Every panel is this component: the seven differ in what they rank, not in
 * how they are read. The ranked figure gets its own column with the list's
 * own heading, so a reader is never left working out which number put an
 * instrument here.
 */

import { useMemo } from "react";

import type { MoverListName, MoverPanel as Panel, MoverRow } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDay,
  formatMultiple,
  formatPercent,
  formatPrice,
  formatStreak,
  formatVolume,
  toNumber,
} from "@/lib/format";

/** How each list is titled, and how the figure it ranks should be read. */
const LISTS: Record<
  MoverListName,
  { title: string; measure: string; render: (row: MoverRow) => React.ReactNode }
> = {
  "top-gainers": {
    title: "Top gainers",
    measure: "Change",
    render: (row) => <Delta value={row.value} />,
  },
  "top-losers": {
    title: "Top losers",
    measure: "Change",
    render: (row) => <Delta value={row.value} />,
  },
  "most-active": {
    title: "Most active",
    measure: "Volume",
    render: (row) => formatVolume(row.value),
  },
  "most-volatile": {
    title: "Most volatile",
    measure: "Range",
    render: (row) => formatPercent(row.value),
  },
  "unusual-volume": {
    title: "Unusual volume",
    measure: "vs average",
    render: (row) => formatMultiple(row.value),
  },
  "near-52wk-high": {
    title: "Near 52-week high",
    measure: "From high",
    render: (row) => <Delta value={row.value} />,
  },
  "near-52wk-low": {
    title: "Near 52-week low",
    measure: "From low",
    render: (row) => <Delta value={row.value} />,
  },
};

/** What a list is called, for a heading or a link. */
export function titleOf(name: MoverListName): string {
  return LISTS[name].title;
}

interface MoverPanelProps {
  panel: Panel;
  loading?: boolean;
  onSelect?: (row: MoverRow) => void;
  /**
   * What to do when a row's own page is asked for. Given one, a column of
   * chevrons is added: a list of indices leads to each index's page, and a
   * list of companies has nowhere to lead yet.
   */
  onOpen?: (row: MoverRow) => void;
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
  onOpen,
}: MoverPanelProps): React.JSX.Element {
  const { title, measure, render } = LISTS[panel.name];

  const columns = useMemo<Column<MoverRow>[]>(
    () => [
      {
        id: "symbol",
        header: "Symbol",
        accessorFn: (row) => row.symbol,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.symbol}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.name}</div>
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
      {
        id: "measure",
        header: measure,
        accessorFn: (row) => toNumber(row.value) ?? 0,
        cell: ({ row }) => render(row.original),
        meta: { align: "right" },
      },
      {
        id: "streak",
        // Short, because the column is narrow and the tooltip carries the
        // rest: this is the answer to "how long has it been doing that".
        header: "Run",
        accessorFn: (row) => row.streak,
        cell: ({ row }) => (
          <span
            className="text-muted-foreground"
            title={`In this list for ${String(row.original.streak)} sessions running`}
          >
            {formatStreak(row.original.streak)}
          </span>
        ),
        meta: { align: "right" },
      },
    ],
    [measure, render],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {panel.as_of === null ? "No session ranked yet" : formatDay(panel.as_of)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={panel.rows}
          loading={loading}
          empty="Nothing in this list"
          nameOf={(row: MoverRow) => row.symbol}
          {...(onSelect ? { onSelect } : {})}
          {...(onOpen ? { onOpen } : {})}
        />
      </CardContent>
    </Card>
  );
}
