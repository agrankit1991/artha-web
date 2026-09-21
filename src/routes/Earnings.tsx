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

import { useCallback, useMemo, useState } from "react";

import type { Cadence, SectorEarnings } from "@/api/client";
import { fetchEarnings, fetchSectorEarnings } from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { EarningsPanel } from "@/components/EarningsPanel";
import { Failed } from "@/components/Failed";
import { Hint } from "@/components/Hint";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { useResource } from "@/hooks/useResource";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatDay, toNumber } from "@/lib/format";
import { populationPath } from "@/lib/paths";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function EarningsPage(): React.JSX.Element {
  const [cadence, setCadence] = useState<Cadence>("annual");
  const loadMarket = useCallback(() => fetchEarnings("companies", "all", cadence), [cadence]);
  const loadSectors = useCallback(() => fetchSectorEarnings(cadence), [cadence]);
  const market = useResource(loadMarket);
  const sectors = useResource(loadSectors);

  if (market.error !== null) {
    return <Failed message={market.error} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Earnings"
        description="What listed companies earned, summed period by period, and where the growth is. Every figure is taken over the companies present in both periods it compares, and states how many that was."
      />

      <section className="space-y-3" aria-labelledby="market-heading">
        <SectionHeader
          id="market-heading"
          icon={MARKS.earnings}
          title="The Whole Market"
          {...(market.data === null
            ? {}
            : {
                description: `${String(market.data.companies)} companies with a profile; those that filed each period are counted.`,
              })}
        />
        <EarningsPanel
          earnings={market.data}
          loading={market.loading}
          cadence={cadence}
          onCadence={setCadence}
        />
      </section>

      <section className="space-y-3" aria-labelledby="sectors-heading">
        <SectionHeader
          id="sectors-heading"
          icon={ENTITIES.sector.icon}
          title="Growth by Sector"
          description="Each sector's latest period with a comparison, best revenue growth first. A sector with fewer than three companies reporting in both periods is left out."
        />
        {sectors.error !== null ? (
          <Failed message={sectors.error} />
        ) : (
          <SectorTable sectors={sectors.data ?? []} loading={sectors.loading} />
        )}
      </section>
    </div>
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
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.sector}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.companies} {row.original.companies === 1 ? "company" : "companies"}
            </div>
          </div>
        ),
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
        cell: ({ row }) => {
          const value = toNumber(row.original.revenue_yoy?.growing ?? null);
          return value === null ? (
            ABSENT
          ) : (
            <span className={value >= 50 ? "text-gain" : "text-loss"}>{value.toFixed(0)}%</span>
          );
        },
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
      linkTo={(row) => populationPath("sector", row.sector)}
    />
  );
}

/** A column of one growth figure with its sample. */
function figure(field: "revenue_yoy" | "profit_yoy", header: string): Column<SectorEarnings> {
  return {
    id: field,
    header,
    accessorFn: (row) => toNumber(row[field]?.percent ?? null) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const found = row.original[field];
      if (found === null) {
        return <span className="text-muted-foreground">{ABSENT}</span>;
      }
      return (
        <span className="inline-flex flex-col items-end leading-tight">
          {found.percent === null ? (
            <Hint text="The earlier total was nought or a loss; growth from a loss is not a percentage anybody means.">
              <span className="text-muted-foreground">n/a</span>
            </Hint>
          ) : (
            <Delta value={found.percent} />
          )}
          <span className="text-[0.65rem] text-muted-foreground">n = {found.sample}</span>
        </span>
      );
    },
    meta: { align: "right" },
  };
}
