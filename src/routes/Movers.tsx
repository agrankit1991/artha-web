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
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { MoverListName, MoverRow } from "@/api/client";
import { fetchMoverList, fetchScopes } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { MOVER_LISTS } from "@/components/MoverPanel";
import { PageHeader } from "@/components/PageHeader";
import { ScopePicker } from "@/components/ScopePicker";
import type { Scope } from "@/components/ScopeSelector";
import { type Tab, Tabs } from "@/components/Tabs";
import { useResource } from "@/hooks/useResource";
import { formatDay, formatPrice, toNumber } from "@/lib/format";
import { companyPath, moversPath } from "@/lib/paths";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Movers"
        description="Every list as deep as it is kept, with how many sessions running each instrument has been on it — the column the overview cannot fit."
      />
      <ScopePicker
        scope={scope}
        options={scopes.data}
        onChange={(next) => {
          go(name, next);
        }}
      />
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
            <DataTable
              columns={columns}
              rows={ranking.data?.rows ?? []}
              loading={ranking.loading && ranking.data === null}
              empty="Nothing ranked in this list for this population"
              placeholderRows={12}
              label={MOVER_LISTS[name].title}
              full
              linkTo={(row) => companyPath(row.instrument_key)}
            />
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
