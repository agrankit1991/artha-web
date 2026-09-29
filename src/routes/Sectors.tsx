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

import { useCallback, useMemo } from "react";

import type { SectorSummary } from "@/api/client";
import { fetchSectors } from "@/api/client";
import { AdvanceDeclineBar } from "@/components/AdvanceDeclineBar";
import { CardsLoading } from "@/components/CardsLoading";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { Hint } from "@/components/Hint";
import { PageHeader } from "@/components/PageHeader";
import { PopulationCard } from "@/components/PopulationCard";
import { RotationChart, type RotationPoint } from "@/components/RotationChart";
import { MomentumChip } from "@/components/Standing";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { ABSENT, formatCount, formatDay, toNumber } from "@/lib/format";
import { populationPath } from "@/lib/paths";

/**
 * The fewest companies with figures a sector needs to be plotted. A median
 * of two or three companies swings by tens of per cent on one result, and
 * a plot scaled to reach those swings squeezes every real sector into a
 * knot at the middle; the list below still carries every sector.
 */
const PLOTTED_FROM = 10;

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Sectors(): React.JSX.Element {
  const load = useCallback(() => fetchSectors(), []);
  const sectors = useResource(load);
  // The letters live in the address, so a narrowed list survives Back.
  const [typed, setTyped] = useSearchParam("q");
  const [mode, setMode] = useViewMode("sectors");

  const shown = useMemo(() => {
    const letters = typed.trim().toLowerCase();
    return (sectors.data ?? []).filter(
      (one) => letters === "" || one.sector.toLowerCase().includes(letters),
    );
  }, [sectors.data, typed]);

  // Every sector is counted on the same session, so one date says it; the
  // latest, should one ever lag.
  const asOf = useMemo(
    () =>
      (sectors.data ?? [])
        .flatMap((one) => (one.as_of === null ? [] : [one.as_of]))
        .reduce<string | null>(
          (latest, day) => (latest === null || day > latest ? day : latest),
          null,
        ),
    [sectors.data],
  );

  const rotation = useMemo(
    () =>
      (sectors.data ?? []).flatMap((one): RotationPoint[] => {
        const week = toNumber(one.returns.one_week);
        const month = toNumber(one.returns.one_month);
        return one.measured < PLOTTED_FROM || week === null || month === null
          ? []
          : [
              {
                name: one.sector,
                href: populationPath("sector", one.sector),
                week,
                month,
                companies: one.measured,
              },
            ];
      }),
    [sectors.data],
  );

  const columns = useMemo<Column<SectorSummary>[]>(
    () => [
      {
        id: "sector",
        header: "Sector",
        accessorFn: (row) => row.sector,
        cell: ({ row }) => <span className="font-medium">{row.original.sector}</span>,
      },
      {
        id: "companies",
        header: "Companies",
        accessorFn: (row) => row.companies,
        cell: ({ row }) => <Companies sector={row.original} />,
        meta: { align: "right" },
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
      {
        id: "momentum",
        header: "Momentum",
        accessorFn: (row) => toNumber(row.median_momentum) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <MomentumChip score={toNumber(row.original.median_momentum)} />,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sectors"
        count={sectors.data === null ? undefined : `${String(sectors.data.length)} sectors`}
        identifiers={asOf === null ? undefined : <span>As of {formatDay(asOf)}</span>}
        description="Every sector, as its companies' figures with every company counting once: how many rose and fell today, and what the typical member returned. Each leads to its own page."
      />
      {sectors.error !== null && <Failed message={sectors.error} />}
      {sectors.error === null && rotation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Rotation</CardTitle>
            <CardDescription>
              Each sector&apos;s median company over the past month against the past week: the{" "}
              {rotation.length} of {sectors.data?.length} with at least {PLOTTED_FROM} companies
              measured, since the median of a few swings too far to read. The list below has every
              sector.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RotationChart points={rotation} label="Sectors by the past month and the past week" />
          </CardContent>
        </Card>
      )}
      {sectors.error === null && (
        <>
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
            {/* The total is in the header; here only what the letters leave. */}
            {sectors.data !== null && shown.length !== sectors.data.length && (
              <span className="text-xs text-muted-foreground">
                {String(shown.length)} of {String(sectors.data.length)}
              </span>
            )}
            <Hint
              term="median returns"
              text="Returns are the median company's, not a weighted index's: a sector whose largest company rose while forty small ones fell reads as falling here. Where a sector reads '90 of 92', two of its companies have no figures yet, and every figure is over the ninety."
            />
            <ViewModeToggle mode={mode} onChange={setMode} modes={LAYOUTS} className="ml-auto" />
          </div>
          {mode === "cards" ? (
            <SectorCards sectors={sectors.data === null ? null : shown} />
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}

/** The share of measured companies that rose today, for sorting; none is worst. */
function share(sector: SectorSummary): number {
  const counted = sector.advancing + sector.declining + sector.unchanged;
  return counted === 0 ? Number.NEGATIVE_INFINITY : sector.advancing / counted;
}

/**
 * How many companies a sector has, and how many of them its figures rest
 * on when that is fewer: printed, because a caveat kept in a `title` is
 * one a keyboard or a phone never reaches.
 */
function Companies({ sector }: { sector: SectorSummary }): React.JSX.Element {
  if (sector.measured === sector.companies) {
    return <>{formatCount(sector.companies)}</>;
  }
  return (
    <span title={`${String(sector.measured)} with figures`}>
      <span className="text-muted-foreground">{formatCount(sector.measured)} of </span>
      {formatCount(sector.companies)}
    </span>
  );
}

/** Risers and fallers as one bar, with the counts beside it. */
function Split({ sector }: { sector: SectorSummary }): React.JSX.Element {
  if (sector.advancing + sector.declining + sector.unchanged === 0) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-xs tabular text-gain">{sector.advancing}</span>
      <AdvanceDeclineBar
        advancing={sector.advancing}
        declining={sector.declining}
        unchanged={sector.unchanged}
        className="h-2 w-24"
      />
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

/** A sector has no category to group by, so the page offers a list or cards. */
const LAYOUTS = ["list", "cards"] as const;

/**
 * The sectors as cards: the index list's card, with the split and the
 * momentum where an index has its level.
 *
 * @param props - The sectors shown, or null while they are on their way.
 * @returns The grid, or a word that nothing matched.
 */
function SectorCards({ sectors }: { sectors: SectorSummary[] | null }): React.JSX.Element {
  if (sectors?.length === 0) {
    return <Empty title="No sector matches" reason="Try fewer letters." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sectors === null ? (
        <CardsLoading />
      ) : (
        sectors.map((one) => (
          <PopulationCard
            key={one.sector}
            name={one.sector}
            href={populationPath("sector", one.sector)}
            change={one.median_change_percent}
            identity={
              <span>
                <Companies sector={one} /> {one.companies === 1 ? "company" : "companies"}
              </span>
            }
            readings={[
              { label: "1W", value: one.returns.one_week },
              { label: "1M", value: one.returns.one_month },
              { label: "1Y", value: one.returns.one_year },
            ]}
          >
            <div className="flex items-center justify-between gap-3">
              <Split sector={one} />
              <MomentumChip score={toNumber(one.median_momentum)} />
            </div>
          </PopulationCard>
        ))
      )}
    </div>
  );
}
