/**
 * Mutual funds: finding a scheme among tens of thousands of them.
 *
 * AMFI publishes every share class as its own scheme -- the same fund
 * appears as direct and regular, growth and income -- and most of the rest
 * are closed-ended income schemes nobody goes looking for. So this page is
 * a search before it is a list: searched and narrowed at the platform, and
 * paged, because a list of twenty thousand is not a list anybody reads.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Scheme } from "@/api/client";
import { fetchFundFilters, fetchFunds } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { LoadMore } from "@/components/LoadMore";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatDay, formatPrice, toNumber } from "@/lib/format";
import { fundPath } from "@/lib/paths";

/** How many schemes a batch holds. */
const BATCH = 25;

/** What the filters read when nothing is chosen. */
const ANY = "all";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Funds(): React.JSX.Element {
  const [typed, setTyped] = useState("");
  const [category, setCategory] = useState(ANY);
  const [amc, setAmc] = useState(ANY);
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<Scheme[]>([]);
  const text = useDebounced(typed);

  // Any change to what is being asked for starts again at the beginning:
  // keeping what is on screen would leave a reader looking at a list that
  // answers two questions at once.
  useEffect(() => {
    setOffset(0);
  }, [text, category, amc]);

  const loadFunds = useCallback(
    () =>
      fetchFunds({
        text,
        category: category === ANY ? null : category,
        amc: amc === ANY ? null : amc,
        limit: BATCH,
        offset,
      }),
    [text, category, amc, offset],
  );
  const loadFilters = useCallback(() => fetchFundFilters(), []);
  const funds = useResource(loadFunds);
  const filters = useResource(loadFilters);
  const page = funds.data;

  // A batch from the beginning replaces what is on screen; any other is
  // added under it, merged by scheme code so a batch that arrives twice --
  // which React's strict mode makes happen in development -- does not show
  // every scheme twice.
  useEffect(() => {
    if (page === null) {
      return;
    }
    setShown((held) => (page.offset === 0 ? page.items : merge(held, page.items)));
  }, [page]);

  const columns = useMemo<Column<Scheme>[]>(
    () => [
      {
        id: "name",
        header: "Scheme",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.amc ?? "House not published"}
            </div>
          </div>
        ),
      },
      {
        id: "plan",
        header: "Plan",
        accessorFn: (row) => row.plan ?? "",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {[row.original.plan, row.original.option].filter(Boolean).join(" · ") || ABSENT}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessorFn: (row) => row.category ?? "",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.category ?? ABSENT}</span>
        ),
      },
      {
        id: "nav",
        header: "Value",
        accessorFn: (row) => toNumber(row.nav) ?? 0,
        cell: ({ row }) => formatPrice(row.original.nav),
        meta: { align: "right" },
      },
      {
        id: "nav_date",
        header: "As of",
        accessorFn: (row) => row.nav_date ?? "",
        cell: ({ row }) => formatDay(row.original.nav_date),
      },
    ],
    [],
  );

  if (funds.error !== null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {funds.error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Mutual funds</h1>
          <p className="text-sm text-muted-foreground">
            Every scheme AMFI publishes, with its latest value. A direct plan is the same fund
            without the distributor&rsquo;s commission, so the two are listed apart.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
            placeholder="Search by scheme name"
            aria-label="Search schemes"
            className="max-w-sm"
          />
          <Narrow
            label="Fund house"
            all="All fund houses"
            options={filters.data?.fund_houses ?? []}
            chosen={amc}
            onChange={setAmc}
          />
          <Narrow
            label="Category"
            all="All categories"
            options={filters.data?.categories ?? []}
            chosen={category}
            onChange={setCategory}
          />
        </div>
      </header>

      <DataTable
        columns={columns}
        rows={shown}
        loading={funds.loading && shown.length === 0}
        empty="No scheme matches that"
        placeholderRows={8}
        label="Schemes"
        full
        linkTo={(row) => fundPath(row.scheme_code)}
      />

      {page !== null && (
        <LoadMore
          shown={shown.length}
          total={page.total}
          loading={funds.loading}
          noun="schemes"
          onMore={() => {
            setOffset(shown.length);
          }}
        />
      )}
    </div>
  );
}

/** One filter over a long list of published names. */
function Narrow({
  label,
  all,
  options,
  chosen,
  onChange,
}: {
  label: string;
  all: string;
  options: string[];
  chosen: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <Select value={chosen} onValueChange={onChange}>
      <SelectTrigger className="w-[15rem]" aria-label={label}>
        <SelectValue placeholder={all} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{all}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Add a batch under what is already shown, without repeating a scheme.
 *
 * @param held - What is on screen.
 * @param arrived - The batch that arrived.
 * @returns The two, in order, each scheme once.
 */
function merge(held: Scheme[], arrived: Scheme[]): Scheme[] {
  const seen = new Set(held.map((one) => one.scheme_code));
  return [...held, ...arrived.filter((one) => !seen.has(one.scheme_code))];
}
