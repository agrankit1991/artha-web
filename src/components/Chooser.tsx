/**
 * Choosing one of a few things.
 *
 * A span of history, a reporting basis, which kind of population to lay
 * out: the same control every time, so a reader learns the shape once.
 * Written as buttons rather than a select because the options are few and
 * worth seeing at a glance -- a select hides every choice but the made one
 * behind a click.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One thing on offer. */
export interface Option<Key extends string = string> {
  key: Key;
  label: string;
}

interface ChooserProps<Key extends string> {
  options: readonly Option<Key>[];
  chosen: Key;
  onChange: (key: Key) => void;
  /** What the choice is about, for a reader who cannot see the buttons. */
  label: string;
  className?: string;
}

/**
 * Offer the options.
 *
 * @param props - The options, which is chosen, and what to call.
 * @returns The chooser.
 */
export function Chooser<Key extends string>({
  options,
  chosen,
  onChange,
  label,
  className,
}: ChooserProps<Key>): React.JSX.Element {
  return (
    <div className={cn("flex flex-wrap gap-1", className)} role="group" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option.key}
          size="sm"
          variant={option.key === chosen ? "secondary" : "ghost"}
          aria-pressed={option.key === chosen}
          onClick={() => {
            onChange(option.key);
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
