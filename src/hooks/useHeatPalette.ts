/**
 * The heat colours as the stylesheet has them now.
 *
 * A heat colour is worked out here from the `--heat-*` tokens rather than
 * named in a class, so it is read from the stylesheet, and read again when
 * the mode changes: dark mode gives the tokens other values. The heatmap
 * and the strategy-by-year table both colour this way.
 */

import { useMemo } from "react";

import { type HeatPalette, heatPalette } from "@/lib/heatColour";
import { useTheme } from "@/lib/theme";

/**
 * Read the heat colours.
 *
 * @returns The colours, or null where no stylesheet gives the tokens values
 *   (a test), in which case a colour is mixed in the stylesheet instead.
 */
export function useHeatPalette(): HeatPalette | null {
  const { appearance } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the stylesheet is the input
  return useMemo(() => heatPalette(), [appearance]);
}
