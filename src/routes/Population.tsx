/**
 * One index or sector: what it is, how it is doing, and what it holds.
 *
 * One page for both, because they are the same question asked of a
 * different set of companies. The only real difference is that an index
 * trades and a sector does not, so an index gets a price and a chart of
 * its own and a sector's performance stands on its members.
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { KnownSymbol, Member } from "@/api/client";
import {
  fetchBreadth,
  fetchEarnings,
  fetchIndexChanges,
  fetchExternalSymbols,
  fetchOverviewHistory,
  fetchOverviews,
  fetchPopulationValuation,
  fetchFigures,
  fetchHeatmap,
  fetchPriceBands,
  fetchPopulation,
  fetchSeries,
} from "@/api/client";
import { BreadthPanel } from "@/components/BreadthPanel";
import { Callout } from "@/components/Callout";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { EarningsPanel } from "@/components/EarningsPanel";
import { InstrumentFigures } from "@/components/InstrumentFigures";
import { PopulationValuationPanel } from "@/components/PopulationValuationPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Heatmap } from "@/components/Heatmap";
import { MoveSpread } from "@/components/MoveSpread";
import { PriceChart } from "@/components/PriceChart";
import { SessionPicker } from "@/components/SessionPicker";
import { ShareButton } from "@/components/ShareButton";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { type Tab, Tabs } from "@/components/Tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Failed } from "@/components/Failed";
import { IndexChanges } from "@/components/IndexChanges";
import { InstrumentHeader } from "@/components/InstrumentHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { ENTITIES, MARKS } from "@/lib/entities";
import { useChartRange } from "@/hooks/useChartRange";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { categoryLabel } from "@/lib/indices";
import { coloured } from "@/lib/chartPalette";
import { companyPath } from "@/lib/paths";
import { monthOfCloses } from "@/lib/sharing";
import { type Contribution, contributions } from "@/lib/contribution";
import {
  ABSENT,
  formatCount,
  formatDay,
  formatPercent,
  formatPercentLevel,
  formatPrice,
  formatSignedPrice,
  formatVolume,
  toNumber,
} from "@/lib/format";

interface PopulationProps {
  kind: "index" | "sector";
  /** Which one, as the platform keys it. */
  scopeKey: string;
}

/** Which view of the chart is showing. */
type View = "compare" | "price";

/** What the chart section can show. */
const VIEWS: Tab<View>[] = [
  { key: "price", label: "Price" },
  { key: "compare", label: "Relative strength" },
];

/**
 * Render the page.
 *
 * @param props - Which population to show.
 * @returns The page.
 */
