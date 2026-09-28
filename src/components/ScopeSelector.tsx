/**
 * Choosing which population the lists are ranked within.
 *
 * The market as a whole, the indices against each other, one sector, or one
 * index's constituents. One selector, used by every screen that shows a
 * ranking, so "scope" means the same thing everywhere.
 */

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScopeKind, ScopeOptions } from "@/api/client";

/** A chosen population: what kind, and which one when the kind names one. */
export interface Scope {
  kind: ScopeKind;
  key: string | null;
}

interface ScopeSelectorProps {
  /** The population chosen, or null to show the placeholder and offer a pick. */
  scope: Scope | null;
  options: ScopeOptions | null;
  onChange: (scope: Scope) => void;
  /** What the selector is for, for a reader who cannot see it. */
  label?: string;
  placeholder?: string;
  /** Populations not to offer, such as the ones already chosen. */
  excluded?: readonly Scope[];
}

/** The two populations that are the whole of something, and what they are called. */
export const WHOLE_POPULATIONS: { value: string; label: string; scope: Scope }[] = [
  { value: "companies", label: "All companies", scope: { kind: "companies", key: null } },
  { value: "indices", label: "All indices", scope: { kind: "indices", key: null } },
];

/**
 * Whether two scopes name the same population.
 *
 * @param one - A scope.
 * @param other - Another.
 * @returns True when kind and key both match.
 */
export function sameScope(one: Scope, other: Scope): boolean {
  return one.kind === other.kind && one.key === other.key;
}

/** The single string that identifies a scope to the underlying select. */
function valueOf(scope: Scope): string {
  return scope.key === null ? scope.kind : `${scope.kind}:${scope.key}`;
}

/**
 * Offer every population that has lists.
 *
 * Only ones that do: the platform reports which sectors and indices were
 * actually ranked, and offering the rest would offer several that are empty.
 *
 * @param props - The current scope, what is on offer, and what to call.
 * @returns The selector.
 */
export function ScopeSelector({
  scope,
  options,
  onChange,
  label = "Scope",
  placeholder = "Choose a scope",
  excluded = [],
}: ScopeSelectorProps): React.JSX.Element {
  const choose = (value: string): void => {
    const [kind, ...rest] = value.split(":");
    const key = rest.join(":");
    onChange({ kind: kind as ScopeKind, key: key === "" ? null : key });
  };
  const hidden = new Set(excluded.map(valueOf));
  const offered = (value: string): boolean => !hidden.has(value);
  const whole = WHOLE_POPULATIONS.filter((item) => offered(item.value));
  const indices = (options?.indices ?? []).filter((option) => offered(`index:${option.key}`));
  const sectors = (options?.sectors ?? []).filter((option) => offered(`sector:${option.key}`));

  return (
    // An empty value is Radix's way of showing the placeholder.
    <Select value={scope === null ? "" : valueOf(scope)} onValueChange={choose}>
      <SelectTrigger className="w-64" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {whole.length > 0 && (
          <SelectGroup>
            {whole.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {indices.length > 0 && (
          <SelectGroup>
            <SelectLabel>Indices</SelectLabel>
            {indices.map((option) => (
              <SelectItem key={option.key} value={`index:${option.key}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {sectors.length > 0 && (
          <SelectGroup>
            <SelectLabel>Sectors</SelectLabel>
            {sectors.map((option) => (
              <SelectItem key={option.key} value={`sector:${option.key}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
