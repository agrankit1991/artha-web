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

import type { BreadthSession } from "@/api/client";
import { fetchBreadth, fetchBreadthGrid, fetchScopes } from "@/api/client";
import { BreadthGridPanel } from "@/components/BreadthGridPanel";
import { type BreadthMeasure, BreadthHeatmap, type HeatmapRow } from "@/components/BreadthHeatmap";
import { Chooser } from "@/components/Chooser";
import { BreadthChart } from "@/components/BreadthChart";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { RegimeBanner } from "@/components/RegimeBanner";
import { BREADTH_RANGES, RangeSelector } from "@/components/RangeSelector";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { Statistic } from "@/components/Statistic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { useResource } from "@/hooks/useResource";
import { FEATURED_INDICES } from "@/lib/indices";
import { populationPath } from "@/lib/paths";
import { readings } from "@/lib/breadthReadings";
import { ABSENT, formatDay, formatVolume, toNumber } from "@/lib/format";

const DEFAULT_WINDOW = 250;

/** The kinds of population the grid can lay out, and what to call them. */
const GRIDS: { kind: "sector" | "indices" | "index"; label: string }[] = [
  { kind: "sector", label: "Sectors" },
  { kind: "index", label: "Indices" },
];

/**
 * Render the breadth page.
 *
 * @returns The page.
 */
export function Breadth(): React.JSX.Element {
  const [scope, setScope] = useState<Scope>({ kind: "companies", key: null });
  const [sessions, setSessions] = useState(DEFAULT_WINDOW);
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

  // The headline indices' last fifty sessions each, for the heatmap. One
  // request apiece, side by side: the endpoint already answers per population.
  const [measure, setMeasure] = useState<BreadthMeasure>("above_sma_50");
  const loadHeatmap = useCallback(
    () =>
      Promise.all(
        FEATURED_INDICES.map(async (index): Promise<HeatmapRow> => {
          const found = await fetchBreadth("index", index.key, HEATMAP_SESSIONS);
          return {
            key: index.key,
            label: index.name,
            href: populationPath("index", index.key),
            sessions: found.sessions,
          };
        }),
      ),
    [],
  );
  const heatmap = useResource(loadHeatmap);

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
              <Statistic
                key={measure.label}
                label={measure.label}
                value={measure.value}
                hint={measure.hint}
                tone={measure.tone}
              />
            ))}
          </section>

          <BreadthPanel breadth={breadth.data} loading={breadth.loading} />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3x3 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    Participation Over Time
                  </CardTitle>
                  <CardDescription>
                    Each headline index's last {HEATMAP_SESSIONS} sessions: how much of it stood
                    above its moving average, day by day.
                  </CardDescription>
                </div>
                <Chooser
                  options={MEASURES}
                  chosen={measure}
                  onChange={setMeasure}
                  label="Moving average"
                />
              </div>
            </CardHeader>
            <CardContent>
              {heatmap.error !== null ? (
                <Failed message={heatmap.error} />
              ) : (
                <BreadthHeatmap
                  rows={heatmap.data ?? []}
                  measure={measure}
                  measureLabel={MEASURES.find((one) => one.key === measure)?.label ?? ""}
                  loading={heatmap.loading}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Advance–Decline Trend
              </CardTitle>
              <CardDescription>
                How one-sided each session was: above the rule more companies rose than fell, below
                it more fell than rose. Hover for the counts themselves. The McClellan oscillator
                keeps a band of its own.
              </CardDescription>
            </CardHeader>
            <CardContent role="region" aria-label="Advance–Decline Trend">
              <BreadthChart sessions={breadth.data?.sessions ?? []} loading={breadth.loading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    Sector & Index Breadth
                  </CardTitle>
                  <CardDescription>
                    Every population of one kind, strongest participation first.
                  </CardDescription>
                </div>
                <div className="flex gap-1" role="group" aria-label="Grid population">
                  {GRIDS.map((option) => (
                    <Button
                      key={option.kind}
                      size="sm"
                      variant={option.kind === gridKind ? "secondary" : "ghost"}
                      aria-pressed={option.kind === gridKind}
                      onClick={() => {
                        setGridKind(option.kind === "sector" ? "sector" : "index");
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent role="region" aria-label="Population grid">
              <BreadthGridPanel
                scopes={grid.data?.scopes ?? []}
                comparedWith={grid.data?.compared_with}
                loading={grid.loading}
                onSelect={(scopeKey) => {
                  setScope({ kind: gridKind, key: scopeKey });
                }}
                linkTo={(scopeKey) => populationPath(gridKind, scopeKey)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TableIcon className="h-4 w-4 text-muted-foreground" />
                Daily Breadth
              </CardTitle>
            </CardHeader>
            <CardContent role="region" aria-label="Session history">
              <SessionTable sessions={history} loading={breadth.loading} />
            </CardContent>
          </Card>
        </>
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
      count("instruments", "Counted", (row) => row.instruments),
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
        cell: ({ row }) => formatVolume(toNumber(row.original.advance_decline_line)),
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
    cell: ({ row }) => <span className={className}>{of(row.original)}</span>,
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
  return parsed === null ? ABSENT : `${parsed.toFixed(0)}%`;
}

/** How many sessions the heatmap spans: about ten weeks, as StockEdge's does. */
const HEATMAP_SESSIONS = 50;

/** The averages the heatmap can measure against. */
const MEASURES: readonly { key: BreadthMeasure; label: string }[] = [
  { key: "above_sma_20", label: "20-day" },
  { key: "above_sma_50", label: "50-day" },
  { key: "above_sma_200", label: "200-day" },
];