export function Population({ kind, scopeKey }: PopulationProps): React.JSX.Element {
  const [sessions, setSessions] = useChartRange();
  // Its own price first, as the owner reads a page (2026-09-23); how it is
  // doing against the market is one tab away.
  const [view, setView] = useState<View>("price");

  // The session the page is read as of, kept in the address; none is the latest.
  const [chosenDay, setChosenDay] = useSearchParam("as_of");
  const asOf = chosenDay === "" ? null : chosenDay;
  const setAsOf = (next: string | null): void => {
    setChosenDay(next ?? "");
  };
  const load = useCallback(() => fetchPopulation(kind, scopeKey, asOf), [kind, scopeKey, asOf]);
  // Breadth over its own window, the one the overview reads: tied to the
  // chart's range, five years of price meant five years of breadth.
  const loadBreadth = useCallback(() => fetchBreadth(kind, scopeKey), [kind, scopeKey]);
  const population = useResource(load);
  const breadth = useResource(loadBreadth);

  // What the population's companies earned, summed period by period.
  const [chosenCadence, setCadence] = useSearchParam("cadence", "annual");
  const cadence = chosenCadence === "quarterly" ? "quarterly" : "annual";
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
  // The map's own request: every company with its sector, both sizes and
  // every period's move, so the map's choices redraw without asking again.
  const loadHeatmap = useCallback(() => fetchHeatmap(kind, scopeKey), [kind, scopeKey]);
  const heatmap = useResource(loadHeatmap);
  // Only an index is reconstituted; a sector's membership is its companies' profiles.
  const loadChanges = useCallback(
    () => (kind === "index" ? fetchIndexChanges(scopeKey) : Promise.resolve([])),
    [kind, scopeKey],
  );
  const changes = useResource(loadChanges);
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
  const loadForecast = useCallback(
    () => (instrument === null ? Promise.resolve(null) : fetchPriceBands(instrument)),
    [instrument],
  );
  const forecast = useResource(loadForecast);

  const members = useMemo(() => population.data?.members ?? [], [population.data]);
  // Each member's part in the day's move, weighed by capitalisation; in
  // index points where the population has a level, in per cent where not.
  const previousLevel = toNumber(own.data?.[0]?.day.previous_close);
  // Only for the latest session: the valuation is always today's, so a
  // past session's contribution would weigh a past move by today's caps.
  const parts = useMemo(
    () =>
      asOf === null
        ? contributions(valuation.data?.members ?? [], kind === "index" ? previousLevel : null)
        : new Map<string, Contribution>(),
    [valuation.data, kind, previousLevel, asOf],
  );

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
  const inPoints = kind === "index";

  return (
    <div className="space-y-6">
      <InstrumentHeader
        // Its own name from the start: the key's tail ("Nifty 50") until the
        // platform says what it is called, never the raw key.
        name={found?.name ?? scopeKey.slice(scopeKey.lastIndexOf("|") + 1)}
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
        {...(found === null
          ? {}
          : {
              subline: (
                <span>
                  {formatCount(members.length)} {members.length === 1 ? "company" : "companies"}
                </span>
              ),
            })}
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
      {asOf !== null && (
        // Said plainly, because only part of the page can go back in time.
        <Callout tone="info">
          Read as of {formatDay(asOf)}: the level, the figures and the companies. The chart,
          breadth, valuation, earnings and the heatmap show the latest, and each company&apos;s part
          in the move is given for the latest session only.
        </Callout>
      )}

      {found !== null && instrument !== null && (
        <section className="space-y-3" aria-labelledby="price-heading">
          <SectionHeader
            id="price-heading"
            icon={MARKS.price}
            title="Price & performance"
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
                forecast={forecast.data ?? null}
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
            icon={MARKS.figures}
            title="The index itself"
            description="Its own level, range, trend, volume and momentum: the same figures a company carries, because an index trades."
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
          icon={MARKS.financials}
          title="Valuation"
          description="What the typical company trades at, and what the whole is worth."
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

      <section className="space-y-4" aria-labelledby="members-heading">
        <SectionHeader
          id="members-heading"
          icon={ENTITIES.company.icon}
          title="Its companies"
          description="How each moved, who moved the whole, who joined and left, and the full list."
        />
        {!population.loading && members.length === 0 ? (
          // Said, where four sections used to vanish without a word.
          <Empty
            title="No companies recorded for this population"
            reason="Its membership has not been captured yet, so there is nothing to count or rank."
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Heatmap</CardTitle>
                <CardDescription>
                  Every company sized by what it is worth and coloured by how it moved, grouped by
                  sector. Choose a sector&apos;s name to see it alone, or Equal to count every
                  company once, as the breadth counts above do.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {heatmap.error !== null ? (
                  <Failed message={heatmap.error} />
                ) : (
                  <Heatmap
                    tiles={heatmap.data?.tiles ?? null}
                    label={found?.name ?? scopeKey}
                    linkTo={(tile) => companyPath(tile.instrument_key, tile.symbol)}
                  />
                )}
              </CardContent>
            </Card>

            <TodaysMoves members={members} parts={parts} inPoints={inPoints} asOf={asOf} />

            <IndexChanges changes={changes.data ?? []} />

            <Card>
              <CardHeader>
                <CardTitle>Constituents</CardTitle>
              </CardHeader>
              <CardContent>
                <Members
                  members={members}
                  loading={population.loading}
                  parts={parts}
                  inPoints={inPoints}
                />
              </CardContent>
            </Card>
          </>
        )}
      </section>
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
function Members({
  members,
  loading,
  parts,
  inPoints,
}: {
  members: Member[];
  loading: boolean;
  parts: Map<string, Contribution>;
  inPoints: boolean;
}): React.JSX.Element {
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
      ...(parts.size === 0 ? [] : contributionColumns(parts, inPoints)),
      change("one_week", "1W", (row) => row.one_week),
      change("one_month", "1M", (row) => row.one_month),
      change("three_months", "3M", (row) => row.three_months),
      change("one_year", "1Y", (row) => row.one_year),
      distance("from_high", "From high", (row) => row.from_high_percent),
      distance("from_low", "From low", (row) => row.from_low_percent),
      distance("from_sma_200", "From 200-day", (row) => row.from_sma_200_percent),
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.volume),
        meta: { align: "right" },
      },
    ],
    [parts, inPoints],
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
 * Each member's weight and its part in the day's move, with their units:
 * the weight in per cent, the part in index points where the population
 * has a level and in percentage points where it has none.
 *
 * @param parts - Each member's contribution, by instrument key.
 * @param inPoints - Whether the part is in index points.
 * @returns The two columns.
 */
function contributionColumns(
  parts: Map<string, Contribution>,
  inPoints: boolean,
): Column<Member>[] {
  return [
    {
      id: "weight",
      header: "Weight",
      accessorFn: (row) => parts.get(row.instrument_key)?.weight ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => {
        const weight = parts.get(row.original.instrument_key)?.weight;
        return weight === undefined ? ABSENT : formatPercentLevel(weight.toFixed(2));
      },
      meta: { align: "right" },
    },
    {
      id: "contribution",
      header: inPoints ? "Contribution (pts)" : "Contribution (pp)",
      accessorFn: (row) =>
        partOf(parts.get(row.instrument_key), inPoints) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => (
        <Delta
          value={toText(partOf(parts.get(row.original.instrument_key), inPoints))}
          format={formatSignedPrice}
          arrow={false}
        />
      ),
      meta: { align: "right" },
    },
  ];
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
    // A company with no figure sorts last, not among the flat ones.
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}

/**
 * A column of distances in per cent: signed, but plain, because being 12%
 * under the year's high is where a price stands, not a fall that happened.
 *
 * @param id - The column's identity.
 * @param header - What to call it.
 * @param of - Which figure it reads.
 * @returns The column.
 */
function distance(id: string, header: string, of: (row: Member) => string | null): Column<Member> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => (
      <span className="tabular text-muted-foreground">{formatPercent(of(row.original))}</span>
    ),
    meta: { align: "right" },
  };
}

