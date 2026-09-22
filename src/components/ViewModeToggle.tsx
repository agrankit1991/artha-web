/**
 * How a list page lays out what it lists.
 *
 * The previous project's list pages -- commodities, movers, watchlists --
 * each offered the same three layouts behind one segmented control: a
 * single table, one table per category, or cards. One component so every
 * page offers them alike, and one remembered choice per page.
 */

import { LayoutGrid, LayoutList, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Icon } from "@/lib/entities";
import {
  VIEW_MODES,
  type ViewMode,
  readPreferences,
  usePreferences,
  writePreferences,
} from "@/lib/preferences";
import { cn } from "@/lib/utils";

const LABELS: Record<ViewMode, { label: string; icon: Icon }> = {
  list: { label: "List", icon: List },
  grouped: { label: "Grouped", icon: LayoutList },
  cards: { label: "Cards", icon: LayoutGrid },
};

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** The layouts this page offers; all three unless it says otherwise. */
  modes?: readonly ViewMode[];
  className?: string;
}

/**
 * The segmented control that switches a page's layout.
 *
 * @param props - The current layout and what to do when another is chosen.
 * @returns The control.
 */
export function ViewModeToggle({
  mode,
  onChange,
  modes = VIEW_MODES,
  className,
}: ViewModeToggleProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Layout"
      className={cn("inline-flex rounded-md border bg-muted/40 p-0.5", className)}
    >
      {modes.map((one) => {
        const { label, icon: Mark } = LABELS[one];
        return (
          <Button
            key={one}
            size="sm"
            variant={one === mode ? "default" : "ghost"}
            aria-pressed={one === mode}
            onClick={() => {
              onChange(one);
            }}
            className="h-7 gap-1.5 px-2.5"
          >
            <Mark aria-hidden="true" className="h-4 w-4" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * The layout a page was last left in, and a way to change it.
 *
 * @param page - Which page's choice this is, such as `indices`.
 * @returns The current layout and its setter; `list` until one is chosen.
 */
export function useViewMode(page: string): [ViewMode, (mode: ViewMode) => void] {
  const mode = usePreferences().views[page] ?? "list";
  const choose = (next: ViewMode): void => {
    writePreferences({ views: { ...readPreferences().views, [page]: next } });
  };
  return [mode, choose];
}
