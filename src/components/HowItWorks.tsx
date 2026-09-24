/**
 * A strategy's rules, in plain words.
 *
 * What it picks, what makes it sell, when it steps out of the market and
 * how it holds, laid out the same way on the scans page and above the
 * screener, so a rule read in one place is found in the same place in
 * the other.
 */

import type { StrategyRules } from "@/lib/scans";
import { cn } from "@/lib/utils";

interface HowItWorksProps {
  rules: StrategyRules;
  className?: string;
}

/**
 * Render the rules.
 *
 * @param props - The strategy's rules.
 * @returns The rules as a description list; a strategy with no market
 *   switch says so rather than leaving the reader to wonder.
 */
export function HowItWorks({ rules, className }: HowItWorksProps): React.JSX.Element {
  const terms: [string, string][] = [
    ["Picks", rules.pick],
    ["Sells", rules.sell],
    ["Market switch", rules.marketSwitch ?? "None: it never steps out of the market as a whole."],
    ["Holds", rules.holding],
  ];
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      {terms.map(([term, text]) => (
        <div key={term}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {term}
          </dt>
          <dd className="leading-relaxed">{text}</dd>
        </div>
      ))}
    </dl>
  );
}
