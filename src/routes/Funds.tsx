/**
 * Mutual funds: finding a fund among tens of thousands of schemes.
 *
 * AMFI publishes every share class as its own scheme -- the same fund
 * appears as direct and regular, growth and income -- and more than half
 * stopped publishing long ago. So the page opens on the funds still
 * publishing, one plan each (the direct plan with growth, the fund without
 * a distributor's commission and with its income kept in), best over three
 * years first; either choice can be widened. Above the list, the groups a
 * buyer picks by, each with its middle fund's returns, narrow it with a
 * press, and a chosen group's leaders are drawn. The search, the filters,
 * the group and the order are kept in the address, so Back from a scheme
 * returns to the list it was chosen from.
 */

import type { ColumnSort } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FundGroup, FundSort, Scheme } from "@/api/client";
import { fetchFundFilters, fetchFundGroups, fetchFunds } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { DivergingBars } from "@/components/DivergingBars";
import { Failed } from "@/components/Failed";
import { FundGroupTiles } from "@/components/FundGroupTiles";
import { HeatCell } from "@/components/HeatCell";
import { LoadMore } from "@/components/LoadMore";
import { PageHeader } from "@/components/PageHeader";
import { SchemePlan } from "@/components/SchemePlan";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounced } from "@/hooks/useDebounced";
import { useHeatPalette } from "@/hooks/useHeatPalette";
import { useResource } from "@/hooks/useResource";
import { useSearchParam, useSearchParamsWriter } from "@/hooks/useSearchParam";
import { useSortParams } from "@/hooks/useSortParams";
import { MARKS } from "@/lib/entities";
import { formatCount, formatDay, formatPrice, toNumber } from "@/lib/format";
import { FUND_GROUPS, isFundGroup, shortCategory } from "@/lib/funds";
import { HEAT_REACH, type HeatPalette } from "@/lib/heatColour";
import { fundPath } from "@/lib/paths";

/** How many schemes a batch holds. */
const BATCH = 25;

/** What the filters read when nothing is chosen. */
const ANY = "all";

/** How many of a chosen group's funds are drawn as bars. */
const LEADERS = 10;

/**
 * The order the list opens in: best over three years, a long enough run to
 * say something about a fund and short enough for most to have one.
 */
const BEST_OVER_THREE_YEARS: ColumnSort = { id: "three_years", desc: true };

/** One plan per fund, or every plan AMFI lists. */
const PLANS = [
  { key: "one", label: "One per fund" },
  { key: "all", label: "Every plan" },
] as const;

/** The schemes still publishing, or the closed ones too. */
const SCHEMES = [
  { key: "live", label: "Live" },
  { key: "closed", label: "Closed too" },
] as const;

