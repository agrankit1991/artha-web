/**
 * How a list page lays out what it lists.
 *
 * The previous project's list pages -- commodities, movers, watchlists --
 * each offered the same three layouts behind one segmented control: a
 * single table, one table per category, or cards. One component so every
 * page offers them alike, and one remembered choice per page.
 */

import { LayoutGrid, LayoutList, List } from "lucide-react";

import { Chooser } from "@/components/Chooser";
import type { Icon } from "@/lib/entities";
import {
  VIEW_MODES,
  type ViewMode,
  readPreferences,
  usePreferences,
  writePreferences,
} from "@/lib/preferences";

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
  // The same control as every other choice of a few ways of looking at one
  // thing, with an icon because a layout is quicker seen than read.
  return (
    <Chooser
      options={modes.map((one) => ({ key: one, ...LABELS[one] }))}
      chosen={mode}
      onChange={onChange}
      label="Layout"
      {...(className === undefined ? {} : { className })}
    />
  );
}

/**
 * The layout a page was last left in, and a way to change it.
 *
 * @param page - Which page's choice this is, such as `indices`.
 * @param fallback - The layout before one is chosen; a list unless the page
 *   reads better another way, as offerings do as cards.
 * @returns The current layout and its setter.
 */
export function useViewMode(
  page: string,
  fallback: ViewMode = "list",
): [ViewMode, (mode: ViewMode) => void] {
  const mode = usePreferences().views[page] ?? fallback;
  const choose = (next: ViewMode): void => {
    writePreferences({ views: { ...readPreferences().views, [page]: next } });
  };
  return [mode, choose];
}
