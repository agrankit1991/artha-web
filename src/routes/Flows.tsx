/**
 * What foreign and domestic institutions bought and sold.
 *
 * StockEdge's FII/DII page, which Indian market readers open daily: the
 * cash market's net buying for each side beside the Nifty's close, so a
 * run of foreign selling can be read against what the index did; and
 * foreign positioning in index and stock derivatives. Figures are rupees
 * crore, written once in each column's heading.
 */

import { useCallback, useMemo, useState } from "react";

import {
  type FlowPeriod,
  type FlowSegment,
  type InstitutionalFlow,
  type InstrumentOverview,
  fetchFlows,
  fetchOverviewHistory,
} from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { FlowBars } from "@/components/FlowBars";
import { PageHeader } from "@/components/PageHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { type Tab, Tabs } from "@/components/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { ABSENT, formatDay, formatPrice, formatSignedPrice, toNumber } from "@/lib/format";
import { BENCHMARK } from "@/lib/indices";

/** How many sessions or months a page of flows reads. */
const SESSIONS = 60;

/** How many sessions the "last few" totals sum over. */
const RECENT = 5;

const PERIODS: { key: FlowPeriod; label: string }[] = [
  { key: "DAY", label: "Daily" },
  { key: "MONTH", label: "Monthly" },
];

type View = "cash" | "derivatives";

const VIEWS: Tab<View>[] = [
  { key: "cash", label: "Cash market" },
  { key: "derivatives", label: "FII derivatives" },
];

const SEGMENTS: { key: Exclude<FlowSegment, "CASH">; label: string }[] = [
  { key: "INDEX_FUTURES", label: "Index futures" },
  { key: "STOCK_FUTURES", label: "Stock futures" },
  { key: "INDEX_OPTIONS", label: "Index options" },
  { key: "STOCK_OPTIONS", label: "Stock options" },
];

