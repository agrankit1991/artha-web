/**
 * One index or sector: what it is, how it is doing, and what it holds.
 *
 * One page for both, because they are the same question asked of a
 * different set of companies. The only real difference is that an index
 * trades and a sector does not, so an index gets a price and a chart of
 * its own and a sector's performance stands on its members.
 */

import { useCallback, useMemo, useState } from "react";

import type { KnownSymbol, Member } from "@/api/client";
import {
  fetchBreadth,
  fetchExternalSymbols,
  fetchFigures,
  fetchPopulation,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Heatmap } from "@/components/Heatmap";
import { PriceChart } from "@/components/PriceChart";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { coloured } from "@/lib/chartPalette";
import { companyPath } from "@/lib/paths";
import { formatPrice, formatVolume, toNumber } from "@/lib/format";

interface PopulationProps {
  kind: "index" | "sector";
  /** Which one, as the platform keys it. */
  scopeKey: string;
}

const DEFAULT_RANGE = 250;

/** Which view of the chart is showing. */
type View = "compare" | "price";

/** What the chart section can show. */
const VIEWS: Tab<View>[] = [
  { key: "compare", label: "Relative strength" },
  { key: "price", label: "Price" },
];

/**
 * Render the page.
 *
 * @param props - Which population to show.
 * @returns The page.
 */
export function Population({ kind, scopeKey }: PopulationProps): React.JSX.Element {
  const [sessions, setSessions] = useState(DEFAULT_RANGE);
  // The comparison first: how it is doing against the market is the
  // question this page is opened with, and its own price is one tab away.
  const [view, setView] = useState<View>("compare");

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

  // The subject and every benchmark it was measured against, so the chart
  // shows the same comparison the table above it states.
  const lines = useMemo<ChartLine[]>(() => {
    const benchmarks = population.data?.performance?.against ?? [];
    const subject = population.data?.instrument_key;
    const drawn = [
      ...(subject === undefined || subject === null
        ? []
        : [{ instrumentKey: subject, label: population.data?.name ?? subject }]),
      ...benchmarks.flatMap((one) =>
        one.instrument_key === null
          ? []
          : [{ instrumentKey: one.instrument_key, label: one.label }],
      ),
    ];
    // Everything after the subject is a benchmark: there to be read
    // against rather than read.
    return coloured(drawn).map((one, position) => ({ ...one, subdued: position > 0 }));
  }, [population.data]);

  // Every instrument the charts draw, asked about once, so each carries
  // its way out to TradingView.
  const loadSymbols = useCallback(
    () =>
      lines.length === 0
        ? Promise.resolve<Record<string, KnownSymbol>>({})
        : fetchExternalSymbols(lines.map((line) => line.instrumentKey)),
    [lines],
  );
  const symbols = useResource(loadSymbols);

  const loadComparison = useCallback(
    () =>
      lines.length === 0
        ? Promise.resolve(null)
        : fetchSeries(
            lines.map((line) => line.instrumentKey),
            sessions,
          ),
    [lines, sessions],
  );
  const comparison = useResource(loadComparison);

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

      {found !== null && instrument !== null && (
        <section className="space-y-3" aria-labelledby="price-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="price-heading" className="text-lg font-semibold">
                Price & Performance
              </h2>
              <p className="text-sm text-muted-foreground">
                {view === "compare"
                  ? "Against the market and the size bands, all rebased to the first session they share."
                  : "Its own sessions, with this platform's moving averages over them."}
              </p>
            </div>
            <RangeSelector
              ranges={PRICE_RANGES}
              sessions={sessions}
              onChange={setSessions}
              label="History"
            />
          </div>
          <Tabs tabs={VIEWS} active={view} onChange={setView} label="Chart">
            {view === "price" ? (
              <PriceChart
                points={chart.data?.points ?? null}
                loading={chart.loading}
                instrument={{
                  label: found.name,
                  symbol: symbols.data?.[instrument]?.symbol,
                  derived: symbols.data?.[instrument]?.derived,
                }}
              />
            ) : (
              <ComparisonChart
                series={comparison.data}
                lines={lines}
                symbols={symbols.data ?? {}}
                loading={comparison.loading}
              />
            )}
          </Tabs>
        </section>
      )}

      <BreadthPanel breadth={breadth.data} loading={breadth.loading} />

      {members.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Heatmap</CardTitle>
              <CardDescription>
                Every company counting once, coloured by its move — the same reading the breadth
                counts above are taken from.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Heatmap members={members} linkTo={(one) => companyPath(one.instrument_key)} />
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

/**
 * The companies, as a full list.
 *
 * The shape the previous project's indices page settled on: the name
 * stays put as the figures scroll past it and the header stays put as the
 * rows scroll under it, because a list of five hundred companies with a
 * dozen columns is unreadable without both.
 */
function Members({ members, loading }: { members: Member[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Member>[]>(
    () => [
      {
        id: "symbol",
        header: "Company",
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
      change("change", "Change", (row) => row.change_percent),
      change("one_week", "1W", (row) => row.one_week),
      change("one_month", "1M", (row) => row.one_month),
      change("three_months", "3M", (row) => row.three_months),
      change("one_year", "1Y", (row) => row.one_year),
      change("from_high", "From high", (row) => row.from_high_percent),
      change("from_low", "From low", (row) => row.from_low_percent),
      change("from_sma_200", "From 200-day", (row) => row.from_sma_200_percent),
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
      full
      linkTo={(row) => companyPath(row.instrument_key)}
    />
  );
}

/**
 * A column of percentages, coloured by direction.
 *
 * @param id - The column's identity.
 * @param header - What to call it.
 * @param of - Which figure it reads.
 * @returns The column.
 */
function change(id: string, header: string, of: (row: Member) => string | null): Column<Member> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? 0,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
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
