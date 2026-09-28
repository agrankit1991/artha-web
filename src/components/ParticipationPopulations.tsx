/**
 * Choosing the populations the participation heatmap compares, a row each.
 *
 * Any index, any sector, or either whole population, in whatever order the
 * reader wants to read them down. The headline indices are where it
 * starts, and are as removable as anything added; a reset brings them back.
 */

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import type { ScopeOptions } from "@/api/client";
import { Chip, ChipButton } from "@/components/Chip";
import { type Scope, ScopeSelector } from "@/components/ScopeSelector";
import { Button } from "@/components/ui/button";
import { populationLabel, MOST_POPULATIONS } from "@/lib/participationPopulations";

interface ParticipationPopulationsProps {
  populations: readonly Scope[];
  options: ScopeOptions | null;
  onChange: (populations: Scope[]) => void;
  /** Go back to the headline indices, or null while they are what is shown. */
  onReset: (() => void) | null;
}

/**
 * Offer the populations as chips, with a way to add one and a way back.
 *
 * @param props - The populations, what can be added, and what to call on a change.
 * @returns The controls.
 */
export function ParticipationPopulations({
  populations,
  options,
  onChange,
  onReset,
}: ParticipationPopulationsProps): React.JSX.Element {
  const moved = (scope: Scope, from: number, to: number): Scope[] => {
    const rest = populations.filter((_unused, index) => index !== from);
    return [...rest.slice(0, to), scope, ...rest.slice(to)];
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Populations" className="flex flex-wrap items-center gap-2">
        {populations.map((scope, index) => {
          const label = populationLabel(scope, options);
          return (
            <li key={`${scope.kind}:${scope.key ?? ""}`}>
              <Chip
                removeLabel={`Remove ${label}`}
                onRemove={() => {
                  onChange(populations.filter((_unused, other) => other !== index));
                }}
                controls={
                  <>
                    <ChipButton
                      label={`Move ${label} left`}
                      disabled={index === 0}
                      onClick={() => {
                        onChange(moved(scope, index, index - 1));
                      }}
                    >
                      <ChevronLeft aria-hidden="true" className="h-3 w-3" />
                    </ChipButton>
                    <ChipButton
                      label={`Move ${label} right`}
                      disabled={index === populations.length - 1}
                      onClick={() => {
                        onChange(moved(scope, index, index + 1));
                      }}
                    >
                      <ChevronRight aria-hidden="true" className="h-3 w-3" />
                    </ChipButton>
                  </>
                }
              >
                <span className="font-medium">{label}</span>
              </Chip>
            </li>
          );
        })}
      </ul>
      {populations.length < MOST_POPULATIONS ? (
        <ScopeSelector
          scope={null}
          options={options}
          excluded={populations}
          label="Add a population"
          placeholder="Add a population"
          onChange={(scope) => {
            onChange([...populations, scope]);
          }}
        />
      ) : (
        <span className="text-xs text-muted-foreground">
          {String(MOST_POPULATIONS)} is the most one heatmap carries; remove one to add another.
        </span>
      )}
      {onReset !== null && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Reset to the headline indices"
          onClick={onReset}
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
