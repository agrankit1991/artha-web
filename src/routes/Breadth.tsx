/**
 * Market breadth, at length.
 *
 * The overview shows one glance at this; a page exists because the
 * question has depth the glance cannot hold. Which population, over which
 * window, and then every session's counts rather than only the latest --
 * because every breadth measure is a shape, and a divergence between the
 * index and its participants is visible over months and invisible in a day.
 */

import { Activity, Grid3x3, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { BreadthSession } from "@/api/client";
import { fetchBreadth, fetchBreadthGrid, fetchParticipation, fetchScopes } from "@/api/client";
import { BreadthGridPanel } from "@/components/BreadthGridPanel";
import { type BreadthMeasure, BreadthHeatmap } from "@/components/BreadthHeatmap";
import { Chooser, type Option } from "@/components/Chooser";
import { BreadthChart } from "@/components/BreadthChart";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { Empty } from "@/components/Empty";
import { ParticipationPopulations } from "@/components/ParticipationPopulations";
import { RegimeBanner } from "@/components/RegimeBanner";
import { BREADTH_RANGES, PARTICIPATION_RANGES, RangeSelector } from "@/components/RangeSelector";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { StatTile } from "@/components/StatTile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { useResource } from "@/hooks/useResource";
import { headlinePopulations, heatmapRows } from "@/lib/participationPopulations";
import { populationPath, scopeFromParams, withScope } from "@/lib/paths";
import { usePreferences, writePreferences } from "@/lib/preferences";
import { readings } from "@/lib/breadthReadings";
import { ABSENT, formatCount, formatDay, toNumber } from "@/lib/format";

const DEFAULT_WINDOW = 250;

/** The kinds of population the grid can lay out, and what to call them. */
const GRIDS: Option<"sector" | "index">[] = [
  { key: "sector", label: "Sectors" },
  { key: "index", label: "Indices" },
];

/**
 * Render the breadth page.
 *
 * @returns The page.
 */
export function Breadth(): React.JSX.Element {
  // The population and the window live in the address: a reading of breadth
  // is a page somebody bookmarks, and Back should not lose it.
  const [params, setParams] = useSearchParams();
  const scope = useMemo(() => scopeFromParams(params), [params]);
  const asked = Number(params.get("window"));
  const sessions = BREADTH_RANGES.some((range) => range.sessions === asked)
    ? asked
    : DEFAULT_WINDOW;
  const setScope = (next: Scope): void => {
    setParams(withScope(params, next), { replace: true });
  };
  const setSessions = (next: number): void => {
    const query = new URLSearchParams(params);
    query.set("window", String(next));
    setParams(query, { replace: true });
  };
  const [gridKind, setGridKind] = useState<"sector" | "index">("sector");

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadBreadth = useCallback(
    () => fetchBreadth(scope.kind, scope.key, sessions),
    [scope, sessions],
  );

  const loadGrid = useCallback(() => fetchBreadthGrid(gridKind), [gridKind]);

  const scopes = useResource(loadScopes);
  const breadth = useResource(loadBreadth);
  const grid = useResource(loadGrid);

  // Participation over time: the reader's own populations, or the headline
  // indices until they choose. Its own span rather than the page's window,
  // so twenty years here does not load twenty years into the table below.
  const [measure, setMeasure] = useState<BreadthMeasure>("above_sma_50");
  const [span, setSpan] = useState(HEATMAP_SESSIONS);
  const { participation: chosen } = usePreferences();
  const populations = useMemo(
    () => chosen ?? headlinePopulations(scopes.data),
    [chosen, scopes.data],
  );
  const loadParticipation = useCallback(
    () =>
      populations.length === 0 ? Promise.resolve(null) : fetchParticipation(populations, span),
    [populations, span],
  );
  const participation = useResource(loadParticipation);
  const rows = useMemo(
    () => heatmapRows(participation.data, measure, scopes.data),
    [participation.data, measure, scopes.data],
  );
  // The headline indices are named by the platform's list, so until it
  // answers there is nothing to fetch and the grid is still loading.
  const awaitingHeadlines = chosen === null && scopes.data === null;

  const measures = useMemo(() => readings(breadth.data), [breadth.data]);
  // Newest first: a table is read from the top, and the top of this one is
  // the session a reader came to look at.
  const history = useMemo(() => [...(breadth.data?.sessions ?? [])].reverse(), [breadth.data]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <PageHeader
          title="Market Breadth"
          description="How many instruments took part, rather than how far the index moved."
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScopePicker scope={scope} options={scopes.data} onChange={setScope} />
          <RangeSelector
            ranges={BREADTH_RANGES}
            sessions={sessions}
            onChange={setSessions}
            label="Window"
          />
        </div>
      </header>

      {breadth.error !== null ? (
        <Failed message={breadth.error} />
      ) : (
        <>
          <RegimeBanner
            regime={breadth.data?.regime}
            share={toNumber(breadth.data?.latest?.above_sma_200)}
            rank={toNumber(breadth.data?.percentiles?.above_sma_200)}
            sessions={breadth.data?.percentiles?.sessions}
            loading={breadth.loading}
          />

          <section
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            aria-label="Headline measures"
          >
            {measures.map((measure) => (
              <StatTile
                key={measure.label}
                label={measure.label}
                value={measure.value}
                hint={measure.hint}
                tone={measure.tone}
              />
            ))}
          </section>

          {/* Today's split and the shares above each average. The trend
              readings are the tiles above and the chart below, so the panel
              does not repeat them. */}
          <BreadthPanel
            breadth={breadth.data}
            loading={breadth.loading}
            title="Today"
            trends={false}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Grid3x3 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                Participation over time
              </CardTitle>
              <CardDescription>
                How much of each index stood above its moving average, day by day. A longer span
                scrolls sideways, the newest session at the right.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RangeSelector
                ranges={PARTICIPATION_RANGES}
                sessions={span}
                onChange={setSpan}
                label="Span"
              />
              <Chooser
                options={MEASURES}
                chosen={measure}
                onChange={setMeasure}
                label="Moving average"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {participation.error !== null ? (
            <Failed message={participation.error} />
          ) : chosen === null && scopes.error !== null ? (
            <Failed message={scopes.error} />
          ) : populations.length === 0 && !awaitingHeadlines ? (
            <Empty
              title="No populations to compare"
              reason="Add an index or a sector below, or reset to the headline indices."
            />
          ) : (
            <BreadthHeatmap
              days={participation.data?.days ?? []}
              rows={rows}
              measureLabel={MEASURES.find((one) => one.key === measure)?.label ?? ""}
              loading={participation.loading || awaitingHeadlines}
              yearly={span > HEATMAP_SESSIONS}
            />
          )}
          <ParticipationPopulations
            populations={populations}
            options={scopes.data}
            onChange={(next) => {
              writePreferences({ participation: next });
            }}
            onReset={
              chosen === null
                ? null
                : () => {
                    writePreferences({ participation: null });
                  }
            }
          />
        </CardContent>
      </Card>

      {breadth.error === null && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Advance-decline trend
            </CardTitle>
            <CardDescription>
              How one-sided each session was: above the rule more companies rose than fell, below it
              more fell than rose. Hover for the counts themselves. The McClellan oscillator keeps a
              band of its own.
            </CardDescription>
          </CardHeader>
          <CardContent role="region" aria-label="Advance-decline trend">
            <BreadthChart sessions={breadth.data?.sessions ?? []} loading={breadth.loading} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle as="h2" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                Sector and index breadth
              </CardTitle>
              <CardDescription>
                Every population of one kind, strongest participation first.
              </CardDescription>
            </div>
            <Chooser
              options={GRIDS}
              chosen={gridKind}
              onChange={setGridKind}
              label="Grid population"
            />
          </div>
        </CardHeader>
        <CardContent role="region" aria-label="Population grid">
          {grid.error !== null ? (
            <Failed message={grid.error} />
          ) : (
            <BreadthGridPanel
              scopes={grid.data?.scopes ?? []}
              comparedWith={grid.data?.compared_with}
              loading={grid.loading}
              onSelect={(scopeKey) => {
                setScope({ kind: gridKind, key: scopeKey });
              }}
              linkTo={(scopeKey) => populationPath(gridKind, scopeKey)}
            />
          )}
        </CardContent>
      </Card>

      {breadth.error === null && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-muted-foreground" />
              Daily breadth
            </CardTitle>
          </CardHeader>
          <CardContent role="region" aria-label="Session history">
            <SessionTable sessions={history} loading={breadth.loading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Every counted session, as the one table. */
function SessionTable({
  sessions,
  loading,
}: {
  sessions: BreadthSession[];
  loading: boolean;
}): React.JSX.Element {
  const columns = useMemo<Column<BreadthSession>[]>(
    () => [
      {
        id: "as_of",
        header: "Session",
        accessorFn: (row) => row.as_of,
        cell: ({ row }) => formatDay(row.original.as_of),
      },
      // Those with a move measured, the total the split is of: the same
      // figure the panel above calls counted (the platform's instruments
      // include a few with no move on the day).
      count("counted", "Counted", (row) => row.advancing + row.declining + row.unchanged),
      count("advancing", "Advancing", (row) => row.advancing, "text-gain"),
      count("declining", "Declining", (row) => row.declining, "text-loss"),
      count("unchanged", "Unchanged", (row) => row.unchanged),
      {
        id: "advance_decline_ratio",
        header: "A/D ratio",
        accessorFn: (row) => toNumber(row.advance_decline_ratio) ?? 0,
        cell: ({ row }) => figure(row.original.advance_decline_ratio, 2),
        meta: { align: "right" },
      },
      count("new_highs", "New highs", (row) => row.new_highs, "text-gain"),
      count("new_lows", "New lows", (row) => row.new_lows, "text-loss"),
      {
        id: "above_sma_200",
        header: "Above 200-day",
        accessorFn: (row) => toNumber(row.above_sma_200) ?? 0,
        cell: ({ row }) => percent(row.original.above_sma_200),
        meta: { align: "right" },
      },
      {
        id: "arms_index",
        header: "TRIN",
        accessorFn: (row) => toNumber(row.arms_index) ?? 0,
        cell: ({ row }) => figure(row.original.arms_index, 2),
        meta: { align: "right" },
      },
      {
        id: "advance_decline_line",
        header: "A/D line",
        accessorFn: (row) => toNumber(row.advance_decline_line) ?? 0,
        // A running count, grouped as one; not a volume in lakh and crore.
        cell: ({ row }) => formatCount(toNumber(row.original.advance_decline_line)),
        meta: { align: "right" },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={sessions}
      loading={loading}
      empty="No sessions counted for this population"
      placeholderRows={8}
      // A year or more of sessions, scrolled in place with the header pinned.
      full
      maxHeight="36rem"
    />
  );
}

/** A column of counts, coloured only where the count has a side. */
function count(
  id: string,
  header: string,
  of: (row: BreadthSession) => number,
  className?: string,
): Column<BreadthSession> {
  return {
    id,
    header,
    accessorFn: of,
    cell: ({ row }) => <span className={className}>{formatCount(of(row.original))}</span>,
    meta: { align: "right" },
  };
}

/** A decimal figure, or a dash where the platform had none. */
function figure(value: string | null, places: number): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : parsed.toFixed(places);
}

/** A percentage, or a dash. */
function percent(value: string | null): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : `${parsed.toFixed(1)}%`;
}

/** How many sessions the heatmap spans until a longer span is chosen: about ten weeks, as StockEdge's does. */
const HEATMAP_SESSIONS = 50;

/** The averages the heatmap can measure against. */
const MEASURES: readonly { key: BreadthMeasure; label: string }[] = [
  { key: "above_sma_20", label: "20-day" },
  { key: "above_sma_50", label: "50-day" },
  { key: "above_sma_200", label: "200-day" },
];
