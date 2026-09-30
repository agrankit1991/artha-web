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
import { ABSENT, formatCrore, formatDay, formatPercent, formatPrice, toNumber } from "@/lib/format";

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
        <Tile label="Market capitalisation" figure={valuation.market_cap} write={formatCrore} />
        <Tile label="Price to earnings" figure={valuation.pe} write={multiple} />
        <Tile label="Price to book" figure={valuation.pb} write={multiple} />
        <Tile label="Dividend yield" figure={valuation.dividend_yield} write={percent} />
        <Tile label="Shares outstanding" figure={valuation.shares_outstanding} write={shares} />
        <Tile label="Trailing earnings" figure={valuation.earnings_ttm} write={formatCrore} />
        <Tile label="Trailing EPS" figure={valuation.eps_ttm} write={rupees} />
        <Tile label="Book value" figure={valuation.book_value} write={formatCrore} />
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
      <Hint term={label} text={figure.derivation}>
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

/** A count of shares in crore: a number of shares, not rupees. */
function shares(value: string): string {
  return `${formatPrice(value)} cr shares`;
}

/** A multiple. */
function multiple(value: string): string {
  // One decimal, as every multiple on the site is written.
  const figure = toNumber(value);
  return figure === null ? ABSENT : `${figure.toFixed(1)}×`;
}

/** A percentage, unsigned: a yield is not a change. */
function percent(value: string): string {
  return formatPercent(value).replace(/^\+/, "");
}

/** Rupees per share. */
function rupees(value: string): string {
  return `₹${formatPrice(value)}`;
}
