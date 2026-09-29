/**
 * Choosing one of a few things.
 *
 * A span of history, a reporting basis, which kind of population to lay
 * out: the same control every time, so a reader learns the shape once.
 * Written as buttons rather than a select because the options are few and
 * worth seeing at a glance -- a select hides every choice but the made one
 * behind a click.
 */

import { useRef } from "react";

import { useSlidingIndicator } from "@/hooks/useSlidingIndicator";
import type { Icon } from "@/lib/entities";
import { cn } from "@/lib/utils";

/** One thing on offer. */
export interface Option<Key extends string = string> {
  key: Key;
  label: string;
  /** An icon before the label, where one says it faster (a layout). */
  icon?: Icon;
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
 * Offer the options, as one segmented control.
 *
 * The same shape as a strip of tabs -- one track, one highlight sliding to
 * the choice -- because it is the same gesture: this is one of a few ways
 * of looking at the same thing.
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
  const track = useRef<HTMLDivElement>(null);
  const indicator = useSlidingIndicator(track, '[aria-pressed="true"]', chosen);

  return (
    <div
      ref={track}
      className={cn(
        "relative inline-flex flex-wrap items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5",
        className,
      )}
      role="group"
      aria-label={label}
    >
      {indicator !== null && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 rounded-md bg-background shadow-sm transition-[transform,width,height] duration-200 ease-brand"
          style={{
            width: indicator.width,
            height: indicator.height,
            transform: `translate(${String(indicator.left)}px, ${String(indicator.top)}px)`,
          }}
        />
      )}
      {options.map((option) => {
        const isChosen = option.key === chosen;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={isChosen}
            onClick={() => {
              onChange(option.key);
            }}
            className={cn(
              "relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isChosen
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
              // Until the highlight has been measured, the choice marks itself.
              isChosen && indicator === null && "bg-background shadow-sm",
            )}
          >
            {option.icon !== undefined && <option.icon aria-hidden="true" className="h-4 w-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
