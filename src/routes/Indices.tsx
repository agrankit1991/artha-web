/**
 * Every index, on one list.
 *
 * The page a reader scans to pick an index: its kind, how many companies
 * it holds, and how it has done today and over the trailing windows, every
 * name leading to the index's own page. Narrowed by kind and by a few
 * typed letters, because a hundred and fifty indices is a list nobody
 * reads top to bottom.
 */

import { useCallback, useMemo, useState } from "react";

import type { IndexSummary } from "@/api/client";
import { fetchIndices } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatCount, formatDay, formatPrice, toNumber } from "@/lib/format";
import { categoryLabel } from "@/lib/indices";
import { populationPath } from "@/lib/paths";

/** Every kind. */
const ANY = "ANY";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Indices(): React.JSX.Element {
  const load = useCallback(() => fetchIndices(), []);
  const indices = useResource(load);
  const [category, setCategory] = useState(ANY);
  const [typed, setTyped] = useState("");

  const categories = useMemo(() => {
    const found = new Set(
      (indices.data ?? []).flatMap((one) => (one.category === null ? [] : [one.category])),
    );
    return [
      { key: ANY, label: "All kinds" },
      ...[...found].sort().map((key) => ({ key, label: categoryLabel(key) })),
    ];
  }, [indices.data]);

  const shown = useMemo(() => {
    const letters = typed.trim().toLowerCase();
    return (indices.data ?? []).filter(
      (one) =>
        (category === ANY || one.category === category) &&
        (letters === "" ||
          one.name.toLowerCase().includes(letters) ||
          one.symbol.toLowerCase().includes(letters)),
    );
  }, [indices.data, category, typed]);

  const columns = useMemo<Column<IndexSummary>[]>(
    () => [
      {
        id: "name",
        header: "Index",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.category === null
                ? row.original.symbol
                : categoryLabel(row.original.category)}
            </div>
          </div>
        ),
      },
      {
        id: "constituents",
        header: "Companies",
        accessorFn: (row) => row.constituents,
        cell: ({ row }) =>
          row.original.constituents === 0 ? ABSENT : formatCount(row.original.constituents),
        meta: { align: "right" },
      },
      {
        id: "close",
        header: "Level",
        accessorFn: (row) => toNumber(row.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.close),
        meta: { align: "right" },
      },
      change("change", "Change", (row) => row.change_percent),
      change("one_week", "1W", (row) => row.returns?.one_week ?? null),
      change("one_month", "1M", (row) => row.returns?.one_month ?? null),
      change("three_months", "3M", (row) => row.returns?.three_months ?? null),
      change("one_year", "1Y", (row) => row.returns?.one_year ?? null),
      change("year_to_date", "YTD", (row) => row.returns?.year_to_date ?? null),
      change("from_high", "From high", (row) => row.from_high_percent),
      {
        id: "as_of",
        header: "As of",
        accessorFn: (row) => row.as_of ?? "",
        cell: ({ row }) => formatDay(row.original.as_of),
      },
    ],
    [],
  );

  if (indices.error !== null) {
    return <Failed message={indices.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indices"
        description="Every index listed, with what kind of index it is, how many companies it holds and how it has done. Each leads to its own page."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Find an index"
          placeholder="Find an index"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          className="w-64"
        />
        <Chooser options={categories} chosen={category} onChange={setCategory} label="Kind" />
        <span className="text-xs text-muted-foreground">
          {String(shown.length)} of {String(indices.data?.length ?? 0)}
        </span>
      </div>
      <DataTable
        columns={columns}
        rows={shown}
        loading={indices.loading}
        empty="No index matches"
        placeholderRows={12}
        label="Indices"
        full
        linkTo={(row) => populationPath("index", row.instrument_key)}
      />
    </div>
  );
}

/** A percentage column, coloured by its sign. */
function change(
  id: string,
  header: string,
  of: (row: IndexSummary) => string | null,
): Column<IndexSummary> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}
