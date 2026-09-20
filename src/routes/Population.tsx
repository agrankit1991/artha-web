/**
 * One index or sector: what it is, how it is doing, and what it holds.
 *
 * One page for both, because they are the same question asked of a
 * different set of companies. The only real difference is that an index
 * trades and a sector does not, so an index gets a price and a chart of
 * its own and a sector's performance stands on its members.
 */

import { useCallback, useMemo, useState } from "react";

import type { Member } from "@/api/client";
import { fetchBreadth, fetchFigures, fetchPopulation } from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Heatmap } from "@/components/Heatmap";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { RelativeStrength } from "@/components/RelativeStrength";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { formatPercent, formatPrice, formatVolume, toNumber } from "@/lib/format";

interface PopulationProps {
  kind: "index" | "sector";
  /** Which one, as the platform keys it. */
  scopeKey: string;
}

const DEFAULT_RANGE = 250;

/**
 * Render the page.
 *
 * @param props - Which population to show.
 * @returns The page.
 */
export function Population({ kind, scopeKey }: PopulationProps): React.JSX.Element {
  const [sessions, setSessions] = useState(DEFAULT_RANGE);

  const load = useCallback(() => fetchPopulation(kind, scopeKey), [kind, scopeKey]);
  const loadBreadth = useCallback(
    () => fetchBreadth(kind, scopeKey, sessions),
    [kind, scopeKey, sessions],
  );
  const population = useResource(load);
  const breadth = useResource(loadBreadth);

  const instrument = population.data?.instrument_key ?? null;
  const loadChart = useCallback(
    () => (instrument === null ? Promise.resolve(null) : fetchFigures(instrument, sessions)),
    [instrument, sessions],
  );
  const chart = useResource(loadChart);

  const members = useMemo(() => population.data?.members ?? [], [population.data]);

  if (population.error !== null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {population.error}
      </p>
    );
  }

  const found = population.data;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{found?.name ?? scopeKey}</h1>
          {found?.category != null && <Badge variant="secondary">{readable(found.category)}</Badge>}
          <Badge variant="outline">{kind === "index" ? "Index" : "Sector"}</Badge>
          <span className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "company" : "companies"}
          </span>
        </div>
        {found?.description != null && (
          <p className="max-w-3xl text-sm text-muted-foreground">{found.description}</p>
        )}
      </header>

      <RelativeStrength
        performance={found?.performance ?? null}
        name={found?.name ?? scopeKey}
        loading={population.loading}
      />

      {instrument !== null && (
        <section className="space-y-3" aria-labelledby="price-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="price-heading" className="text-lg font-semibold">
              Price
            </h2>
            <RangeSelector
              ranges={PRICE_RANGES}
              sessions={sessions}
              onChange={setSessions}
              label="History"
            />
          </div>
          <PriceChart points={chart.data?.points ?? null} loading={chart.loading} />
        </section>
      )}

      <BreadthPanel breadth={breadth.data} loading={breadth.loading} />

      {members.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How the day went</CardTitle>
              <CardDescription>
                Every company counting once, coloured by its move — the same reading the breadth
                counts above are taken from.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Heatmap members={members} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Constituents</CardTitle>
            </CardHeader>
            <CardContent>
              <Members members={members} loading={population.loading} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** The companies, as the one table. */
function Members({ members, loading }: { members: Member[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Member>[]>(
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
        id: "change",
        header: "Change",
        accessorFn: (row) => toNumber(row.change_percent) ?? 0,
        cell: ({ row }) => <Delta value={row.original.change_percent} />,
        meta: { align: "right" },
      },
      {
        id: "from_high",
        header: "From high",
        accessorFn: (row) => toNumber(row.from_high_percent) ?? 0,
        cell: ({ row }) => formatPercent(row.original.from_high_percent),
        meta: { align: "right" },
      },
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.volume),
        meta: { align: "right" },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={members}
      loading={loading}
      empty="No companies recorded for this population"
      placeholderRows={8}
      label="Constituents"
    />
  );
}

/**
 * Turn an exchange's own classification into something readable.
 *
 * @param category - The classification, as the exchange publishes it.
 * @returns The same thing in words.
 */
function readable(category: string): string {
  const words = category.toLowerCase().split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
