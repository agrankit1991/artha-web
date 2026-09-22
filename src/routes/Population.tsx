/**
 * One index or sector: what it is, how it is doing, and what it holds.
 *
 * One page for both, because they are the same question asked of a
 * different set of companies. The only real difference is that an index
 * trades and a sector does not, so an index gets a price and a chart of
 * its own and a sector's performance stands on its members.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { Cadence, KnownSymbol, Member } from "@/api/client";
import {
  fetchBreadth,
  fetchEarnings,
  fetchExternalSymbols,
  fetchOverviewHistory,
  fetchOverviews,
  fetchPopulationValuation,
  fetchFigures,
  fetchPopulation,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { EarningsPanel } from "@/components/EarningsPanel";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { PopulationValuationPanel } from "@/components/PopulationValuationPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Heatmap } from "@/components/Heatmap";
import { PriceChart } from "@/components/PriceChart";
import { SessionPicker } from "@/components/SessionPicker";
import { ShareButton } from "@/components/ShareButton";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Failed } from "@/components/Failed";
import { InstrumentHeader } from "@/components/InstrumentHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { ENTITIES, MARKS } from "@/lib/entities";
import { useResource } from "@/hooks/useResource";
import { categoryLabel } from "@/lib/indices";
import { readPreferences, writePreferences } from "@/lib/preferences";
import { coloured } from "@/lib/chartPalette";
import { companyPath } from "@/lib/paths";
import { monthOfCloses } from "@/lib/sharing";
import { formatDay, formatPercent, formatPrice, formatVolume, toNumber } from "@/lib/format";

interface PopulationProps {
  kind: "index" | "sector";
  /** Which one, as the platform keys it. */
  scopeKey: string;
}

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
  const [sessions, setSessionsOnly] = useState(() => readPreferences().range);
  const setSessions = (next: number): void => {
    setSessionsOnly(next);
    writePreferences({ range: next });
  };
  // The comparison first: how it is doing against the market is the
  // question this page is opened with, and its own price is one tab away.
  const [view, setView] = useState<View>("compare");

  // The session the page is read as of, kept in the address; null is the latest.
  const [params, setParams] = useSearchParams();
  const asOf = params.get("as_of");
  const setAsOf = (next: string | null): void => {
    const query = new URLSearchParams(params);
    if (next === null) {
      query.delete("as_of");
    } else {
      query.set("as_of", next);
    }
    setParams(query, { replace: true });
  };
  const load = useCallback(() => fetchPopulation(kind, scopeKey, asOf), [kind, scopeKey, asOf]);
  const loadBreadth = useCallback(
    () => fetchBreadth(kind, scopeKey, sessions),
    [kind, scopeKey, sessions],
  );
  const population = useResource(load);
  const breadth = useResource(loadBreadth);

  // What the population's companies earned, summed period by period.
  const [cadence, setCadence] = useState<Cadence>("annual");
  const loadEarnings = useCallback(
    () => fetchEarnings(kind, scopeKey, cadence),
    [kind, scopeKey, cadence],
  );
  const earnings = useResource(loadEarnings);

  // Every member valued by the rule its own page uses, and the population
  // with them; and, for an index, its own figures, because it trades.
  const loadValuation = useCallback(
    () => fetchPopulationValuation(kind, scopeKey),
    [kind, scopeKey],
  );
  const valuation = useResource(loadValuation);
  const ownKey = population.data?.instrument_key ?? null;
  const loadOwn = useCallback(
    () => (ownKey === null ? Promise.resolve([]) : fetchOverviews([ownKey], asOf)),
    [ownKey, asOf],
  );
  const own = useResource(loadOwn);
  const loadOwnHistory = useCallback(
    () => (ownKey === null ? Promise.resolve([]) : fetchOverviewHistory(ownKey)),
    [ownKey],
  );
  const ownHistory = useResource(loadOwnHistory);

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
    return <Failed message={population.error} />;
  }

  const found = population.data;

  return (
    <div className="space-y-6">
      <InstrumentHeader
        name={found?.name ?? scopeKey}
        badges={
          <>
            {ownKey !== null && (
              <Badge variant="outline" className={TINTED}>
                {ownKey.replace("_INDEX|", ":")}
              </Badge>
            )}
            {found?.category != null && (
              <Badge variant="outline" className={TINTED}>
                {categoryLabel(found.category)}
              </Badge>
            )}
            <Badge variant="secondary">{ENTITIES[kind].label}</Badge>
          </>
        }
        subline={
          <>
            {ownKey !== null && (
              <>
                <span className="font-medium">{ownKey.split("_")[0]}</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            <span>
              {members.length} {members.length === 1 ? "company" : "companies"}
            </span>
          </>
        }
        overview={own.data?.[0]}
        description={found?.description}
        actions={
          ownKey !== null &&
          found !== null && (
            <ShareButton
              facts={{
                title: found.name,
                subtitle: "Index",
                price: formatPrice(own.data?.[0]?.day.close),
                changePercent: toNumber(own.data?.[0]?.day.change_percent),
                changeText: formatPercent(own.data?.[0]?.day.change_percent),
                asOf: `As of ${formatDay(own.data?.[0]?.as_of)}`,
              }}
              loadPoints={() => monthOfCloses(ownKey)}
              filename={found.name.toLowerCase().replaceAll(/\s+/g, "-")}
            />
          )
        }
      />

      <SessionPicker asOf={asOf} onChange={setAsOf} />

      {found !== null && instrument !== null && (
        <section className="space-y-3" aria-labelledby="price-heading">
          <SectionHeader
            id="price-heading"
            icon={ENTITIES.index.icon}
            title="Price & Performance"
            description={
              view === "compare"
                ? "Against the market and the size bands, all rebased to the first session they share."
                : "Its own sessions, with this platform's moving averages over them."
            }
            actions={
              <RangeSelector
                ranges={PRICE_RANGES}
                sessions={sessions}
                onChange={setSessions}
                label="History"
              />
            }
          />
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

      {ownKey !== null && (
        <section className="space-y-3" aria-labelledby="figures-heading">
          <SectionHeader
            id="figures-heading"
            icon={ENTITIES.index.icon}
            title="The Index Itself"
            description="Its own level, range, trend, volume and momentum — the same figures a company carries, because an index trades."
          />
          <InstrumentFigures
            overview={own.data?.[0] ?? null}
            loading={own.loading}
            history={ownHistory.data ?? []}
          />
        </section>
      )}

      <BreadthPanel breadth={breadth.data} loading={breadth.loading} />

      <section className="space-y-3" aria-labelledby="valuation-heading">
        <SectionHeader
          id="valuation-heading"
          icon={ENTITIES.company.icon}
          title="Valuation & Contribution"
          description="What the typical company trades at, and which companies moved the most money today."
        />
        {valuation.error !== null ? (
          <Failed message={valuation.error} />
        ) : (
          <PopulationValuationPanel valuation={valuation.data} loading={valuation.loading} />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="earnings-heading">
        <SectionHeader
          id="earnings-heading"
          icon={MARKS.earnings}
          title="Earnings"
          description="What its companies earned, summed period by period, with the share of them growing beside the total."
        />
        {earnings.error !== null ? (
          <Failed message={earnings.error} />
        ) : (
          <EarningsPanel
            earnings={earnings.data}
            loading={earnings.loading}
            cadence={cadence}
            onCadence={setCadence}
          />
        )}
      </section>

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
              <Heatmap
                members={members}
                linkTo={(one) => companyPath(one.instrument_key, one.symbol)}
              />
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
      symbolColumn((row) => row),
      nameColumn((row) => row),
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
      linkTo={(row) => companyPath(row.instrument_key, row.symbol)}
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

/** The previous project's tint for the badges that say where and what an index is. */
const TINTED = "bg-primary/10 text-primary";
