/**
 * Marks on a price chart: the bonuses and splits that changed a company's
 * share count. (A chosen strategy's buys and sells were marked too, until
 * the owner removed the choice on 2026-11-08: most strategies never traded
 * the company charted, so a pick usually marked nothing.)
 *
 * Worked out here as plain arithmetic, apart from the chart that draws them
 * (artha-web CLAUDE.md: the chart is stubbed in tests, so what a mark says
 * and where it sits is tested here).
 */

import type { CorporateAction } from "@/api/client";

/** One mark, in the chart's own terms rather than the library's. */
export interface ChartMarker {
  /** The session, as an ISO date. */
  time: string;
  /** Over the bar or under it. */
  position: "above" | "below";
  shape: "up" | "down" | "circle";
  /** A rise, a fall, or neither. */
  tone: "gain" | "loss" | "neutral";
  text: string;
}

/** The actions that change a share count and so show in an adjusted price. */
const MARKED_ACTIONS = new Set<CorporateAction["kind"]>(["BONUS", "SPLIT", "RIGHTS"]);

/**
 * Mark the bonuses, splits and rights issues on a company's chart.
 *
 * Dividends are left off: they come every year or more, change no share
 * count, and would crowd out the marks that explain a jump in the price.
 *
 * @param actions - The company's corporate actions.
 * @returns A circle over each one's ex-date, named as the provider names it.
 */
export function actionMarkers(actions: readonly CorporateAction[]): ChartMarker[] {
  return actions
    .filter((one) => MARKED_ACTIONS.has(one.kind))
    .map((one) => ({
      time: one.ex_date,
      position: "above" as const,
      shape: "circle" as const,
      tone: "neutral" as const,
      text: one.label,
    }));
}