/** One session of the cash market: both sides, and the benchmark beside them. */
interface CashDay {
  day: string;
  fii: InstitutionalFlow | undefined;
  dii: InstitutionalFlow | undefined;
  benchmark: InstrumentOverview | undefined;
}

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Flows(): React.JSX.Element {
  const [period, setPeriod] = useState<FlowPeriod>("DAY");
  const [view, setView] = useState<View>("cash");
  const [segment, setSegment] = useState<Exclude<FlowSegment, "CASH">>("INDEX_FUTURES");

  const load = useCallback(() => fetchFlows(period, SESSIONS), [period]);
  const flows = useResource(load);
  const loadBenchmark = useCallback(() => fetchOverviewHistory(BENCHMARK.key, SESSIONS), []);
  const benchmark = useResource(loadBenchmark);

  const cash = useMemo((): CashDay[] => {
    const rows = flows.data ?? [];
    const closes = new Map((benchmark.data ?? []).map((one) => [one.as_of, one]));
    const days = [...new Set(rows.map((one) => one.day))].sort().reverse();
    return days.map((day) => ({
      day,
      fii: rows.find(
        (one) => one.day === day && one.participant === "FII" && one.segment === "CASH",
      ),
      dii: rows.find(
        (one) => one.day === day && one.participant === "DII" && one.segment === "CASH",
      ),
      // A month's row is dated its first day; the index is only matched to sessions.
      benchmark: period === "DAY" ? closes.get(day) : undefined,
    }));
  }, [flows.data, benchmark.data, period]);

  const derivatives = useMemo(
    () => (flows.data ?? []).filter((one) => one.participant === "FII" && one.segment === segment),
    [flows.data, segment],
  );

  if (flows.error !== null) {
    return <Failed message={flows.error} />;
  }

  const latest = cash[0];
  const recent = cash.slice(0, RECENT);
  const unit = period === "DAY" ? "session" : "month";

  return (
    <div className="space-y-6">
      <PageHeader
        title="FII / DII Activity"
        description="What foreign and domestic institutions bought and sold, in rupees crore, as the exchange reports it after each session. Foreign derivatives positioning is on its own tab."
        actions={<Chooser options={PERIODS} chosen={period} onChange={setPeriod} label="Period" />}
      />

      <StatGrid>
        <StatTile
          label={`FII net, latest ${unit}`}
          value={<Delta value={latest?.fii?.net_amount} format={crore} arrow={false} />}
          {...(latest === undefined ? {} : { hint: formatDay(latest.day) })}
        />
        <StatTile
          label={`DII net, latest ${unit}`}
          value={<Delta value={latest?.dii?.net_amount} format={crore} arrow={false} />}
          {...(latest === undefined ? {} : { hint: formatDay(latest.day) })}
        />
        <StatTile
          label={`FII net, last ${String(recent.length)} ${unit}s`}
          value={<Delta value={total(recent.map((one) => one.fii))} format={crore} arrow={false} />}
        />
        <StatTile
          label={`DII net, last ${String(recent.length)} ${unit}s`}
          value={<Delta value={total(recent.map((one) => one.dii))} format={crore} arrow={false} />}
        />
      </StatGrid>

      <Tabs tabs={VIEWS} active={view} onChange={setView} label="Market">
        {view === "cash" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Net buying, oldest to latest</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(["fii", "dii"] as const).map((side) => (
                  <div key={side} className="space-y-1">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      {side === "fii" ? "Foreign (FII/FPI)" : "Domestic (DII)"}
                    </div>
                    <FlowBars
                      label={`${side.toUpperCase()} net buying by ${unit}`}
                      bars={[...cash].reverse().map((one) => ({
                        day: one.day,
                        net: one[side]?.net_amount ?? null,
                        title: `${formatDay(one.day)}: ${crore(one[side]?.net_amount)} Cr`,
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <DataTable
              columns={cashColumns(period)}
              rows={cash}
              loading={flows.loading}
              empty="No flows recorded yet"
              placeholderRows={10}
              label="Cash market flows"
              full
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Chooser options={SEGMENTS} chosen={segment} onChange={setSegment} label="Segment" />
            <DataTable
              columns={DERIVATIVE_COLUMNS}
              rows={derivatives}
              loading={flows.loading}
              empty="No derivatives flows recorded yet"
              placeholderRows={10}
              label="FII derivatives flows"
              full
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}

/** A net figure in crore, signed. */
function crore(value: string | null | undefined): string {
  return formatSignedPrice(value);
}

/** The sum of some flows' net figures, or null when none is known. */
function total(flows: (InstitutionalFlow | undefined)[]): string | null {
  const known = flows.flatMap((one) => {
    const value = toNumber(one?.net_amount);
    return value === null ? [] : [value];
  });
  return known.length === 0 ? null : known.reduce((sum, one) => sum + one, 0).toFixed(2);
}

/** A column of rupees crore, bought or sold. */
function amount<Row>(
  id: string,
  header: string,
  of: (row: Row) => string | null | undefined,
): Column<Row> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => formatPrice(of(row.original)),
    meta: { align: "right" },
  };
}

/** A net column: signed, and coloured by which way the money went. */
function net<Row>(
  id: string,
  header: string,
  of: (row: Row) => string | null | undefined,
): Column<Row> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} format={crore} arrow={false} />,
    meta: { align: "right" },
  };
}

/** The cash market's columns; the benchmark only beside sessions, not months. */
function cashColumns(period: FlowPeriod): Column<CashDay>[] {
  return [
    {
      id: "day",
      header: period === "DAY" ? "Session" : "Month",
      accessorFn: (row) => row.day,
      cell: ({ row }) => <span className="font-medium">{formatDay(row.original.day)}</span>,
    },
    amount("fii_buy", "FII buy ₹ Cr", (row) => row.fii?.buy_amount),
    amount("fii_sell", "FII sell ₹ Cr", (row) => row.fii?.sell_amount),
    net("fii_net", "FII net ₹ Cr", (row) => row.fii?.net_amount),
    amount("dii_buy", "DII buy ₹ Cr", (row) => row.dii?.buy_amount),
    amount("dii_sell", "DII sell ₹ Cr", (row) => row.dii?.sell_amount),
    net("dii_net", "DII net ₹ Cr", (row) => row.dii?.net_amount),
    ...(period === "DAY"
      ? [
          amount<CashDay>("benchmark", BENCHMARK.name, (row) => row.benchmark?.day.close),
          {
            id: "benchmark_change",
            header: `${BENCHMARK.name} %`,
            accessorFn: (row: CashDay) =>
              toNumber(row.benchmark?.day.change_percent) ?? Number.NEGATIVE_INFINITY,
            cell: ({ row }: { row: { original: CashDay } }) => (
              <Delta value={row.original.benchmark?.day.change_percent} />
            ),
            meta: { align: "right" as const },
          },
        ]
      : []),
  ];
}

/** Share of contracts held long, of all held long or short. */
function longShare(row: InstitutionalFlow): string | null {
  const long = row.long_contracts;
  const short = row.short_contracts;
  if (long === null || short === null || long + short === 0) {
    return null;
  }
  return ((long / (long + short)) * 100).toFixed(2);
}

const DERIVATIVE_COLUMNS: Column<InstitutionalFlow>[] = [
  {
    id: "day",
    header: "Date",
    accessorFn: (row) => row.day,
    cell: ({ row }) => <span className="font-medium">{formatDay(row.original.day)}</span>,
  },
  amount("buy", "Buy ₹ Cr", (row) => row.buy_amount),
  amount("sell", "Sell ₹ Cr", (row) => row.sell_amount),
  net("net", "Net ₹ Cr", (row) => row.net_amount),
  count("long", "Long", (row) => row.long_contracts),
  count("short", "Short", (row) => row.short_contracts),
  {
    id: "long_share",
    header: "Long %",
    accessorFn: (row) => toNumber(longShare(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const share = longShare(row.original);
      return share === null ? ABSENT : `${share}%`;
    },
    meta: { align: "right" },
  },
  count("oi", "Open interest", (row) => row.oi_contracts),
  amount("oi_amount", "OI ₹ Cr", (row) => row.oi_amount),
];

/** A column of contracts, grouped the Indian way. */
function count(
  id: string,
  header: string,
  of: (row: InstitutionalFlow) => number | null,
): Column<InstitutionalFlow> {
  return {
    id,
    header,
    accessorFn: (row) => of(row) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const value = of(row.original);
      return value === null ? ABSENT : value.toLocaleString("en-IN");
    },
    meta: { align: "right" },
  };
}