/** How far each return column's figure saturates its tint. */
const REACH: Record<keyof Scheme["returns"], number> = {
  one_month: HEAT_REACH.one_month,
  three_months: HEAT_REACH.three_months,
  one_year: HEAT_REACH.one_year,
  three_years: HEAT_REACH.yearly_rate,
  five_years: HEAT_REACH.yearly_rate,
};

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Funds(): React.JSX.Element {
  const [typed, setTyped] = useSearchParam("q");
  const [category] = useSearchParam("category", ANY);
  const [amc, setAmc] = useSearchParam("house", ANY);
  const [named] = useSearchParam("group");
  const [plans, setPlans] = useSearchParam("plans", "one");
  const [schemes, setSchemes] = useSearchParam("schemes", "live");
  const write = useSearchParamsWriter();
  const group = isFundGroup(named) ? named : null;
  const onePerFund = plans === "one";
  const live = schemes === "live";
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<Scheme[]>([]);
  // Sorted by the platform across every scheme, not here across the few
  // loaded: "which fund returned most" is a question about all of them,
  // and a page of them cannot answer it.
  const [sorting, setSorting] = useSortParams(BEST_OVER_THREE_YEARS);
  const palette = useHeatPalette();
  const text = useDebounced(typed);
  const order = sorting[0];
  // Column ids are the platform's sort names; only sortable columns can set one.
  const sort = order === undefined ? null : (order.id as FundSort);
  const descending = order?.desc === true;

  // Any change to what is being asked for starts again at the beginning:
  // keeping what is on screen would leave a reader looking at a list that
  // answers two questions at once. A new order is a new question too.
  useEffect(() => {
    setOffset(0);
  }, [text, category, amc, group, onePerFund, live, sort, descending]);

  const narrowing = useMemo(
    () => ({
      text,
      category: category === ANY ? null : category,
      group,
      amc: amc === ANY ? null : amc,
      live,
      onePerFund,
    }),
    [text, category, group, amc, live, onePerFund],
  );
  const loadFunds = useCallback(
    () => fetchFunds({ ...narrowing, sort, descending, limit: BATCH, offset }),
    [narrowing, sort, descending, offset],
  );
  const loadLeaders = useCallback(
    () =>
      group === null
        ? Promise.resolve(null)
        : fetchFunds({
            ...narrowing,
            sort: "three_years",
            descending: true,
            limit: LEADERS,
            offset: 0,
          }),
    [narrowing, group],
  );
  const loadGroups = useCallback(() => fetchFundGroups(live, onePerFund), [live, onePerFund]);
  const loadFilters = useCallback(() => fetchFundFilters(), []);
  const funds = useResource(loadFunds);
  const leaders = useResource(loadLeaders);
  const groups = useResource(loadGroups);
  const filters = useResource(loadFilters);
  const page = funds.data;
  const noun = onePerFund ? "funds" : "schemes";

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

  const columns = useMemo(() => fundColumns(palette, onePerFund), [palette, onePerFund]);

  // A group and a category are two ways of narrowing to a kind of fund, so
  // choosing one clears the other, in one change of the address.
  const chooseGroup = (chosen: FundGroup | null): void => {
    write({ group: chosen, category: null });
  };
  const chooseCategory = (chosen: string): void => {
    write({ category: chosen === ANY ? null : chosen, group: null });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <PageHeader
          kind="fund"
          title="Mutual Funds"
          count={page === null ? undefined : `${formatCount(page.total)} ${noun}`}
          description={`${live ? "The schemes still publishing" : "Every scheme AMFI publishes, closed ones too"}, ${onePerFund ? "one plan per fund: the direct plan with growth, which is the fund without a distributor's commission and with its income kept in" : "every plan and option listed apart"}. Returns over three and five years are yearly rates.`}
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
            onChange={chooseCategory}
          />
          <Chooser
            options={PLANS}
            chosen={onePerFund ? "one" : "all"}
            onChange={setPlans}
            label="Plans"
          />
          <Chooser
            options={SCHEMES}
            chosen={live ? "live" : "closed"}
            onChange={setSchemes}
            label="Schemes"
          />
        </div>
      </header>

      <section className="space-y-3" aria-labelledby="groups-heading">
        <SectionHeader
          id="groups-heading"
          icon={MARKS.kinds}
          title="By kind of fund"
          description="Each group's middle fund over a year and three. Choose one to list only its funds, and again to list every fund."
        />
        {groups.error !== null ? (
          <Failed message={groups.error} />
        ) : (
          <FundGroupTiles standings={groups.data} chosen={group} onChoose={chooseGroup} />
        )}
      </section>

      {group !== null && (
        <section className="space-y-3" aria-labelledby="leaders-heading">
          <SectionHeader
            id="leaders-heading"
            icon={MARKS.returns}
            title={`${FUND_GROUPS[group]}: best over three years`}
            description={`The ${String(LEADERS)} ${noun} in the group that returned most a year, on average, over three years.`}
          />
          <Card>
            <CardContent className="pt-6">
              {leaders.error !== null ? (
                <Failed message={leaders.error} />
              ) : (
                <DivergingBars
                  label={`${FUND_GROUPS[group]} ${noun}, best over three years`}
                  rows={(leaders.data?.items ?? []).flatMap((one) => {
                    const rate = toNumber(one.returns.three_years);
                    return rate === null
                      ? []
                      : [{ label: one.name, value: rate, href: fundPath(one.scheme_code) }];
                  })}
                />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* The search stays above a failure, so a reader can change what failed. */}
      {funds.error !== null ? (
        <Failed message={funds.error} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={shown}
            loading={funds.loading && shown.length === 0}
            empty="No scheme matches that"
            placeholderRows={8}
            label="Schemes"
            full
            linkTo={(row) => fundPath(row.scheme_code)}
            serverSorting={{ sorting, onSortingChange: setSorting }}
          />
          {page !== null && (
            <LoadMore
              shown={shown.length}
              total={page.total}
              loading={funds.loading}
              noun={noun}
              onMore={() => {
                setOffset(shown.length);
              }}
            />
          )}
        </>
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
 * The list's columns, its returns tinted as the heatmap tints a move.
 *
 * @param palette - The heat colours, read once by the page.
 * @param onePerFund - Whether each fund is listed once, when its plan goes
 *   without saying (the page says it) and the column would repeat it.
 * @returns The columns.
 */
function fundColumns(palette: HeatPalette | null, onePerFund: boolean): Column<Scheme>[] {
  const plan: Column<Scheme> = {
    id: "plan",
    header: "Plan",
    enableSorting: false,
    cell: ({ row }) => <SchemePlan scheme={row.original} />,
  };
  return [
    {
      id: "name",
      header: "Scheme",
      accessorKey: "name",
      // Bounded, so one long name does not push the three-year column the
      // list is ordered by off the screen.
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[20rem]" title={row.original.name}>
          <div className="truncate font-medium">{row.original.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {row.original.amc ?? "House not published"}
          </div>
        </div>
      ),
    },
    ...(onePerFund ? [] : [plan]),
    {
      id: "category",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {shortCategory(row.original.category)}
        </span>
      ),
    },
    {
      id: "nav",
      header: "NAV",
      sortDescFirst: true,
      // Sorted by the platform; the key only makes the column sortable.
      accessorKey: "nav",
      cell: ({ row }) => (
        <div className="leading-tight">
          <div>{formatPrice(row.original.nav)}</div>
          <div className="text-xs text-muted-foreground">{formatDay(row.original.nav_date)}</div>
        </div>
      ),
      meta: { align: "right" },
    },
    returnsColumn("one_month", "1M", palette),
    returnsColumn("three_months", "3M", palette),
    returnsColumn("one_year", "1Y", palette),
    returnsColumn("three_years", "3Y p.a.", palette),
    returnsColumn("five_years", "5Y p.a.", palette),
  ];
}

/**
 * A column of returns over one window, tinted by how far it moved.
 *
 * @param field - Which window.
 * @param header - What to call it.
 * @param palette - The heat colours.
 * @returns The column. A window a scheme has no history for sorts last
 *   rather than as nought, where a nought would place a fund launched last
 *   year among the flat ones.
 */
function returnsColumn(
  field: keyof Scheme["returns"],
  header: string,
  palette: HeatPalette | null,
): Column<Scheme> {
  return {
    id: field,
    header,
    // Largest first on the first click: the question is almost always
    // "which returned most".
    sortDescFirst: true,
    // Sorted by the platform; the key only makes the column sortable.
    accessorKey: `returns.${field}`,
    cell: ({ row }) => (
      <HeatCell value={row.original.returns[field]} reach={REACH[field]} palette={palette} />
    ),
    meta: { align: "right" },
  };
}
