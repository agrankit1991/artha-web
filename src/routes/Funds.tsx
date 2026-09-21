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
import { Delta } from "@/components/Delta";
import { Hint } from "@/components/Hint";
import { LoadMore } from "@/components/LoadMore";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounced } from "@/hooks/useDebounced";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
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
        cell: ({ row }) => <PlanBadge scheme={row.original} />,
      },
      {
        id: "category",
        header: "Category",
        accessorFn: (row) => row.category ?? "",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {shortCategory(row.original.category)}
          </span>
        ),
      },
      {
        id: "nav",
        header: "NAV",
        accessorFn: (row) => toNumber(row.nav) ?? 0,
        cell: ({ row }) => (
          <div className="leading-tight">
            <div>{formatPrice(row.original.nav)}</div>
            <div className="text-xs text-muted-foreground">{formatDay(row.original.nav_date)}</div>
          </div>
        ),
        meta: { align: "right" },
      },
      window("one_month", "1M"),
      window("three_months", "3M"),
      window("one_year", "1Y"),
      window("three_years", "3Y p.a."),
      window("five_years", "5Y p.a."),
    ],
    [],
  );

  if (funds.error !== null) {
    return <Failed message={funds.error} />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <PageHeader
          kind="fund"
          title="Mutual Funds"
          description="Every scheme AMFI publishes, with its latest value. A direct plan is the same fund without the distributor's commission, so the two are listed apart."
        />
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

/**
 * A column of returns over one window, coloured by direction.
 *
 * @param field - Which window.
 * @param header - What to call it.
 * @returns The column. A window a scheme has no history for sorts last
 *   rather than as nought, where a nought would place a fund launched last
 *   year among the flat ones.
 */
function window(field: keyof Scheme["returns"], header: string): Column<Scheme> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row.returns[field]) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) =>
      row.original.returns[field] === null ? (
        <span className="text-muted-foreground">{ABSENT}</span>
      ) : (
        <Delta value={row.original.returns[field]} />
      ),
    meta: { align: "right" },
  };
}

/**
 * The plan and the option as badges, with the plan explained.
 *
 * A direct plan is the same fund without the distributor's commission, so
 * the two differ by roughly a percent a year compounded, and a reader
 * comparing the two rows should know that the gap is the fee and not the
 * fund.
 */
function PlanBadge({ scheme }: { scheme: Scheme }): React.JSX.Element {
  if (scheme.plan === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  const direct = scheme.plan.toLowerCase().includes("direct");
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Hint
        text={
          direct
            ? "Bought from the fund house directly, with no distributor's commission. The same fund as the regular plan, roughly a percent a year cheaper, compounded."
            : "Bought through a distributor, whose commission comes out of the fund each year. The direct plan of the same fund is roughly a percent a year cheaper."
        }
      >
        <Badge variant={direct ? "secondary" : "outline"}>{direct ? "Direct" : "Regular"}</Badge>
      </Hint>
      {scheme.option !== null && (
        <span className="text-xs text-muted-foreground">{shortOption(scheme.option)}</span>
      )}
    </span>
  );
}

/**
 * AMFI's category label, shorn of its wrapper.
 *
 * "Open Ended Schemes(Equity Scheme - Large Cap Fund)" is "Large Cap Fund"
 * to anybody reading a table; the wrapper is the same on nine schemes in
 * ten and says nothing about this one.
 *
 * @param category - The label as published.
 * @returns The part that distinguishes it, or a dash.
 */
export function shortCategory(category: string | null): string {
  if (category === null) {
    return ABSENT;
  }
  const inner = /\(([^)]*)\)/.exec(category)?.[1] ?? category;
  return inner
    .slice(inner.lastIndexOf(" - ") + 1)
    .replace(/^- /, "")
    .trim();
}

/** "Growth Option" is "Growth" in a table. */
function shortOption(option: string): string {
  return option.replace(/\s*option\s*$/i, "").trim();
}
