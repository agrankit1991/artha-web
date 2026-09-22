/**
 * Several instruments side by side.
 *
 * Up to eight companies or indices, rebased to the first session they
 * share and drawn on one chart; their trailing returns as a table; and
 * every figure the platform holds for them as a matrix, one column each,
 * so "which of these is the most extended" is read across a row rather
 * than remembered across pages.
 *
 * The set lives in the address, so a comparison is a link: back returns
 * to the last one, a bookmark keeps one, and a company page's Compare
 * button starts one with that company already on it.
 */

import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { InstrumentOverview, InstrumentSummary, ScreenField, SearchHit } from "@/api/client";
import {
  fetchInstruments,
  fetchOverviews,
  fetchScreenFields,
  fetchSearch,
  fetchSeries,
} from "@/api/client";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { PRICE_RANGES, RangeSelector } from "@/components/RangeSelector";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { coloured } from "@/lib/chartPalette";
import { readPreferences } from "@/lib/preferences";
import { ENTITIES } from "@/lib/entities";
import { figureAt, writtenFigure } from "@/lib/figures";
import { formatDay, formatPrice, toNumber } from "@/lib/format";
import { hitPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** How many instruments one comparison may hold: what the series endpoint serves at once. */
export const MOST = 8;

/** What one row of the returns table is about. */
interface Compared {
  instrument: InstrumentSummary;
  colour: string;
  figures: InstrumentOverview | null;
}

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Compare(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const keys = useMemo(() => [...new Set(params.getAll("keys"))].slice(0, MOST), [params]);
  const sessions = toNumber(params.get("sessions")) ?? readPreferences().range;

  const loadNames = useCallback(
    () => (keys.length === 0 ? Promise.resolve([]) : fetchInstruments(keys)),
    [keys],
  );
  const loadSeries = useCallback(
    () => (keys.length === 0 ? Promise.resolve(null) : fetchSeries(keys, sessions)),
    [keys, sessions],
  );
  const loadFigures = useCallback(
    () => (keys.length === 0 ? Promise.resolve([]) : fetchOverviews(keys)),
    [keys],
  );
  const loadFields = useCallback(() => fetchScreenFields(), []);
  const names = useResource(loadNames);
  const series = useResource(loadSeries);
  const figures = useResource(loadFigures);
  const fields = useResource(loadFields);

  const update = (change: (next: URLSearchParams) => void): void => {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace: true });
  };
  const setKeys = (next: string[]): void => {
    update((query) => {
      query.delete("keys");
      for (const key of next) {
        query.append("keys", key);
      }
    });
  };

  // Each instrument keeps one colour across the chart, the chips and the
  // tables, in the order the address names them.
  const compared = useMemo<Compared[]>(() => {
    const named = new Map((names.data ?? []).map((one) => [one.instrument_key, one]));
    const found = new Map((figures.data ?? []).map((one) => [one.instrument_key, one]));
    return coloured(
      keys.flatMap((key) => {
        const instrument = named.get(key);
        return instrument === undefined ? [] : [{ instrument, figures: found.get(key) ?? null }];
      }),
    );
  }, [keys, names.data, figures.data]);
  const lines = useMemo<ChartLine[]>(
    () =>
      compared.map((one) => ({
        instrumentKey: one.instrument.instrument_key,
        label: one.instrument.symbol,
        colour: one.colour,
      })),
    [compared],
  );

  if (names.error !== null) {
    return <Failed message={names.error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare"
        description={`Up to ${String(MOST)} companies or indices side by side: rebased on one chart, their returns as a table, every figure as a matrix. The set lives in the address, so a comparison is a link.`}
      />

      <section className="space-y-3" aria-label="Instruments compared">
        <div className="flex flex-wrap items-center gap-2">
          {compared.map((one) => (
            <span
              key={one.instrument.instrument_key}
              className="inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-sm"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: one.colour }}
              />
              <span className="font-medium">{one.instrument.symbol}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {one.instrument.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${one.instrument.symbol}`}
                className="h-6 w-6 rounded-full p-0"
                onClick={() => {
                  setKeys(keys.filter((key) => key !== one.instrument.instrument_key));
                }}
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </Button>
            </span>
          ))}
          {keys.length < MOST ? (
            <Adder
              excluded={keys}
              onAdd={(key) => {
                setKeys([...keys, key]);
              }}
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              {String(MOST)} is the most one chart can carry; remove one to add another.
            </span>
          )}
        </div>
      </section>

      {keys.length === 0 ? (
        <Empty
          title="Nothing to compare yet"
          reason="Add a company or an index above, or press Compare on any company's page."
        />
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="chart-heading">
            <SectionHeader
              id="chart-heading"
              icon={ENTITIES.index.icon}
              title="Relative Performance"
              description="Rebased to the first session they all share, so the lines start together and the gaps are the story."
              actions={
                <RangeSelector
                  ranges={PRICE_RANGES}
                  sessions={sessions}
                  onChange={(next) => {
                    update((query) => {
                      query.set("sessions", String(next));
                    });
                  }}
                />
              }
            />
            {series.error !== null ? (
              <Failed message={series.error} />
            ) : (
              <ComparisonChart series={series.data} lines={lines} loading={series.loading} />
            )}
          </section>

          <section className="space-y-3" aria-labelledby="returns-heading">
            <SectionHeader
              id="returns-heading"
              icon={ENTITIES.company.icon}
              title="Returns"
              description="Each instrument's latest close and its trailing returns."
            />
            {figures.error !== null ? (
              <Failed message={figures.error} />
            ) : (
              <Returns rows={compared} loading={figures.loading && figures.data === null} />
            )}
          </section>

          <section className="space-y-3" aria-labelledby="figures-heading">
            <SectionHeader
              id="figures-heading"
              icon={ENTITIES.index.icon}
              title="Every Figure"
              description="The platform's figures for each, one column apiece, so a row is read across."
            />
            {fields.error !== null ? (
              <Failed message={fields.error} />
            ) : (
              <Matrix rows={compared} fields={fields.data ?? []} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** A search box that adds a company or an index. */
function Adder({
  excluded,
  onAdd,
}: {
  excluded: string[];
  onAdd: (key: string) => void;
}): React.JSX.Element {
  const [typed, setTyped] = useState("");
  const query = useDebounced(typed.trim());
  const load = useCallback(
    () => (query.length < 2 ? Promise.resolve<SearchHit[]>([]) : fetchSearch(query)),
    [query],
  );
  const found = useResource(load);
  const hits = (found.data ?? []).filter(
    (hit) => (hit.kind === "company" || hit.kind === "index") && !excluded.includes(hit.key),
  );
  return (
    <div className="relative">
      <Input
        type="search"
        aria-label="Add a company or index"
        placeholder="Add a company or index…"
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
        className="w-64"
      />
      {query.length >= 2 && (
        <ul
          className="absolute left-0 top-full z-40 mt-1 max-h-72 w-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          aria-label="Matches"
        >
          {hits.length === 0 && !found.loading && (
            <li className="px-2 py-2 text-center text-sm text-muted-foreground">
              Nothing called &ldquo;{query}&rdquo;
            </li>
          )}
          {hits.map((hit) => {
            const Mark = ENTITIES[hit.kind].icon;
            return (
              <li key={`${hit.kind}:${hit.key}`}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(hit.key);
                    setTyped("");
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Mark aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.label}</span>
                    {hit.detail !== null && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.detail}
                      </span>
                    )}
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    {ENTITIES[hit.kind].label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Each instrument's close and trailing returns, a row apiece. */
function Returns({ rows, loading }: { rows: Compared[]; loading: boolean }): React.JSX.Element {
  const columns = useMemo<Column<Compared>[]>(
    () => [
      symbolColumn((row) => row.instrument, {
        header: "Instrument",
        lead: (row) => (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.colour }}
          />
        ),
      }),
      nameColumn((row) => row.instrument),
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.figures?.day.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.figures?.day.close),
        meta: { align: "right" },
      },
      change("change", "Change", (row) => row.figures?.day.change_percent ?? null),
      change("one_week", "1W", (row) => row.figures?.returns.one_week ?? null),
      change("one_month", "1M", (row) => row.figures?.returns.one_month ?? null),
      change("three_months", "3M", (row) => row.figures?.returns.three_months ?? null),
      change("six_months", "6M", (row) => row.figures?.returns.six_months ?? null),
      change("one_year", "1Y", (row) => row.figures?.returns.one_year ?? null),
      change("year_to_date", "YTD", (row) => row.figures?.returns.year_to_date ?? null),
      change("from_high", "From high", (row) => row.figures?.year_range.from_high_percent ?? null),
      {
        id: "as_of",
        header: "As of",
        accessorFn: (row) => row.figures?.as_of ?? "",
        cell: ({ row }) => formatDay(row.original.figures?.as_of),
      },
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      empty="Nothing to compare"
      placeholderRows={3}
      label="Returns compared"
      full
      linkTo={(row) =>
        hitPath(
          row.instrument.kind === "INDEX" ? "index" : "company",
          row.instrument.instrument_key,
        )
      }
    />
  );
}

/** A percentage column, coloured by its sign. */
function change(
  id: string,
  header: string,
  of: (row: Compared) => string | null,
): Column<Compared> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}

/**
 * Every figure for every instrument, a column apiece.
 *
 * A matrix rather than a list -- the rows are figures and the columns
 * instruments, which is the transpose of what `DataTable` is for -- so a
 * plain table, styled to match, with the first column pinned as the
 * others scroll.
 */
function Matrix({ rows, fields }: { rows: Compared[]; fields: ScreenField[] }): React.JSX.Element {
  const groups = useMemo(() => {
    const byGroup = new Map<string, ScreenField[]>();
    for (const field of fields) {
      byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), field]);
    }
    return [...byGroup.entries()];
  }, [fields]);
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm" aria-label="Figures compared">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium">
              Figure
            </th>
            {rows.map((one) => (
              <th
                key={one.instrument.instrument_key}
                scope="col"
                className="px-3 py-2 text-right font-medium"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: one.colour }}
                  />
                  {one.instrument.symbol}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([group, members]) => (
            <GroupRows key={group} group={group} fields={members} rows={rows} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One family of figures: a heading row, then a row per figure. */
function GroupRows({
  group,
  fields,
  rows,
}: {
  group: string;
  fields: ScreenField[];
  rows: Compared[];
}): React.JSX.Element {
  return (
    <>
      <tr className="border-t bg-muted/30">
        <th
          scope="rowgroup"
          colSpan={rows.length + 1}
          className="sticky left-0 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {group}
        </th>
      </tr>
      {fields.map((field) => (
        <tr key={field.name} className="border-t">
          <th scope="row" className="sticky left-0 bg-card px-3 py-1.5 text-left font-normal">
            {field.label}
          </th>
          {rows.map((one) => (
            <td
              key={one.instrument.instrument_key}
              className={cn("px-3 py-1.5 text-right tabular")}
            >
              {one.figures === null ? "—" : writtenFigure(field, figureAt(one.figures, field.path))}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
