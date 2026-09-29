/**
 * Where earnings are growing, across the market and by sector.
 *
 * The market's own statement history first -- fifteen years of revenue
 * and profit summed over every company that filed -- then every sector
 * ranked by how its latest year grew, with the share of its companies
 * growing beside the total. A sector at eight per cent with four in ten
 * companies growing is a different investment from one at eight per cent
 * with nine in ten, and only the pair says which.
 */

import { useCallback, useMemo } from "react";

import type { Cadence, SectorEarnings } from "@/api/client";
import { fetchEarnings, fetchSectorEarnings } from "@/api/client";
import { Callout } from "@/components/Callout";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { DivergingBars, type DivergingRow } from "@/components/DivergingBars";
import { CADENCES, EarningsPanel } from "@/components/EarningsPanel";
import { Failed } from "@/components/Failed";
import { GrowingShare, GrowthCell } from "@/components/GrowthCell";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { ENTITIES, MARKS } from "@/lib/entities";
import { formatCount, formatDay, toNumber } from "@/lib/format";
import { populationPath } from "@/lib/paths";

/**
 * The fewest companies reporting in both years for a sector to be ranked
 * in the bars. Growth over three companies swings by tens of per cent on
 * one of them; the table below keeps every sector, with its sample.
 */
const RANKED_FROM = 10;

/** How many sectors each end of the ranking shows. */
const EACH_END = 10;

/**
 * Render the page. The cadence is read from the address, so a quarterly
 * view is a link.
 *
 * @returns The page.
 */
