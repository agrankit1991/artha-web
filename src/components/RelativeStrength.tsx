/**
 * How something is doing against the things it should be read by.
 *
 * A return on its own says almost nothing. Four per cent over a month is a
 * strong month if the market rose one and a poor one if it rose eight, so
 * the gap is what this shows -- with the raw return above it, because a
 * reader still wants to know whether the thing itself went up.
 *
 * Both readings matter and they can disagree: falling less than the market
 * is ahead, and that is most of what relative strength is for.
 */

import type { Comparison, Performance, TrailingReturns } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ABSENT, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The windows shown, in the order they are read. */
const WINDOWS: { of: (returns: TrailingReturns) => string | null; label: string }[] = [
  { of: (returns) => returns.one_week, label: "1W" },
  { of: (returns) => returns.one_month, label: "1M" },
  { of: (returns) => returns.three_months, label: "3M" },
  { of: (returns) => returns.six_months, label: "6M" },
  { of: (returns) => returns.one_year, label: "1Y" },
];

interface RelativeStrengthProps {
  performance: Performance | null;
  /** What the population is called, for the first row. */
  name: string;
  loading?: boolean;
}

/**
 * Show the returns and the gaps.
 *
 * @param props - The performance, and what to call the subject.
 * @returns The panel.
 */
export function RelativeStrength({
  performance,
  name,
  loading = false,
}: RelativeStrengthProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relative strength</CardTitle>
        <CardDescription>
          {performance === null
            ? loading
              ? "Working it out…"
              : "Nothing to compare yet"
            : performance.basis === "members"
              ? "The median company in it, against the market and the size bands. Gaps are in percentage points."
              : "Against the market and the size bands. Gaps are in percentage points."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {performance === null ? (
          loading ? (
            <Skeleton className="h-28 w-full" />
          ) : null
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Returns against benchmarks">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-1.5 text-left font-medium">Against</th>
                  {WINDOWS.map((window) => (
                    <th key={window.label} className="py-1.5 text-right font-medium">
                      {window.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">{name}</td>
                  {WINDOWS.map((window) => (
                    <td key={window.label} className="py-2 text-right">
                      <Delta value={window.of(performance.returns)} />
                    </td>
                  ))}
                </tr>
                {performance.against.map((comparison) => (
                  <Row key={comparison.instrument_key} comparison={comparison} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** One benchmark: what it did, and how far ahead of it the subject was. */
function Row({ comparison }: { comparison: Comparison }): React.JSX.Element {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2">
        <div className="text-muted-foreground">{comparison.label}</div>
        <div className="text-xs text-muted-foreground/70">{comparison.role}</div>
      </td>
      {WINDOWS.map((window) => {
        const gap = toNumber(window.of(comparison.relative));
        return (
          <td key={window.label} className="py-2 text-right">
            <div
              className={cn(
                "tabular font-medium",
                gap === null
                  ? "text-muted-foreground"
                  : gap > 0
                    ? "text-gain"
                    : gap < 0
                      ? "text-loss"
                      : "text-muted-foreground",
              )}
            >
              {gap === null ? ABSENT : `${gap > 0 ? "+" : ""}${gap.toFixed(1)}`}
            </div>
            {/* The benchmark's own return underneath, so a gap can be read
                against what produced it: three points ahead of a market
                that fell eight is a different month from three ahead of
                one that rose eight. */}
            <div className="text-xs text-muted-foreground/70">
              <Delta value={window.of(comparison.returns)} className="text-xs" />
            </div>
          </td>
        );
      })}
    </tr>
  );
}
