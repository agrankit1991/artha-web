/**
 * What a company has done to its own shares.
 *
 * Dividends, bonuses, splits and rights, most recent ex-date first. The
 * ex-date leads because it is the one that matters to a holder: it is the
 * day the price drops by the dividend and the day the share count changes,
 * and a chart that looks broken on a date is usually explained here.
 */

import { useMemo } from "react";

import type { CorporateAction, CorporateActionKind } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { ABSENT, formatDay, formatPrice } from "@/lib/format";

interface CorporateActionsProps {
  actions: CorporateAction[] | null;
  loading?: boolean;
}

/** What each kind is called, and how it is tinted. */
const KINDS: Record<CorporateActionKind, { label: string; className: string }> = {
  DIVIDEND: { label: "Dividend", className: "bg-gain/10 text-gain border-gain/20" },
  BONUS: { label: "Bonus", className: "bg-primary/10 text-primary border-primary/20" },
  SPLIT: { label: "Split", className: "bg-primary/10 text-primary border-primary/20" },
  RIGHTS: { label: "Rights", className: "bg-muted text-muted-foreground" },
  OTHER: { label: "Other", className: "bg-muted text-muted-foreground" },
};

/**
 * Draw the events.
 *
 * @param props - The events, and whether they are still arriving.
 * @returns The table.
 */
export function CorporateActions({
  actions,
  loading = false,
}: CorporateActionsProps): React.JSX.Element {
  const columns = useMemo<Column<CorporateAction>[]>(
    () => [
      {
        id: "ex_date",
        header: "Ex-date",
        accessorFn: (row) => row.ex_date,
        cell: ({ row }) => <span className="font-medium">{formatDay(row.original.ex_date)}</span>,
      },
      {
        id: "kind",
        header: "Event",
        accessorFn: (row) => row.kind,
        cell: ({ row }) => {
          const kind = KINDS[row.original.kind];
          return (
            <Badge variant="outline" className={kind.className}>
              {kind.label}
            </Badge>
          );
        },
      },
      {
        id: "detail",
        header: "Detail",
        accessorFn: (row) => row.amount ?? row.ratio ?? "",
        cell: ({ row }) => detail(row.original),
      },
      {
        id: "record_date",
        header: "Record date",
        accessorFn: (row) => row.record_date ?? "",
        cell: ({ row }) => formatDay(row.original.record_date),
      },
      {
        id: "announced_on",
        header: "Announced",
        accessorFn: (row) => row.announced_on ?? "",
        cell: ({ row }) => formatDay(row.original.announced_on),
      },
      {
        id: "label",
        header: "As published",
        accessorFn: (row) => row.label,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.label}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={actions ?? []}
      loading={loading}
      empty="No corporate events recorded for this company"
      placeholderRows={4}
      label="Corporate actions"
    />
  );
}

/**
 * What the event was worth, in whichever way its kind is measured.
 *
 * A dividend is an amount per share and a bonus is a ratio, so one column
 * cannot be a number: the units differ by row.
 *
 * @param action - The event.
 * @returns The figure, or a dash.
 */
function detail(action: CorporateAction): string {
  if (action.amount !== null) {
    return `${formatPrice(action.amount)} per share`;
  }
  return action.ratio ?? ABSENT;
}
