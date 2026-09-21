/**
 * Every sector, on one list.
 *
 * A sector has no price of its own, so each row is its companies reduced:
 * how many rose and fell today, drawn as one split bar, and the median
 * member's return over each window. Equal-weighted throughout -- every
 * company counting once -- which is the reading that matches the breadth
 * counts and differs from any capitalisation-weighted sector index. Each
 * name leads to the sector's own page.
 */

import { useCallback, useMemo, useState } from "react";

import type { SectorSummary } from "@/api/client";
import { fetchSectors } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { Hint } from "@/components/Hint";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatCount, toNumber } from "@/lib/format";
import { populationPath } from "@/lib/paths";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Sectors(): React.JSX.Element {
  const load = useCallback(() => fetchSectors(), []);
  const sectors = useResource(load);
  const [typed, setTyped] = useState("");

  const shown = useMemo(() => {
    const letters = typed.trim().toLowerCase();
    return (sectors.data ?? []).filter(
      (one) => letters === "" || one.sector.toLowerCase().includes(letters),
    );
  }, [sectors.data, typed]);

  const columns = useMemo<Column<SectorSummary>[]>(
    () => [
      {
        id: "sector",
        header: "Sector",
        accessorFn: (row) => row.sector,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.sector}</div>
            <div className="text-xs text-muted-foreground">
              {formatCount(row.original.companies)}{" "}
              {row.original.companies === 1 ? "company" : "companies"}
              {row.original.measured < row.original.companies &&
                `, ${String(row.original.measured)} with figures`}
            </div>
          </div>
        ),
      },
      {
        id: "split",
        header: "Up / down today",
        accessorFn: (row) => share(row),
        cell: ({ row }) => <Split sector={row.original} />,
      },
      {
        id: "median_change",
        header: "Median change",
        accessorFn: (row) => toNumber(row.median_change_percent) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <Delta value={row.original.median_change_percent} />,
        meta: { align: "right" },
      },
      change("one_week", "1W", (row) => row.returns.one_week),
      change("one_month", "1M", (row) => row.returns.one_month),
      change("three_months", "3M", (row) => row.returns.three_months),
      change("six_months", "6M", (row) => row.returns.six_months),
      change("one_year", "1Y", (row) => row.returns.one_year),
      change("year_to_date", "YTD", (row) => row.returns.year_to_date),
    ],
    [],
  );

  if (sectors.error !== null) {
    return <Failed message={sectors.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sectors"
        description="Every sector, as its companies' figures with every company counting once: how many rose and fell today, and what the typical member returned. Each leads to its own page."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Find a sector"
          placeholder="Find a sector"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          className="w-64"
        />
        <span className="text-xs text-muted-foreground">
          {String(shown.length)} of {String(sectors.data?.length ?? 0)}
        </span>
        <Hint text="Returns are the median company's, not a weighted index's. A sector whose largest company rose while forty small ones fell reads as falling here." />
      </div>
      <DataTable
        columns={columns}
        rows={shown}
        loading={sectors.loading}
        empty="No sector matches"
        placeholderRows={12}
        label="Sectors"
        full
        linkTo={(row) => populationPath("sector", row.sector)}
      />
    </div>
  );
}

/** The share of measured companies that rose today, for sorting; none is worst. */
function share(sector: SectorSummary): number {
  const counted = sector.advancing + sector.declining + sector.unchanged;
  return counted === 0 ? Number.NEGATIVE_INFINITY : sector.advancing / counted;
}

/** Risers and fallers as one bar, with the counts beside it. */
function Split({ sector }: { sector: SectorSummary }): React.JSX.Element {
  const counted = sector.advancing + sector.declining + sector.unchanged;
  if (counted === 0) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  const up = (sector.advancing / counted) * 100;
  const flat = (sector.unchanged / counted) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-xs tabular text-gain">{sector.advancing}</span>
      <div
        className="flex h-2 w-24 overflow-hidden rounded-full bg-loss"
        role="meter"
        aria-label={`${String(sector.advancing)} up, ${String(sector.declining)} down, ${String(sector.unchanged)} unchanged`}
        aria-valuenow={sector.advancing}
        aria-valuemin={0}
        aria-valuemax={counted}
      >
        <div className="h-full bg-gain" style={{ width: `${String(up)}%` }} />
        <div className="h-full bg-muted-foreground/40" style={{ width: `${String(flat)}%` }} />
      </div>
      <span className="w-6 text-xs tabular text-loss">{sector.declining}</span>
    </div>
  );
}

/** A percentage column, coloured by its sign. */
function change(
  id: string,
  header: string,
  of: (row: SectorSummary) => string | null,
): Column<SectorSummary> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}