/** The previous project's tint for the badges that say where and what an index is. */
const TINTED = "bg-primary/10 text-primary";

/** A member's part in the move, in index points or percentage points. */
function partOf(part: Contribution | undefined, inPoints: boolean): number | null {
  if (part === undefined) {
    return null;
  }
  return inPoints ? part.points : part.percent;
}

/**
 * A computed figure as the text the formatters read, to two decimals.
 *
 * A part that rounds to nought is written "0.00": left as "-0.00", a
 * company that barely moved a sector of two hundred read as a fall.
 */
export function toText(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  const written = value.toFixed(2);
  return written === "-0.00" ? "0.00" : written;
}

/** How many members each side of the leaders names. */
const LEADERS = 5;

/**
 * The day's moves: who moved the whole each way, and how the moves were
 * spread across every company.
 *
 * The leaders are weighed by market capitalisation, not the free float an
 * exchange uses, so the figures are close rather than exact, and the card
 * says so. They are the one place the page names them: the valuation panel
 * listed the same companies again by rupees moved.
 *
 * @param props - The members, their parts in the move (none when reading
 *   a past session), the unit, and the session being read.
 * @returns The card.
 */
function TodaysMoves({
  members,
  parts,
  inPoints,
  asOf,
}: {
  members: Member[];
  parts: Map<string, Contribution>;
  inPoints: boolean;
  asOf: string | null;
}): React.JSX.Element {
  const ranked = members
    .flatMap((one) => {
      const value = partOf(parts.get(one.instrument_key), inPoints);
      return value === null ? [] : [{ member: one, value }];
    })
    .sort((first, second) => second.value - first.value);
  const lifted = ranked.filter((one) => one.value > 0).slice(0, LEADERS);
  const dragged = ranked
    .filter((one) => one.value < 0)
    .reverse()
    .slice(0, LEADERS);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{asOf === null ? "Today's moves" : `The moves of ${formatDay(asOf)}`}</CardTitle>
        {ranked.length > 0 && (
          <CardDescription>
            Who moved it most: each company&apos;s weight times its move,{" "}
            {inPoints ? "in index points" : "in percentage points"}. Weights are by market
            capitalisation, not free float, so these are close rather than exact.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {ranked.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["Lifted by", lifted],
                ["Dragged by", dragged],
              ] as const
            ).map(([title, rows]) => (
              <div key={title} className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {title}
                </h4>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nobody today</p>
                ) : (
                  <ol className="space-y-1.5">
                    {rows.map(({ member, value }) => (
                      <li
                        key={member.instrument_key}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <Link
                          to={companyPath(member.instrument_key, member.symbol)}
                          viewTransition
                          className="truncate font-medium text-primary hover:underline"
                        >
                          {member.symbol}
                        </Link>
                        <Delta value={toText(value)} format={formatSignedPrice} arrow={false} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
        <MoveSpread changes={members.map((one) => one.change_percent)} />
      </CardContent>
    </Card>
  );
}
