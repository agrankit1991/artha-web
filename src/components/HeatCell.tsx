/**
 * A figure on the colour of its move, as the heatmap colours a tile.
 *
 * For a table whose rows are read across periods: the sectors by week,
 * month and year, the strategies by calendar year. The colour comes from
 * `heatColour` against the period's reach, and the text is whichever ink
 * reads on it, so a strong year is the same green here as on the heatmap
 * and the figure is always printed.
 */

import { type HeatPalette, heatPaint, heatShare } from "@/lib/heatColour";
import { ABSENT, formatPercent, toNumber } from "@/lib/format";

interface HeatCellProps {
  /** The move, per cent, as the platform sends it; null when unknown. */
  value: string | null;
  /** The move drawn at full colour, from `HEAT_REACH`. */
  reach: number;
  /** The heat colours (`useHeatPalette`), read once by the table. */
  palette: HeatPalette | null;
  /** How the figure is written; a signed percentage to two places by default. */
  format?: (value: string | null) => string;
}

/**
 * Render the cell's content.
 *
 * @param props - The move, its period's reach, the colours and the format.
 * @returns The figure on its colour, or a dash on none.
 */
export function HeatCell({
  value,
  reach,
  palette,
  format = formatPercent,
}: HeatCellProps): React.JSX.Element {
  const move = toNumber(value);
  if (move === null) {
    return <span className="block px-2 text-right text-muted-foreground">{ABSENT}</span>;
  }
  const paint = heatPaint(heatShare(move, reach), palette);
  return (
    <span
      className="block rounded px-2 py-0.5 text-right tabular"
      style={{ backgroundColor: paint.fill, color: paint.ink }}
    >
      {format(value)}
    </span>
  );
}
