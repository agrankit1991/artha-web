/**
 * Switching between views of the same thing.
 *
 * One control, so tabs behave the same wherever they appear. Written here
 * for the reason recorded in this repository's notes -- Radix's components
 * that depend on pointer events cannot be driven in jsdom -- and because
 * tabs are a list of buttons and a panel, which is not much to own.
 *
 * The arrow keys move between them, as a tab strip is expected to: a
 * reader who has reached the strip should not have to tab through every
 * view to get to the last one.
 */

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * One view on offer.
 *
 * Generic in its key so a caller gets its own view names back rather than
 * a bare string: a page switching between "price" and "compare" should not
 * have to narrow a string into those two again on the way out.
 */
export interface Tab<Key extends string = string> {
  key: Key;
  label: string;
}

interface TabsProps<Key extends string> {
  tabs: Tab<Key>[];
  /** Which view is showing. */
  active: Key;
  onChange: (key: Key) => void;
  /** What the choice is between, for a reader who cannot see the strip. */
  label: string;
  /** The view itself. */
  children: React.ReactNode;
  /** Anything to show at the far end of the strip. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Render the strip and the view under it.
 *
 * @param props - The views, which is showing, and what to show.
 * @returns The tabs.
 */
export function Tabs<Key extends string>({
  tabs,
  active,
  onChange,
  label,
  children,
  aside,
  className,
}: TabsProps<Key>): React.JSX.Element {
  const group = useId();
  const at = tabs.findIndex((tab) => tab.key === active);

  const move = (event: React.KeyboardEvent): void => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || tabs.length === 0) {
      return;
    }
    event.preventDefault();
    // Wrapping round, which is what a strip of tabs does: the end of the
    // list is not a wall.
    const next = tabs[(at + step + tabs.length) % tabs.length];
    if (next !== undefined) {
      onChange(next.key);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={move}
          className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${group}-${tab.key}`}
              aria-selected={tab.key === active}
              aria-controls={`${group}-panel`}
              // Only the chosen tab is in the tab order; the arrows move
              // between them from there, which is how a strip is meant to
              // behave and what stops it swallowing the keyboard.
              tabIndex={tab.key === active ? 0 : -1}
              onClick={() => {
                onChange(tab.key);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab.key === active
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {aside}
      </div>
      <div
        role="tabpanel"
        id={`${group}-panel`}
        aria-labelledby={at === -1 ? undefined : `${group}-${active}`}
      >
        {children}
      </div>
    </div>
  );
}
