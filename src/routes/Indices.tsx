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
import { Link } from "react-router-dom";

import type { IndexSummary } from "@/api/client";
import { fetchIndices } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatCount, formatDay, formatPrice, toNumber } from "@/lib/format";
import { categoryLabel } from "@/lib/indices";
import { populationPath, slug } from "@/lib/paths";

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
  const [exchange, setExchange] = useState(ANY);
  const [mode, setMode] = useViewMode("indices");

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
        (exchange === ANY || exchangeOf(one) === exchange) &&
        (letters === "" ||
          one.name.toLowerCase().includes(letters) ||
          one.symbol.toLowerCase().includes(letters)),
    );
  }, [indices.data, category, exchange, typed]);

  const columns = useMemo<Column<IndexSummary>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name,
        // The index's name, never its code, as the previous project's table
        // had it: `Nifty 50`, not `NIFTY 50` or `NSE_INDEX|Nifty 50`.
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "exchange",
        header: "Exchange",
        accessorFn: (row) => exchangeOf(row),
        cell: ({ row }) => exchangeOf(row.original),
      },
      {
        id: "category",
        header: "Category",
        accessorFn: (row) => (row.category === null ? "" : categoryLabel(row.category)),
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
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
        cell: ({ row }) => <span className="font-bold">{formatPrice(row.original.close)}</span>,
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

  const table = (rows: IndexSummary[], label: string): React.JSX.Element => (
    <DataTable
      columns={columns}
      rows={rows}
      loading={indices.loading}
      empty="No index matches"
      placeholderRows={12}
      label={label}
      full
      linkTo={(row) => populationPath("index", row.instrument_key)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indices"
        count={indices.data === null ? undefined : `${String(indices.data.length)} indices`}
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
        <Chooser options={EXCHANGES} chosen={exchange} onChange={setExchange} label="Exchange" />
        <Chooser options={categories} chosen={category} onChange={setCategory} label="Kind" />
        <span className="text-xs text-muted-foreground">
          {String(shown.length)} of {String(indices.data?.length ?? 0)}
        </span>
        <ViewModeToggle mode={mode} onChange={setMode} className="ml-auto" />
      </div>
      {mode === "list" && table(shown, "Indices")}
      {mode === "grouped" && (
        <Grouped groups={byCategory(shown)} render={(rows, name) => table(rows, name)} />
      )}
      {mode === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((one) => (
            <SummaryCard key={one.instrument_key} index={one} />
          ))}
        </div>
      )}
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

/** The exchanges an index can belong to, as filter choices. */
const EXCHANGES = [
  { key: ANY, label: "All exchanges" },
  { key: "NSE", label: "NSE" },
  { key: "BSE", label: "BSE" },
];

/** Which exchange publishes an index, read from its key (`NSE_INDEX|Nifty 50`). */
function exchangeOf(index: IndexSummary): string {
  // Unreachable fallback: `split` always yields at least one piece.
  return index.instrument_key.split("_")[0] ?? ABSENT;
}

/** An index's category as the previous project showed it: an outline badge. */
function CategoryBadge({ category }: { category: string | null }): React.JSX.Element {
  return (
    <Badge variant="outline" className="bg-muted/40">
      {category === null ? "N/A" : categoryLabel(category)}
    </Badge>
  );
}

/** The indices split by category, largest group first, uncategorised last. */
function byCategory(indices: IndexSummary[]): [string, IndexSummary[]][] {
  const groups = new Map<string, IndexSummary[]>();
  for (const one of indices) {
    const name = one.category === null ? "Uncategorised" : categoryLabel(one.category);
    groups.set(name, [...(groups.get(name) ?? []), one]);
  }
  return [...groups.entries()].sort(
    ([nameA, rowsA], [nameB, rowsB]) =>
      Number(nameA === "Uncategorised") - Number(nameB === "Uncategorised") ||
      rowsB.length - rowsA.length,
  );
}

/**
 * One table per category, with chips at the top that jump to each: the
 * previous project's "categorized table" layout.
 */
function Grouped({
  groups,
  render,
}: {
  groups: [string, IndexSummary[]][];
  render: (rows: IndexSummary[], name: string) => React.JSX.Element;
}): React.JSX.Element {
  return (
    <div className="space-y-8">
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {groups.map(([name, rows]) => (
          <a
            key={name}
            href={`#${slug(name)}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm hover:bg-muted"
          >
            {name}
            <Badge variant="secondary">{rows.length}</Badge>
          </a>
        ))}
      </nav>
      {groups.map(([name, rows]) => (
        <section key={name} aria-labelledby={slug(name)} className="space-y-3">
          <h2
            id={slug(name)}
            className="flex items-center gap-2 border-b border-primary/20 pb-2 text-2xl font-bold"
          >
            {name}
            <Badge variant="secondary" className="text-sm">
              {rows.length}
            </Badge>
          </h2>
          {render(rows, name)}
        </section>
      ))}
    </div>
  );
}

/** One index as a card: name and move first, then its level and trailing returns. */
function SummaryCard({ index }: { index: IndexSummary }): React.JSX.Element {
  return (
    <Link to={populationPath("index", index.instrument_key)} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-lg font-semibold">{index.name}</h3>
            <Delta value={index.change_percent} arrow={false} badge />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{exchangeOf(index)}</span>
            <CategoryBadge category={index.category} />
          </div>
          <div className="text-2xl font-bold tabular">{formatPrice(index.close)}</div>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {(
              [
                ["1M", index.returns?.one_month],
                ["1Y", index.returns?.one_year],
                ["From high", index.from_high_percent],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>
                  <Delta value={value ?? null} />
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
