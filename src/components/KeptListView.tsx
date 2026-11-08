/**
 * A list the platform keeps, as the watchlist page shows it: an index's or a
 * sector's companies, the indices of a category, a mover ranking, a
 * strategy's picks today.
 *
 * Read live, so it is always today's; read-only, because the platform keeps
 * it -- saving a copy (`ListActions`) gives the reader one to annotate. Each
 * row carries the same latest figures a watchlist does, and the count of the
 * reader's lists holding it. An index that holds companies opens into them,
 * with the way back above the table: "Indices -> Sectoral -> Nifty Bank" is
 * drilled into rather than nested (WATCHLIST-PLAN.md section 2).
 */

import { ArrowLeft, FolderOpen } from "lucide-react";
import { useCallback, useMemo } from "react";

import type { KeptListPage, KeptSource, ListedInstrument, MoverListName } from "@/api/client";
import { fetchKeptList } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { ListActions } from "@/components/ListActions";
import { MOVER_LISTS } from "@/components/MoverPanel";
import { MoverUniverseSwitch } from "@/components/MoverUniverseSwitch";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Resource, useResource } from "@/hooks/useResource";
import { formatCount, formatDay, formatPrice, formatVolume, toNumber } from "@/lib/format";
import { categoryLabel } from "@/lib/indices";
import type { KeptChoice } from "@/lib/keptLists";
import { companyPath, populationPath } from "@/lib/paths";
import { usePreferences, writePreferences } from "@/lib/preferences";

const MOVER_NAMES = Object.keys(MOVER_LISTS) as MoverListName[];

/**
 * What a kept list is called: its own name where the data has one, else the
 * page's words for a ranking or a category, which live with the movers and
 * the indices rather than on the platform.
 *
 * @param source - The list.
 * @param name - The name the platform gave it, or null.
 * @returns The title.
 */
export function keptTitle(source: KeptSource, name: string | null): string {
  if (name !== null) {
    return name;
  }
  if (source.kind === "indices") {
    return `${categoryLabel(source.key)} indices`;
  }
  if (source.kind === "screen") {
    return "Screener matches";
  }
  const mover = MOVER_NAMES.find((one) => one === source.key);
  return mover === undefined ? source.key : MOVER_LISTS[mover].title;
}

/** What each kind of list is, in a line under its title. */
const DESCRIPTIONS: Record<KeptSource["kind"], string> = {
  index: "Its companies today, by symbol.",
  sector: "Its companies, by symbol.",
  indices: "Open one to see the companies it holds.",
  movers:
    "The whole market's top twenty-five on the latest session. The Movers page ranks within any index or sector.",
  strategy: "Its picks on its latest backtest, by rank: Held is what it holds today.",
  screen: "The screener's matches today, in its order.",
};

interface KeptListViewProps {
  choice: KeptChoice;
  /** Show another kept list, opened from this one. */
  onOpen: (source: KeptSource, from: KeptSource) => void;
  /** Go back to the list this one was opened from. */
  onBack: (source: KeptSource) => void;
}

/**
 * Render the list.
 *
 * @param props - Which list, and the ways in and back out.
 * @returns The list's title, controls and table.
 */
export function KeptListView({ choice, onOpen, onBack }: KeptListViewProps): React.JSX.Element {
  const { source, from } = choice;
  const { movers: universe } = usePreferences();
  const load = useCallback(
    () => fetchKeptList(source.kind === "movers" ? { ...source, universe } : source),
    [source, universe],
  );
  const page = useResource(load);
  const rows = page.data?.rows ?? [];
  const title = keptTitle(source, page.data?.name ?? null);
  const asOf = rows.find((one) => one.as_of !== null)?.as_of ?? null;

  return (
    <div className="space-y-3">
      {from !== null && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onBack(from);
          }}
        >
          <ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4" />
          {keptTitle(from, null)}
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {DESCRIPTIONS[source.kind]}
            {asOf !== null && <> Figures as of {formatDay(asOf)}.</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {source.kind === "movers" && (
            <MoverUniverseSwitch
              universe={universe}
              onChange={(next) => {
                writePreferences({ movers: next });
              }}
            />
          )}
          <ListActions
            keys={rows.map((one) => one.instrument_key)}
            label={title}
            source={source.kind === "movers" ? { ...source, universe } : source}
          />
        </div>
      </div>
      <KeptListTable source={source} page={page} label={title} onOpen={onOpen} />
    </div>
  );
}

