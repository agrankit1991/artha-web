/**
 * Marks on a price chart: where a strategy bought and sold, and the bonuses
 * and splits that changed a company's share count.
 *
 * Worked out here as plain arithmetic, apart from the chart that draws them
 * (artha-web CLAUDE.md: the chart is stubbed in tests, so what a mark says
 * and where it sits is tested here). The words are the trades table's own
 * (`SALE_REASONS`), so a mark and the row it stands for say the same thing.
 */

import type { BacktestTrade, CorporateAction } from "@/api/client";
import { SALE_REASONS } from "@/lib/strategyTerms";

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
 * Mark where a strategy bought and sold.
 *
 * @param trades - Its sales, each with the purchase it closed.
 * @returns A buy under each entry session -- once, though a purchase sold
 *   in parts has several sales -- and a sell over each exit, green when it
 *   made money and red when it lost, named by why it was sold.
 */
export function tradeMarkers(trades: readonly BacktestTrade[]): ChartMarker[] {
  const bought = new Set<string>();
  const marks: ChartMarker[] = [];
  for (const trade of trades) {
    if (!bought.has(trade.entered)) {
      bought.add(trade.entered);
      marks.push({
        time: trade.entered,
        position: "below",
        shape: "up",
        tone: "gain",
        text: "Buy",
      });
    }
    marks.push({
      time: trade.exited,
      position: "above",
      shape: "down",
      tone: trade.gain_percent >= 0 ? "gain" : "loss",
      text: `Sell: ${SALE_REASONS[trade.reason]?.word ?? trade.reason}`,
    });
  }
  return marks;
}

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
