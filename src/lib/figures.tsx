/**
 * Reading a figure off an instrument's overview by name.
 *
 * The overview is typed, but which figure a column or a row shows is
 * decided at run time from the platform's registry of screenable figures,
 * each of which carries the path to walk. The walk is over the plain
 * object shape, and stops -- with nothing -- at anything that is not an
 * object on the way.
 */

import type { CompanySnapshot, InstrumentOverview, ScreenField } from "@/api/client";
import { Delta } from "@/components/Delta";
import {
  ABSENT,
  formatPercent,
  formatPercentLevel,
  formatPrice,
  formatWhole,
  toNumber,
} from "@/lib/format";

/**
 * Read one figure by the path the registry gave.
 *
 * @param figures - The instrument's overview.
 * @param path - The attributes to follow.
 * @returns The figure, or null where the path leads nowhere or to nothing.
 */
export function figureAt(record: object | null, path: string[]): string | number | null {
  let at: unknown = record;
  for (const step of path) {
    if (at === null || typeof at !== "object") {
      return null;
    }
    at = (at as Record<string, unknown>)[step];
  }
  return typeof at === "string" || typeof at === "number" ? at : null;
}

/**
 * Per-cent figures that are a size or a share rather than a move: written
 * unsigned. A day's range of 1.4% or a volatility of 19% did not rise.
 */
const PERCENT_LEVELS = new Set([
  "range_percent",
  "delivery_percent",
  "delivery_percent_average",
  "volatility_month",
  "volatility_year",
  "dividend_yield",
]);

/**
 * Per-cent figures that say where a price stands against a mark: signed,
 * but plain. 23% under the year's high is a distance, not a fall.
 */
const PERCENT_DISTANCES = new Set([
  "from_high_percent",
  "from_low_percent",
  "from_swing_low_percent",
  "from_sma_20_percent",
  "from_sma_50_percent",
  "from_sma_150_percent",
  "from_sma_200_percent",
  "max_drawdown_percent",
]);

/**
 * Write a figure by its unit.
 *
 * The platform calls every per-cent figure `percent`; how one reads --
 * a move, a distance or a size -- is decided here by name, and a figure
 * not named is a move. (The cleaner home for that is the platform's unit;
 * logged in the brand plan's platform list.)
 *
 * @param field - The figure's registry entry, for its unit and name.
 * @param value - The figure, or null.
 * @returns The written figure: a move as a signed, coloured percentage, a
 *   distance signed and plain, a size unsigned; a grouped price or count;
 *   a multiple; or an oscillator's plain reading.
 */
export function writtenFigure(field: ScreenField, value: string | number | null): React.ReactNode {
  if (value === null) {
    return ABSENT;
  }
  const text = String(value);
  switch (field.unit) {
    case "percent":
      if (PERCENT_LEVELS.has(field.name)) {
        return formatPercentLevel(text);
      }
      if (PERCENT_DISTANCES.has(field.name)) {
        return <span className="text-muted-foreground">{formatPercent(text)}</span>;
      }
      return <Delta value={text} />;
    case "price":
      return formatPrice(text);
    case "count":
      return formatWhole(Number(text));
    case "multiple":
      return `${(toNumber(text) ?? 0).toFixed(2)}×`;
    case "points":
    case "ratio":
      return (toNumber(text) ?? 0).toFixed(2);
    case "crore":
      return formatWhole(Number(text));
    case "score":
      return String(Math.round(Number(text)));
    case "rank":
      return `#${String(Math.round(Number(text)))}`;
  }
}

/**
 * Read a field's value from whichever of a hit's records it lives in.
 *
 * @param field - The field, which names its record and its path.
 * @param records - The hit's daily figures and its standing, either absent.
 * @returns The value, or null where the record or the value is absent.
 */
export function valueOf(
  field: ScreenField,
  records: { figures: InstrumentOverview | null; snapshot?: CompanySnapshot | null },
): string | number | null {
  return figureAt(
    field.record === "snapshot" ? (records.snapshot ?? null) : records.figures,
    field.path,
  );
}
