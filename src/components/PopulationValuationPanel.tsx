/**
 * What a population is worth, and which members moved the money today.
 *
 * Three readings of one valuation. The tiles say what the typical member
 * trades at -- the median multiple, every company counting once, losses
 * left out -- and how much the whole population is worth. The two lists
 * say which members moved the most rupees today: capitalisation times the
 * day's move, which is what a weighted index felt from each. It is a proxy
 * for contribution and says so: a real index weights by free float, which
 * is not published here. The spread says how the moves were distributed,
 * because "the index rose one per cent" hides whether every company rose
 * one per cent or two giants rose five while the rest fell.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { MemberValuation, PopulationValuation } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { Hint } from "@/components/Hint";
import { StatGrid, StatTile } from "@/components/StatTile";
import { ABSENT, formatPrice, formatWhole, toNumber } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface PopulationValuationPanelProps {
  valuation: PopulationValuation | null;
  loading?: boolean;
}

/** How many members each list of movers names. */
const NAMED = 5;

/** The buckets today's moves are counted into, in per cent. */
export const BUCKETS: { from: number; to: number; label: string }[] = [
  { from: Number.NEGATIVE_INFINITY, to: -5, label: "< −5%" },
  { from: -5, to: -2, label: "−5 to −2%" },
  { from: -2, to: 0, label: "−2 to 0%" },
  { from: 0, to: 0, label: "0%" },
  { from: 0, to: 2, label: "0 to 2%" },
  { from: 2, to: 5, label: "2 to 5%" },
  { from: 5, to: Number.POSITIVE_INFINITY, label: "> 5%" },
];

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

      <Movers members={valuation.members} />

      <Spread members={valuation.members} />

      <p className="text-xs text-muted-foreground">
        Every company is valued by the same rule as its own page: price over trailing earnings,
        market capitalisation over book, with the share count from the latest standalone year and
        any bonus or split since. The medians count every company once and leave losses out. Money
        moved is capitalisation times today&rsquo;s move — a proxy for what a weighted index felt,
        since real index weights are by free float, which is not published here.
      </p>
    </div>
  );
}

/** The five that moved the most money each way. */
function Movers({ members }: { members: MemberValuation[] }): React.JSX.Element {
  const weighed = useMemo(
    () =>
      members
        .flatMap((one) => {
          const moved = toNumber(one.moved);
          return moved === null ? [] : [{ member: one, moved }];
        })
        .sort((a, b) => b.moved - a.moved),
    [members],
  );
  if (weighed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No company here has both a share count and a move today, so nothing can be weighed.
      </p>
    );
  }
  const added = weighed.filter((one) => one.moved > 0).slice(0, NAMED);
  const taken = weighed
    .filter((one) => one.moved < 0)
    .slice(-NAMED)
    .reverse();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoverList title="Added the most" tone="gain" rows={added} />
      <MoverList title="Took away the most" tone="loss" rows={taken} />
    </div>
  );
}

/** One list of movers, weighed. */
function MoverList({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "gain" | "loss";
  rows: { member: MemberValuation; moved: number }[];
}): React.JSX.Element {
  const widest = Math.max(...rows.map((one) => Math.abs(one.moved)), 1);
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1 text-sm font-semibold">
        {title}
        <Hint text="By the rupees its market capitalisation gained or lost today, in crore. What a weighted index felt from it, not how far its own price moved." />
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">None today.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map(({ member, moved }) => (
            <li key={member.instrument_key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  to={companyPath(member.instrument_key, member.symbol)}
                  className="min-w-0 truncate font-medium hover:text-primary hover:underline"
                >
                  {member.symbol}
                </Link>
                <span className="flex shrink-0 items-baseline gap-2 tabular">
                  <Delta value={member.change_percent} />
                  <span
                    className={cn("font-semibold", tone === "gain" ? "text-gain" : "text-loss")}
                  >
                    {crore(String(moved))}
                  </span>
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", tone === "gain" ? "bg-gain" : "bg-loss")}
                  style={{ width: `${String((Math.abs(moved) / widest) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * How today's moves were distributed, as a row of bars.
 *
 * Inline SVG rather than the chart library, as the sparklines are: bars
 * with no axes are a few rectangles, and every bar is labelled beneath and
 * for a screen reader.
 */
function Spread({ members }: { members: MemberValuation[] }): React.JSX.Element {
  const counts = useMemo(() => bucketed(members), [members]);
  const total = counts.reduce((sum, one) => sum + one, 0);
  if (total === 0) {
    return <></>;
  }
  const tallest = Math.max(...counts);
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1 text-sm font-semibold">
        Spread of today&rsquo;s moves
        <Hint text="How many companies moved by how much. A rise carried by everybody is a wide right-hand side; one carried by a few giants is a tall middle and a long thin tail." />
      </h4>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${String(BUCKETS.length)}, minmax(0, 1fr))` }}
        role="img"
        aria-label={BUCKETS.map((bucket, at) => `${bucket.label}: ${String(counts[at] ?? 0)}`).join(
          ", ",
        )}
      >
        {BUCKETS.map((bucket, at) => {
          const count = counts[at] ?? 0;
          const share = count / tallest;
          const tone =
            bucket.to <= 0 && bucket.from < 0
              ? "bg-loss"
              : bucket.from >= 0 && bucket.to > 0
                ? "bg-gain"
                : "bg-muted-foreground/50";
          return (
            <div key={bucket.label} className="flex flex-col items-center gap-1">
              <span className="text-xs tabular text-muted-foreground">{count}</span>
              <div className="flex h-16 w-full items-end">
                <div
                  className={cn("w-full rounded-t", tone)}
                  style={{ height: `${String(Math.max(share * 100, count > 0 ? 4 : 0))}%` }}
                />
              </div>
              <span className="text-[0.65rem] text-muted-foreground">{bucket.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Count the members into the buckets.
 *
 * @param members - The members; one without a move is not counted.
 * @returns A count per bucket, in the buckets' order.
 */
export function bucketed(members: MemberValuation[]): number[] {
  const counts = BUCKETS.map(() => 0);
  for (const member of members) {
    const change = toNumber(member.change_percent);
    if (change === null) {
      continue;
    }
    const at =
      change === 0
        ? BUCKETS.findIndex((bucket) => bucket.from === 0 && bucket.to === 0)
        : BUCKETS.findIndex(
            (bucket) =>
              !(bucket.from === 0 && bucket.to === 0) &&
              (change > 0
                ? change > bucket.from && change <= bucket.to
                : change >= bucket.from && change < bucket.to),
          );
    counts[at] = (counts[at] ?? 0) + 1;
  }
  return counts;
}

/** A multiple, or a dash. */
function multiple(value: string | null): string {
  return value === null ? ABSENT : `${formatPrice(value)}×`;
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
