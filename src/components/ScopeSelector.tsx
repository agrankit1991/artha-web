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
  scope: Scope;
  options: ScopeOptions | null;
  onChange: (scope: Scope) => void;
}

const WHOLE_POPULATIONS: { value: string; label: string; scope: Scope }[] = [
  { value: "companies", label: "All companies", scope: { kind: "companies", key: null } },
  { value: "indices", label: "All indices", scope: { kind: "indices", key: null } },
];

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
export function ScopeSelector({ scope, options, onChange }: ScopeSelectorProps): React.JSX.Element {
  const choose = (value: string): void => {
    const [kind, ...rest] = value.split(":");
    const key = rest.join(":");
    onChange({ kind: kind as ScopeKind, key: key === "" ? null : key });
  };

  return (
    <Select value={valueOf(scope)} onValueChange={choose}>
      <SelectTrigger className="w-64" aria-label="Scope">
        <SelectValue placeholder="Choose a scope" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {WHOLE_POPULATIONS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        {options && options.indices.length > 0 && (
          <SelectGroup>
            <SelectLabel>Indices</SelectLabel>
            {options.indices.map((option) => (
              <SelectItem key={option.key} value={`index:${option.key}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {options && options.sectors.length > 0 && (
          <SelectGroup>
            <SelectLabel>Sectors</SelectLabel>
            {options.sectors.map((option) => (
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
