/**
 * What a company is worth against what it earns, owns and pays.
 *
 * Eight tiles, and every one of them explains itself on hover. A P/E of
 * forty-three is a claim; "price 1,240 over trailing EPS 28.98, standalone
 * profit summed over four named quarters" is a claim the reader can check.
 * Nothing here is stored -- the platform works each figure out from its
 * inputs on read, so none can drift from what it summarises.
 */

import type { CompanyValuation, Derived } from "@/api/client";
import { Empty } from "@/components/Empty";
import { Hint } from "@/components/Hint";
import { StatGrid } from "@/components/StatTile";
import { ABSENT, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";

interface ValuationPanelProps {
  valuation: CompanyValuation | null;
  loading?: boolean;
}

/**
 * Render the panel.
 *
 * @param props - The valuation, when the company has a price to be valued at.
 * @returns The panel.
 */
export function ValuationPanel({
  valuation,
  loading = false,
}: ValuationPanelProps): React.JSX.Element {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (valuation === null) {
    return (
      <Empty
        title="No valuation yet"
        reason="The company has no price on record to be valued against."
      />
    );
  }
  return (
    <div className="space-y-2">
      <StatGrid>
        <Tile label="Market capitalisation" figure={valuation.market_cap} write={crore} />
        <Tile label="Price to earnings" figure={valuation.pe} write={multiple} />
        <Tile label="Price to book" figure={valuation.pb} write={multiple} />
        <Tile label="Dividend yield" figure={valuation.dividend_yield} write={percent} />
        <Tile label="Shares outstanding" figure={valuation.shares_outstanding} write={crore} />
        <Tile label="Trailing earnings" figure={valuation.earnings_ttm} write={crore} />
        <Tile label="Trailing EPS" figure={valuation.eps_ttm} write={rupees} />
        <Tile label="Book value" figure={valuation.book_value} write={crore} />
      </StatGrid>
      <p className="text-xs text-muted-foreground">
        Against the close of {formatDay(valuation.as_of)} ({formatPrice(valuation.price)}). Every
        figure is worked out from the stored price, statements and dividends when the page is read;
        hover the mark by any of them for the arithmetic.
      </p>
    </div>
  );
}

/** One figure, with its derivation a hover away. */
function Tile({
  label,
  figure,
  write,
}: {
  label: string;
  figure: Derived;
  write: (value: string) => string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <Hint text={figure.derivation}>
        <span className="text-xs text-muted-foreground">{label}</span>
      </Hint>
      <div className="mt-0.5 tabular text-lg font-semibold">
        {figure.value === null ? (
          <span className="text-muted-foreground">{ABSENT}</span>
        ) : (
          write(figure.value)
        )}
      </div>
      {figure.value === null && (
        <div className="mt-0.5 text-xs text-muted-foreground">An input is not held</div>
      )}
    </div>
  );
}

/** A sum in crore, written in lakh crore when it is that large. */
function crore(value: string): string {
  const figure = toNumber(value);
  if (figure === null) {
    return ABSENT;
  }
  return figure >= 100_000
    ? `₹${(figure / 100_000).toFixed(2)} lakh cr`
    : `₹${formatPrice(String(figure))} cr`;
}

/** A multiple. */
function multiple(value: string): string {
  return `${formatPrice(value)}×`;
}

/** A percentage, unsigned: a yield is not a change. */
function percent(value: string): string {
  return formatPercent(value).replace(/^\+/, "");
}

/** Rupees per share. */
function rupees(value: string): string {
  return `₹${formatPrice(value)}`;
}
