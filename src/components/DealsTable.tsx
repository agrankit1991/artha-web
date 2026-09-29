/**
 * Disclosed bulk and block deals, as one table.
 *
 * Used by the deals page and by a company's page, so a deal reads the same
 * in both: who, which side -- a badge, since it labels the row rather than
 * being something to rank -- how much, at what price, and its value in
 * crore, the unit written once in the heading.
 */

import type { Deal } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDay, formatPrice, toNumber } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface DealsTableProps {
  deals: Deal[];
  loading?: boolean;
  /** Leave out the company's own columns on a page that is already about it. */
  forCompany?: boolean;
  label?: string;
}

const KINDS = { BULK: "Bulk", BLOCK: "Block" } as const;

/**
 * Draw the table.
 *
 * @param props - The deals and how to lay them out.
 * @returns The table.
 */
export function DealsTable({
  deals,
  loading = false,
  forCompany = false,
  label = "Deals",
}: DealsTableProps): React.JSX.Element {
  const columns: Column<Deal>[] = [
    // The company first, as every list of companies here leads with it: its
    // symbol is the way to its page, its name beside it. On a company's own
    // page it goes without saying.
    ...(forCompany
      ? []
      : [
          symbolColumn<Deal>((row) => ({ symbol: row.symbol, name: row.security_name })),
          nameColumn<Deal>((row) => ({ symbol: row.symbol, name: row.security_name }), undefined, {
            compact: true,
          }),
        ]),
    {
      id: "session_date",
      header: "Date",
      accessorFn: (row) => row.session_date,
      cell: ({ row }) => formatDay(row.original.session_date),
    },
    {
      id: "client_name",
      header: "Client",
      accessorFn: (row) => row.client_name,
      cell: ({ row }) => (
        <span className="block max-w-[18rem] truncate" title={row.original.client_name}>
          {row.original.client_name}
        </span>
      ),
    },
    {
      id: "kind",
      header: "Kind",
      accessorFn: (row) => row.kind,
      cell: ({ row }) => <Badge variant="outline">{KINDS[row.original.kind]}</Badge>,
    },
    {
      id: "side",
      header: "Side",
      accessorFn: (row) => row.side,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            row.original.side === "BUY"
              ? "border-gain/30 bg-gain/10 text-gain"
              : "border-loss/30 bg-loss/10 text-loss",
          )}
        >
          {row.original.side === "BUY" ? "Buy" : "Sell"}
        </Badge>
      ),
    },
    {
      id: "quantity",
      // A count of shares, grouped as one: in lakh and crore it sat beside a
      // value in rupees crore, and "Cr" meant two things in one table.
      header: "Shares",
      accessorFn: (row) => row.quantity,
      cell: ({ row }) => formatCount(row.original.quantity),
      meta: { align: "right" },
    },
    {
      id: "price",
      header: "Price",
      accessorFn: (row) => toNumber(row.price) ?? 0,
      cell: ({ row }) => formatPrice(row.original.price),
      meta: { align: "right" },
    },
    {
      id: "value",
      header: "Value ₹ Cr",
      accessorFn: (row) => toNumber(row.value_crore) ?? 0,
      cell: ({ row }) => (
        <span className="font-medium">{formatPrice(row.original.value_crore)}</span>
      ),
      meta: { align: "right" },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={deals}
      loading={loading}
      empty="No deals disclosed in this window"
      placeholderRows={8}
      label={label}
      full
      {...(forCompany
        ? {}
        : {
            linkTo: (row: Deal) =>
              row.instrument_key === null ? null : companyPath(row.instrument_key, row.symbol),
          })}
    />
  );
}
