/**
 * Market breadth, at length.
 *
 * The overview shows one glance at this; a page exists because the
 * question has depth the glance cannot hold. Which population, over which
 * window, and then every session's counts rather than only the latest --
 * because every breadth measure is a shape, and a divergence between the
 * index and its participants is visible over months and invisible in a day.
 */

import { useCallback, useMemo, useState } from "react";

import type { BreadthSession } from "@/api/client";
import { fetchBreadth, fetchBreadthGrid, fetchScopes } from "@/api/client";
import { BreadthGridPanel } from "@/components/BreadthGridPanel";
import { BreadthPanel } from "@/components/BreadthPanel";
import { type Column, DataTable } from "@/components/DataTable";
import { RegimeBanner } from "@/components/RegimeBanner";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { Statistic } from "@/components/Statistic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { readings } from "@/lib/breadthReadings";
import { ABSENT, formatDay, formatVolume, toNumber } from "@/lib/format";

/** The windows a reader switches between, in sessions. */
const WINDOWS: { label: string; sessions: number }[] = [
  { label: "3M", sessions: 65 },
  { label: "6M", sessions: 125 },
  { label: "1Y", sessions: 250 },
  { label: "2Y", sessions: 500 },
  { label: "5Y", sessions: 1250 },
];

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

  const measures = useMemo(() => readings(breadth.data), [breadth.data]);
  // Newest first: a table is read from the top, and the top of this one is
  // the session a reader came to look at.
  const history = useMemo(() => [...(breadth.data?.sessions ?? [])].reverse(), [breadth.data]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">Market breadth</h1>
          <p className="text-sm text-muted-foreground">
            How many instruments took part, rather than how far the index moved.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScopePicker scope={scope} options={scopes.data} onChange={setScope} />
          <div className="flex gap-1" role="group" aria-label="Window">
            {WINDOWS.map((window) => (
              <Button
                key={window.label}
                size="sm"
                variant={window.sessions === sessions ? "secondary" : "ghost"}
                aria-pressed={window.sessions === sessions}
                onClick={() => {
                  setSessions(window.sessions);
                }}
              >
                {window.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {breadth.error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {breadth.error}
        </p>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Where the market is working</CardTitle>
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
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session by session</CardTitle>
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
