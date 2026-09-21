/**
 * Label-and-value rows, for every block that states facts about a thing.
 *
 * An ISIN, a fund house, a face value, a record date: things that are
 * looked up rather than read, so the labels are quiet and the values are
 * not. One component, so the facts about a scheme and the facts about an
 * offering line up the same way.
 */

import { ABSENT } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One fact. */
export interface Fact {
  label: string;
  /** The value, already formatted, or null for one that is not published. */
  value: React.ReactNode;
}

interface FactListProps {
  facts: Fact[];
  /** Two columns on a wide screen, for a block of eight or more. */
  columns?: 1 | 2;
  className?: string;
}

/**
 * Render the facts.
 *
 * @param props - The facts.
 * @returns The list.
 */
export function FactList({ facts, columns = 1, className }: FactListProps): React.JSX.Element {
  return (
    <dl className={cn("grid gap-x-8 gap-y-1.5", columns === 2 && "sm:grid-cols-2", className)}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex items-baseline justify-between gap-3 text-sm">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="tabular text-right font-medium">
            {fact.value === null || fact.value === "" ? (
              <span className="text-muted-foreground">{ABSENT}</span>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
