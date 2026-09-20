/**
 * Choosing a population, with the important ones already on the page.
 *
 * The selector holds several hundred indices and sectors, which is the
 * right home for the long tail and the wrong one for the handful a reader
 * actually switches between. Those few sit as buttons beside it, in a fixed
 * order, so the common move is one click rather than one click and a scroll.
 *
 * Only populations the platform reports as ranked are offered -- India VIX
 * is a headline index with no constituents, so it is a card on the overview
 * and never a filter here.
 */

import type { ScopeOptions } from "@/api/client";
import { type Scope, ScopeSelector } from "@/components/ScopeSelector";
import { Button } from "@/components/ui/button";
import { FEATURED_INDICES } from "@/lib/indices";

interface ScopePickerProps {
  scope: Scope;
  options: ScopeOptions | null;
  onChange: (scope: Scope) => void;
}

/** The two whole-market populations, which are always available. */
const WHOLE: { label: string; scope: Scope }[] = [
  { label: "Companies", scope: { kind: "companies", key: null } },
  { label: "Indices", scope: { kind: "indices", key: null } },
];

/** Whether two scopes name the same population. */
function same(one: Scope, other: Scope): boolean {
  return one.kind === other.kind && one.key === other.key;
}

/**
 * Offer the pinned populations as buttons and the rest through the selector.
 *
 * @param props - The current scope, what is on offer, and what to call.
 * @returns The picker.
 */
export function ScopePicker({ scope, options, onChange }: ScopePickerProps): React.JSX.Element {
  const ranked = new Set((options?.indices ?? []).map((option) => option.key));
  const pinned = FEATURED_INDICES.filter((index) => ranked.has(index.key)).map((index) => ({
    label: index.name,
    scope: { kind: "index" as const, key: index.key },
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Pinned populations">
        {[...WHOLE, ...pinned].map((item) => (
          <Button
            key={`${item.scope.kind}:${item.scope.key ?? ""}`}
            size="sm"
            variant={same(item.scope, scope) ? "secondary" : "ghost"}
            aria-pressed={same(item.scope, scope)}
            onClick={() => {
              onChange(item.scope);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <ScopeSelector scope={scope} options={options} onChange={onChange} />
    </div>
  );
}
