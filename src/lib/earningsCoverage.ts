/**
 * Which periods of a population's earnings speak for the population.
 *
 * The platform groups statements by the exact day a period ended, so a
 * company whose year ends in December or January forms a period of its
 * own beside the March year every other company reports: among the whole
 * market's annual periods, 31 January 2026 is one company with ₹57 crore
 * of revenue, between two Marches of about three thousand companies each.
 * The statements also reach back further for a hundred-odd companies than
 * for the rest. Drawn as a line, the totals of such periods are a sawtooth
 * that says nothing about the population.
 *
 * So a period counts as broad when at least half as many companies
 * reported in it as in the best-covered period. The rule is relative, so
 * it holds for a sector of eight companies as for the market of five
 * thousand. Grouping by financial year in the platform would be the
 * cleaner fix; until then this keeps the chart honest.
 *
 * Growth needs the same care one step further: it is taken over the
 * companies present in both periods, and a broad period can follow a
 * narrow one. The market's September 2025 quarter was filed by 3,865
 * companies, but only 95 of them had filed the June quarter before it,
 * and their profit "fell 995%" beside quarters measured over 3,900.
 */

import type { EarningsPeriod, GrowthFigure } from "@/api/client";

/**
 * The periods most of the population reported in, in the order given.
 *
 * @param periods - Every period held, in any order.
 * @returns Those reported by at least half as many companies as the
 *   best-covered one; none when none are held.
 */
export function broadPeriods(periods: readonly EarningsPeriod[]): EarningsPeriod[] {
  const most = Math.max(0, ...periods.map((one) => one.reported));
  return periods.filter((one) => one.reported * 2 >= most);
}

/**
 * Read a growth figure only where it was taken over a broad sample: at
 * least half as many companies as the largest sample of the same figure.
 *
 * @param periods - The periods the figure is read from.
 * @param pick - Which growth figure to read from a period.
 * @returns A reader giving the figure where its sample is broad, and null
 *   where it is narrow or absent.
 */
export function broadGrowth(
  periods: readonly EarningsPeriod[],
  pick: (period: EarningsPeriod) => GrowthFigure | null,
): (period: EarningsPeriod) => GrowthFigure | null {
  const most = Math.max(0, ...periods.map((one) => pick(one)?.sample ?? 0));
  return (period) => {
    const figure = pick(period);
    return figure !== null && figure.sample * 2 >= most ? figure : null;
  };
}
