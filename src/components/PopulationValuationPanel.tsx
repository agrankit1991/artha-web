/**
 * What a population is worth.
 *
 * The tiles say what the typical member trades at -- the median multiple,
 * every company counting once, losses left out -- and how much the whole
 * population is worth. Which members moved the index, and how the day's
 * moves were spread, are the members' part of the page (`LeadingTheMove`,
 * `MoveSpread`): the rupees each member moved were a third telling of the
 * contribution the page already gave twice, in the same order.
 */

import type { PopulationValuation } from "@/api/client";
import { Empty } from "@/components/Empty";
import { StatGrid, StatTile } from "@/components/StatTile";
import { ABSENT, formatWhole, toNumber } from "@/lib/format";

interface PopulationValuationPanelProps {
  valuation: PopulationValuation | null;
  loading?: boolean;
}

/**
 * Render the panel.
 *
 * @param props - The valuation, once it has arrived.
 * @returns The panel.
 */
export function PopulationValuationPanel({
  valuation,
  loading = false,
}: PopulationValuationPanelProps): React.JSX.Element {
  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (valuation === null || valuation.companies === 0) {
    return (
      <Empty
        title="Nothing to value yet"
        reason="None of these companies has a price on record to be valued against."
      />
    );
  }
  return (
    <div className="space-y-5">
      <StatGrid>
        <StatTile
          label="Median price to earnings"
          value={multiple(valuation.pe_median)}
          hint={`Over the ${String(valuation.valued)} of ${String(valuation.companies)} companies with a positive multiple`}
        />
        <StatTile label="Median price to book" value={multiple(valuation.pb_median)} />
        <StatTile
          label="Market capitalisation"
          value={crore(valuation.market_cap)}
          hint="Summed over the companies whose share count is held"
        />
        <StatTile
          label="Valued"
          value={`${String(valuation.valued)} of ${String(valuation.companies)}`}
          hint="Companies with earnings to value against"
        />
      </StatGrid>

      <p className="text-xs text-muted-foreground">
        Every company is valued by the same rule as its own page: price over trailing earnings,
        market capitalisation over book, with the share count from the latest standalone year and
        any bonus or split since. The medians count every company once and leave losses out.
      </p>
    </div>
  );
}

/** A multiple to one decimal, as every other multiple here is written, or a dash. */
function multiple(value: string | null): string {
  const figure = toNumber(value);
  return figure === null ? ABSENT : `${figure.toFixed(1)}×`;
}

/** A sum in crore, written in lakh crore when it is that large. */
function crore(value: string | null): string {
  const figure = toNumber(value);
  if (figure === null) {
    return ABSENT;
  }
  const size = Math.abs(figure);
  return size >= 100_000
    ? `₹${(figure / 100_000).toFixed(2)} lakh cr`
    : `₹${formatWhole(figure)} cr`;
}
