/**
 * Disclosed bulk and block deals, as one table.
 *
 * Used by the deals page and by a company's page, so a deal reads the same
 * in both: who, which side -- a badge, since it labels the row rather than
 * being something to rank -- how much, at what price, and its value in
 * crore, the unit written once in the heading.
 */

import { Link } from "react-router-dom";

import type { Deal } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatPrice, formatVolume, toNumber } from "@/lib/format";
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
    {
      id: "session_date",
      header: "Date",
      accessorFn: (row) => row.session_date,
      cell: ({ row }) => formatDay(row.original.session_date),
    },
    ...(forCompany
      ? []
      : ([
          {
            id: "symbol",
            header: "Symbol",
            accessorFn: (row) => row.symbol,
            // A deal in a symbol no listing carries has no page to lead to.
            cell: ({ row }) =>
              row.original.instrument_key === null ? (
                <span className="font-medium">{row.original.symbol}</span>
              ) : (
                <Link
                  to={companyPath(row.original.instrument_key, row.original.symbol)}
                  className="font-medium text-primary hover:underline"
                >
                  {row.original.symbol}
                </Link>
              ),
          },
          {
            id: "security_name",
            header: "Security",
            accessorFn: (row) => row.security_name,
            cell: ({ row }) => (
              <span className="block max-w-[14rem] truncate">{row.original.security_name}</span>
            ),
          },
        ] satisfies Column<Deal>[])),
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
      header: "Quantity",
      accessorFn: (row) => row.quantity,
      cell: ({ row }) => formatVolume(row.original.quantity),
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
    />
  );
}