export function EarningsPage(): React.JSX.Element {
  const [chosen, setCadence] = useSearchParam("cadence", "annual");
  const cadence: Cadence = chosen === "quarterly" ? "quarterly" : "annual";
  const loadMarket = useCallback(() => fetchEarnings("companies", "all", cadence), [cadence]);
  const loadSectors = useCallback(() => fetchSectorEarnings(cadence), [cadence]);
  const market = useResource(loadMarket);
  const sectors = useResource(loadSectors);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Earnings"
        description="What listed companies earned, summed period by period, and where the growth is. Every growth figure is taken over the companies present in both periods it compares, and states how many that was."
        actions={
          <Chooser options={CADENCES} chosen={cadence} onChange={setCadence} label="Series" />
        }
      />

      <section className="space-y-3" aria-labelledby="market-heading">
        <SectionHeader
          id="market-heading"
          icon={MARKS.earnings}
          title="The whole market"
          {...(market.data === null
            ? {}
            : {
                description: `${formatCount(market.data.companies)} companies with a profile; those that filed each period are counted.`,
              })}
        />
        {market.error !== null ? (
          <Failed message={market.error} />
        ) : (
          <EarningsPanel earnings={market.data} loading={market.loading} cadence={cadence} />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="sectors-heading">
        <SectionHeader
          id="sectors-heading"
          icon={ENTITIES.sector.icon}
          title="Growth by sector"
          description="Each sector's latest period with a comparison, best revenue growth first. A sector with fewer than three companies reporting in both periods is left out."
        />
        {sectors.error !== null ? (
          <Failed message={sectors.error} />
        ) : (
          <>
            {sectors.data !== null && cadence === "annual" && (
              <SectorRanking sectors={sectors.data} />
            )}
            {sectors.data !== null && cadence === "quarterly" && (
              <QuarterlyCaution sectors={sectors.data} />
            )}
            <SectorTable sectors={sectors.data ?? []} loading={sectors.loading} />
          </>
        )}
      </section>
    </div>
  );
}

/**
 * The sectors growing revenue fastest and slowest in the latest year, as
 * bars either side of nought.
 *
 * Only sectors on the latest year, and with at least `RANKED_FROM`
 * companies in both years: a sector whose last comparison is a year older
 * is not in the same race, and one of three companies is not a sector's
 * growth. Revenue rather than profit, because profit grown from a small
 * base runs to thousands of per cent and would flatten every other bar.
 *
 * @param props - Every sector, as the platform ranks them.
 * @returns The two ends of the ranking, or nothing when none qualifies.
 */
function SectorRanking({ sectors }: { sectors: SectorEarnings[] }): React.JSX.Element | null {
  const latest = sectors.reduce<string | null>(
    (last, one) => (last === null || one.period_end > last ? one.period_end : last),
    null,
  );
  const ranked = sectors
    .flatMap((one): DivergingRow[] => {
      const growth = one.revenue_yoy;
      const value = toNumber(growth?.percent ?? null);
      return one.period_end !== latest ||
        growth === null ||
        value === null ||
        growth.sample < RANKED_FROM
        ? []
        : [{ label: one.sector, value, href: populationPath("sector", one.sector) }];
    })
    .sort((one, other) => other.value - one.value);
  if (ranked.length === 0) {
    return null;
  }
  // Split in two without overlap when there are fewer than two ends' worth.
  const top = Math.min(EACH_END, Math.ceil(ranked.length / 2));
  const bottom = Math.min(EACH_END, ranked.length - top);
  const fastest = ranked.slice(0, top);
  const slowest = ranked.slice(ranked.length - bottom);
  // One scale for both columns, so a bar's length means the same on each.
  const reach = Math.max(...[...fastest, ...slowest].map((row) => Math.abs(row.value)));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue growth, year to {formatDay(latest)}</CardTitle>
        <CardDescription>
          The {formatCount(ranked.length)} sectors with at least {RANKED_FROM} companies reporting
          in both years, fastest and slowest. Every sector is in the table below.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fastest
          </h4>
          <DivergingBars rows={fastest} label="Sectors growing revenue fastest" reach={reach} />
        </div>
        {bottom > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Slowest
            </h4>
            <DivergingBars rows={slowest} label="Sectors growing revenue slowest" reach={reach} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Why quarterly growth by sector is not ranked: it is year on year, and
 * the year-ago quarter is held for only a few companies in each sector.
 *
 * @param props - Every sector, for the range of samples to quote.
 * @returns The note, or nothing when no sector has a comparison.
 */
function QuarterlyCaution({ sectors }: { sectors: SectorEarnings[] }): React.JSX.Element | null {
  const samples = sectors.flatMap((one) =>
    one.revenue_yoy === null ? [] : [one.revenue_yoy.sample],
  );
  if (samples.length === 0) {
    return null;
  }
  const fewest = Math.min(...samples);
  const most = Math.max(...samples);
  return (
    <Callout tone="caution">
      Quarterly growth by sector is year on year, and the provider keeps four quarters per company,
      so each sector&apos;s figure rests on the few companies whose year-ago quarter is held:{" "}
      {fewest === most ? String(fewest) : `${String(fewest)} to ${String(most)}`} here. Rank sectors
      on the annual series.
    </Callout>
  );
}

/** Every sector as a row, leading to its page. */
function SectorTable({
  sectors,
  loading,
}: {
  sectors: SectorEarnings[];
  loading: boolean;
}): React.JSX.Element {
  const columns = useMemo<Column<SectorEarnings>[]>(
    () => [
      {
        id: "sector",
        header: "Sector",
        accessorFn: (row) => row.sector,
        cell: ({ row }) => <span className="font-medium">{row.original.sector}</span>,
      },
      {
        id: "companies",
        header: "Companies",
        accessorFn: (row) => row.companies,
        cell: ({ row }) => formatCount(row.original.companies),
        meta: { align: "right" },
      },
      {
        id: "period_end",
        header: "Latest period",
        accessorFn: (row) => row.period_end,
        cell: ({ row }) => formatDay(row.original.period_end),
      },
      figure("revenue_yoy", "Revenue YoY"),
      figure("profit_yoy", "Profit YoY"),
      {
        id: "growing",
        header: "Growing",
        accessorFn: (row) => toNumber(row.revenue_yoy?.growing ?? null) ?? -1,
        cell: ({ row }) => <GrowingShare figure={row.original.revenue_yoy} />,
        meta: { align: "right" },
      },
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      rows={sectors}
      loading={loading}
      empty="No sector has a comparable period yet"
      placeholderRows={10}
      label="Sectors by earnings growth"
      full
      maxHeight="32rem"
      linkTo={(row) => populationPath("sector", row.sector)}
    />
  );
}

/** A column of one growth figure with its sample; none sorts last. */
function figure(field: "revenue_yoy" | "profit_yoy", header: string): Column<SectorEarnings> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row[field]?.percent ?? null) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <GrowthCell figure={row.original[field]} />,
    meta: { align: "right" },
  };
}
