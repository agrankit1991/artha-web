/**
 * Reading a figure off an instrument's overview by name.
 *
 * The overview is typed, but which figure a column or a row shows is
 * decided at run time from the platform's registry of screenable figures,
 * each of which carries the path to walk. The walk is over the plain
 * object shape, and stops -- with nothing -- at anything that is not an
 * object on the way.
 */

import type { InstrumentOverview, ScreenField } from "@/api/client";
import { Delta } from "@/components/Delta";
import { ABSENT, formatPrice, formatWhole, toNumber } from "@/lib/format";

/**
 * Read one figure by the path the registry gave.
 *
 * @param figures - The instrument's overview.
 * @param path - The attributes to follow.
 * @returns The figure, or null where the path leads nowhere or to nothing.
 */
export function figureAt(figures: InstrumentOverview, path: string[]): string | number | null {
  let at: unknown = figures;
  for (const step of path) {
    if (at === null || typeof at !== "object") {
      return null;
    }
    at = (at as Record<string, unknown>)[step];
  }
  return typeof at === "string" || typeof at === "number" ? at : null;
}

/**
 * Write a figure by its unit.
 *
 * @param field - The figure's registry entry, for its unit.
 * @param value - The figure, or null.
 * @returns The written figure: a signed, coloured percentage; a grouped
 *   price or count; a multiple; or an oscillator's plain reading.
 */
export function writtenFigure(field: ScreenField, value: string | number | null): React.ReactNode {
  if (value === null) {
    return ABSENT;
  }
  const text = String(value);
  switch (field.unit) {
    case "percent":
      return <Delta value={text} />;
    case "price":
      return formatPrice(text);
    case "count":
      return formatWhole(Number(text));
    case "multiple":
      return `${(toNumber(text) ?? 0).toFixed(2)}×`;
    case "points":
      return (toNumber(text) ?? 0).toFixed(2);
  }
}
