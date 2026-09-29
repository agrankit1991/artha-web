/**
 * Several instruments side by side.
 *
 * Up to seven companies or indices (as many as the chart palette can tell
 * apart), rebased to the first session they share and drawn on one chart;
 * their trailing returns as bars, a group per period, and as a table; and
 * every other figure the platform holds for them, one column each, so
 * "which of these is the most extended" is read across a row rather than
 * remembered across pages.
 *
 * The set lives in the address, so a comparison is a link: back returns
 * to the last one, a bookmark keeps one, and a company page's Compare
 * button starts one with that company already on it.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { InstrumentOverview, InstrumentSummary, KnownSymbol, ScreenField } from "@/api/client";
import {
  fetchExternalSymbols,
  fetchInstruments,
  fetchOverviews,
  fetchScreenFields,
  fetchSeries,
} from "@/api/client";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { Chip } from "@/components/Chip";
import { type ChartLine, ComparisonChart } from "@/components/ComparisonChart";
import { type Column, DataTable } from "@/components/DataTable";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { RangeSelector } from "@/components/RangeSelector";
import { PRICE_RANGES } from "@/lib/priceRanges";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartRange } from "@/hooks/useChartRange";
import { useResource } from "@/hooks/useResource";
import { MOST_SERIES, coloured } from "@/lib/chartPalette";
import { MARKS } from "@/lib/entities";
import { figureAt, writtenFigure } from "@/lib/figures";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";
import { hitPath } from "@/lib/paths";

/** How many instruments one comparison may hold: what the series endpoint serves at once. */
export const MOST = MOST_SERIES;

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
  // The range is in the address, so a comparison is a link, and remembered
  // as every chart's is, so the next chart opens at it too.
  const [remembered, remember] = useChartRange();
  const sessions = toNumber(params.get("sessions")) ?? remembered;

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
  const loadSymbols = useCallback(
    () =>
      keys.length === 0
        ? Promise.resolve<Record<string, KnownSymbol>>({})
        : fetchExternalSymbols(keys),
    [keys],
  );
  const names = useResource(loadNames);
  const series = useResource(loadSeries);
  const figures = useResource(loadFigures);
  const fields = useResource(loadFields);
  const symbols = useResource(loadSymbols);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare"
        description={`Up to ${String(MOST)} companies or indices side by side: rebased on one chart, their returns by period, and every other figure a column apiece. The set lives in the address, so a comparison is a link.`}
      />
      {names.error !== null && <Failed message={names.error} />}

      <section className="space-y-3" aria-label="Instruments compared">
        <div className="flex flex-wrap items-center gap-2">
          {compared.map((one) => (
            <Chip
              key={one.instrument.instrument_key}
              removeLabel={`Remove ${one.instrument.symbol}`}
              onRemove={() => {
                setKeys(keys.filter((key) => key !== one.instrument.instrument_key));
              }}
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
            </Chip>
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
              icon={MARKS.performance}
              title="Relative strength"
              description="Rebased to the first session they all share, so the lines start together and the gaps are the story."
              actions={
                <RangeSelector
                  ranges={PRICE_RANGES}
                  sessions={sessions}
                  onChange={(next) => {
                    remember(next);
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
              <ComparisonChart
                series={series.data}
                lines={lines}
                symbols={symbols.data ?? {}}
                loading={series.loading}
              />
            )}
          </section>

          <section className="space-y-3" aria-labelledby="returns-heading">
            <SectionHeader
              id="returns-heading"
              icon={MARKS.returns}
              title="Returns"
              description="Each instrument's trailing returns, a group per period and a bar apiece in its colour, then as a table with its latest close."
            />
            {figures.error !== null ? (
              <Failed message={figures.error} />
            ) : (
              <>
                {figures.data !== null && <ReturnsBars rows={compared} />}
                <Returns rows={compared} loading={figures.loading && figures.data === null} />
              </>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="figures-heading">
            <SectionHeader
              id="figures-heading"
              icon={MARKS.figures}
              title="Every other figure"
              description="The platform's figures for each, one column apiece, so a row is read across. Returns, the close and the day's change are above."
            />
            {fields.error !== null ? (
              <Failed message={fields.error} />
            ) : (
              <Figures
                rows={compared}
                fields={(fields.data ?? []).filter(shownInFigures)}
                loading={fields.loading || (figures.loading && figures.data === null)}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** A search box that adds a company or an index not already in the set. */
function Adder({
  excluded,
  onAdd,
}: {
  excluded: string[];
  onAdd: (key: string) => void;
}): React.JSX.Element {
  return (
    <InstrumentPicker
      label="Add a company or index"
      placeholder="Add a company or index…"
      kinds={["company", "index"]}
      excluded={excluded}
      onPick={(hit) => {
        onAdd(hit.key);
      }}
      className="w-72"
    />
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
      {
        id: "from_high",
        header: "From high",
        accessorFn: (row) =>
          toNumber(row.figures?.year_range.from_high_percent ?? null) ?? Number.NEGATIVE_INFINITY,
        // A distance, not a fall.
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {formatPercent(row.original.figures?.year_range.from_high_percent ?? null)}
          </span>
        ),
        meta: { align: "right" },
      },
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
        hitPath({
          kind: row.instrument.kind === "INDEX" ? "index" : "company",
          key: row.instrument.instrument_key,
          label: row.instrument.symbol,
        })
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

/** The periods the returns are drawn over, in the order they are read. */
const PERIODS: { key: keyof InstrumentOverview["returns"]; label: string }[] = [
  { key: "one_week", label: "1W" },
  { key: "one_month", label: "1M" },
  { key: "three_months", label: "3M" },
  { key: "six_months", label: "6M" },
  { key: "one_year", label: "1Y" },
  { key: "year_to_date", label: "YTD" },
];

/**
 * The returns as bars: a group per period, a bar apiece in the
 * instrument's colour, either side of nought.
 *
 * Plain HTML, like the other bar strips here. Each period on its own
 * scale, because a year's returns dwarf a week's and the question is who
 * led within a period, not how a week compares with a year; every figure
 * is printed, so the colour never carries the identity alone.
 */
function ReturnsBars({ rows }: { rows: Compared[] }): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PERIODS.map((period) => {
        const values = rows.map((row) => ({
          row,
          value: toNumber(row.figures?.returns[period.key] ?? null),
        }));
        const reach = Math.max(...values.map((one) => Math.abs(one.value ?? 0)), Number.EPSILON);
        return (
          <Card key={period.key}>
            <CardHeader>
              <CardTitle>{period.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul aria-label={`Returns over ${period.label}`} className="space-y-1.5">
                {values.map(({ row, value }) => (
                  <li
                    key={row.instrument.instrument_key}
                    className="grid grid-cols-[minmax(0,6rem)_1fr_4.5rem] items-center gap-2 text-sm"
                  >
                    <span className="truncate font-medium" title={row.instrument.name}>
                      {row.instrument.symbol}
                    </span>
                    <span aria-hidden="true" className="relative h-2.5 rounded-full bg-muted">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
                      {value !== null && (
                        <span
                          className="absolute inset-y-0 rounded-full"
                          style={{
                            backgroundColor: row.colour,
                            width: `${String((Math.abs(value) / reach) * 50)}%`,
                            ...(value >= 0 ? { left: "50%" } : { right: "50%" }),
                          }}
                        />
                      )}
                    </span>
                    <span className="text-right">
                      <Delta value={row.figures?.returns[period.key] ?? null} />
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Whether a figure belongs in "every other figure": the daily figures,
 * less those drawn above. A comparison holds each instrument's daily
 * figures only; a company's standing would be blank beside an index's.
 */
function shownInFigures(field: ScreenField): boolean {
  const path = field.path.join(".");
  return (
    field.record === "figures" &&
    field.group !== "Returns" &&
    path !== "day.close" &&
    path !== "day.change_percent"
  );
}

/** One figure, read across the instruments. */
interface FigureRow {
  field: ScreenField;
}

/**
 * Every other figure for every instrument, a column apiece: one table per
 * family of figures, on the one `DataTable`.
 *
 * It was a hand-built table, because its rows are figures and its columns
 * instruments; the table does not care which way round the reading goes,
 * and on it the matrix gains the pinned first column, the placeholders
 * while loading and the look every other table has.
 */
function Figures({
  rows,
  fields,
  loading,
}: {
  rows: Compared[];
  fields: ScreenField[];
  loading: boolean;
}): React.JSX.Element {
  const groups = useMemo(() => {
    const byGroup = new Map<string, FigureRow[]>();
    for (const field of fields) {
      byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), { field }]);
    }
    return [...byGroup.entries()];
  }, [fields]);
  const columns = useMemo<Column<FigureRow>[]>(
    () => [
      {
        id: "figure",
        header: "Figure",
        cell: ({ row }) => row.original.field.label,
        enableSorting: false,
      },
      ...rows.map((one): Column<FigureRow> => ({
        id: one.instrument.instrument_key,
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: one.colour }}
            />
            {one.instrument.symbol}
          </span>
        ),
        cell: ({ row }) => (
          <span className="tabular">
            {one.figures === null
              ? ABSENT
              : writtenFigure(row.original.field, figureAt(one.figures, row.original.field.path))}
          </span>
        ),
        enableSorting: false,
        meta: { align: "right" },
      })),
    ],
    [rows],
  );
  if (loading) {
    return (
      <DataTable
        columns={columns}
        rows={[]}
        loading
        empty="Nothing to compare"
        placeholderRows={6}
        label="Figures compared"
      />
    );
  }
  return (
    // Full width, one under another: up to seven instruments across.
    <div className="space-y-4">
      {groups.map(([group, figures]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              rows={figures}
              empty="Nothing to compare"
              label={`${group} compared`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