interface KeptListTableProps {
  source: KeptSource;
  /** Its rows, read by the caller, which also needs them for its own controls. */
  page: Resource<KeptListPage | null>;
  /** What the table is called, for a reader who cannot see the heading. */
  label: string;
  /** Show another kept list, opened from this one. */
  onOpen: (source: KeptSource, from: KeptSource) => void;
}

/**
 * A kept list's rows: the table under a kept list's own heading, and under a
 * reader's list kept updated from one, which is the same list under their name.
 *
 * @param props - The list, its rows, and the way into an index on it.
 * @returns The table, or why it could not be read.
 */
export function KeptListTable({
  source,
  page,
  label,
  onOpen,
}: KeptListTableProps): React.JSX.Element {
  const rows = useMemo(() => page.data?.rows ?? [], [page.data]);
  const ranked = rows.some((one) => one.rank !== null);
  const columns = useMemo(() => columnsFor(source, ranked, onOpen), [source, ranked, onOpen]);
  if (page.error !== null) {
    return <Failed message={page.error} />;
  }
  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={page.loading && page.data === null}
      empty={source.kind === "strategy" ? "It picks nothing today." : "Nothing on this list"}
      placeholderRows={6}
      label={label}
      full
      linkTo={(row) =>
        row.is_index
          ? populationPath("index", row.instrument_key)
          : companyPath(row.instrument_key, row.symbol)
      }
    />
  );
}

/**
 * The columns for a kind of list: always who and how it is doing; a rank
 * where the list ranks, whether held for a strategy, and for indices how
 * many companies each holds, with the way into them.
 */
function columnsFor(
  source: KeptSource,
  ranked: boolean,
  onOpen: (source: KeptSource, from: KeptSource) => void,
): Column<ListedInstrument>[] {
  const identity = (
    row: ListedInstrument,
  ): {
    symbol: string;
    name: string;
    instrument_key: string;
  } => ({ symbol: row.symbol, name: row.name, instrument_key: row.instrument_key });
  const columns: Column<ListedInstrument>[] = [symbolColumn(identity), nameColumn(identity)];
  if (ranked) {
    columns.push({
      id: "rank",
      header: "Rank",
      accessorFn: (row) => row.rank ?? Number.POSITIVE_INFINITY,
      cell: ({ row }) => <span className="tabular">{formatCount(row.original.rank)}</span>,
      meta: { align: "right" },
    });
  }
  if (source.kind === "strategy") {
    columns.push({
      id: "held",
      header: "Held",
      accessorFn: (row) => (row.held ? 1 : 0),
      cell: ({ row }) => (row.original.held ? <Badge variant="secondary">Held</Badge> : null),
    });
  }
  columns.push(
    {
      id: "close",
      header: "Price",
      accessorFn: (row) => toNumber(row.close) ?? 0,
      cell: ({ row }) => formatPrice(row.original.close),
      meta: { align: "right" },
    },
    change("change", "Today", (row) => row.change_percent),
    change("one_month", "1M", (row) => row.one_month),
    change("one_year", "1Y", (row) => row.one_year),
    {
      id: "volume",
      header: "Volume",
      accessorFn: (row) => row.volume ?? 0,
      cell: ({ row }) => formatVolume(row.original.volume),
      meta: { align: "right" },
    },
  );
  if (source.kind === "indices") {
    columns.push({
      id: "constituents",
      header: "Companies",
      accessorFn: (row) => row.constituents ?? 0,
      cell: ({ row }) => {
        const held = row.original.constituents ?? 0;
        if (held === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Open ${row.original.symbol}'s ${String(held)} companies`}
            onClick={(event) => {
              // The row is a link to the index's page; this opens it here instead.
              event.preventDefault();
              event.stopPropagation();
              onOpen({ kind: "index", key: row.original.instrument_key }, source);
            }}
          >
            <FolderOpen aria-hidden="true" className="mr-1 h-4 w-4" />
            {formatCount(held)}
          </Button>
        );
      },
      meta: { align: "right" },
    });
  }
  return columns;
}

/** A percentage column, coloured by its sign. */
function change(
  id: string,
  header: string,
  of: (row: ListedInstrument) => string | null,
): Column<ListedInstrument> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}
