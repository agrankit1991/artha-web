/**
 * The full ranking of one mover list, within any population.
 *
 * The overview shows ten of each; this shows the list as deep as the
 * platform keeps it, with the column the overview cannot fit: how many
 * sessions running each instrument has been on the list. Seven lists as
 * tabs, the population in the picker, both kept in the address so a
 * ranking is a link.
 */

import { useCallback, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { MoverListName, MoverRow } from "@/api/client";
import { fetchMoverList, fetchScopes } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { StreakBadge, nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { MOVER_LISTS } from "@/components/MoverPanel";
import { PageHeader } from "@/components/PageHeader";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { type Tab, Tabs } from "@/components/Tabs";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";
import { Card, CardContent } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { formatDay, formatPrice, toNumber } from "@/lib/format";
import { companyPath, moversPath, populationPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** How deep a list is read: as deep as the platform keeps it. */
const DEPTH = 100;

const NAMES = Object.keys(MOVER_LISTS) as MoverListName[];

/**
 * Render the page. Which list and which population are both read from the address.
 *
 * @returns The page.
 */
export function Movers(): React.JSX.Element {
  const navigate = useNavigate();
  const { list = "" } = useParams();
  const [params] = useSearchParams();
  const name = NAMES.find((one) => one === list) ?? null;
  const scope = useMemo<Scope>(() => {
    const kind = params.get("scope_kind");
    const key = params.get("scope_key");
    if ((kind === "index" || kind === "sector") && key !== null) {
      return { kind, key };
    }
    return { kind: kind === "indices" ? "indices" : "companies", key: null };
  }, [params]);

  const loadScopes = useCallback(() => fetchScopes(), []);
  const loadList = useCallback(
    () =>
      name === null ? Promise.resolve(null) : fetchMoverList(name, scope.kind, scope.key, DEPTH),
    [name, scope],
  );
  const scopes = useResource(loadScopes);
  const ranking = useResource(loadList);
  const [layout, setLayout] = useViewMode("movers");

  const go = (nextList: MoverListName, nextScope: Scope): void => {
    void navigate(moversPath(nextList, nextScope.kind, nextScope.key), { replace: true });
  };

  const tabs = useMemo<Tab<MoverListName>[]>(
    () => NAMES.map((one) => ({ key: one, label: MOVER_LISTS[one].title })),
    [],
  );
  const columns = useMemo<Column<MoverRow>[]>(
    () => (name === null ? [] : columnsFor(name)),
    [name],
  );

  if (name === null) {
    return (
      <Empty
        title="No such list"
        reason={`The lists are ${NAMES.map((one) => MOVER_LISTS[one].title.toLowerCase()).join(", ")}.`}
      />
    );
  }

  // A list of indices leads to each index's page; a list of companies to each company's.
  const opens = (row: MoverRow): string =>
    scope.kind === "indices"
      ? populationPath("index", row.instrument_key)
      : companyPath(row.instrument_key, row.symbol);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Movers"
        description="Every list as deep as it is kept, with how many sessions running each instrument has been on it — the column the overview cannot fit."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScopePicker
          scope={scope}
          options={scopes.data}
          onChange={(next) => {
            go(name, next);
          }}
        />
        <ViewModeToggle mode={layout} onChange={setLayout} modes={LAYOUTS} />
      </div>
      <Tabs
        tabs={tabs}
        active={name}
        onChange={(next) => {
          go(next, scope);
        }}
        label="List"
      >
        {ranking.error !== null ? (
          <Failed message={ranking.error} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {MOVER_LISTS[name].title}
              {ranking.data?.as_of != null && ` · ranked on ${formatDay(ranking.data.as_of)}`}
              {ranking.data !== null && ` · ${String(ranking.data.rows.length)} instruments`}
            </p>
            {layout === "cards" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(ranking.data?.rows ?? []).map((row) => (
                  <MoverCard key={row.instrument_key} row={row} list={name} href={opens(row)} />
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                rows={ranking.data?.rows ?? []}
                loading={ranking.loading && ranking.data === null}
                empty="Nothing ranked in this list for this population"
                placeholderRows={12}
                label={MOVER_LISTS[name].title}
                full
                linkTo={opens}
              />
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}

/** The columns, with the ranked figure written the way its list reads. */
function columnsFor(name: MoverListName): Column<MoverRow>[] {
  const list = MOVER_LISTS[name];
  return [
    symbolColumn((row) => row),
    nameColumn(
      (row) => row,
      (row) => row.streak,
    ),
    {
      id: "rank",
      header: "#",
      accessorFn: (row) => row.rank,
      cell: ({ row }) => row.original.rank,
      meta: { align: "right" },
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
      accessorFn: (row) => toNumber(row.change_percent) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => <Delta value={row.original.change_percent} />,
      meta: { align: "right" },
    },
    {
      id: "value",
      header: list.measure,
      accessorFn: (row) => toNumber(row.value) ?? Number.NEGATIVE_INFINITY,
      cell: ({ row }) => list.render(row.original),
      meta: { align: "right" },
    },
  ];
}

/** A ranking reads as one table or as cards; it has no category to group by. */
const LAYOUTS = ["list", "cards"] as const;

/** One ranked instrument as a card: its place, what it is, and the figure it was ranked by. */
function MoverCard({
  row,
  list,
  href,
}: {
  row: MoverRow;
  list: MoverListName;
  href: string;
}): React.JSX.Element {
  const { measure, render, icon: Mark, tint } = MOVER_LISTS[list];
  return (
    <Link to={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs tabular text-muted-foreground">#{row.rank}</span>
                <span className="truncate font-semibold text-primary">{row.symbol}</span>
                <StreakBadge sessions={row.streak} />
              </div>
              <div className="truncate text-xs text-muted-foreground">{row.name}</div>
            </div>
            <Mark aria-hidden="true" className={cn("h-5 w-5 shrink-0", tint)} />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold tabular">{formatPrice(row.close)}</span>
            <Delta value={row.change_percent} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{measure}</span>
            <span className="font-medium text-foreground">{render(row)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
