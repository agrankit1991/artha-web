/**
 * What a public offering's figures mean, worked out from what the platform
 * holds about it.
 *
 * Kept apart from the card and the page that draw them so the arithmetic
 * is tested as arithmetic, and so the list, the card and the offering's own
 * page cannot write a band or an outlay three ways.
 */

import type { IssueType, Offering } from "@/api/client";
import { ABSENT, formatRupees, toNumber } from "@/lib/format";

/** Which board an offering is on, and what that means. */
export const BOARDS: Record<IssueType, { label: string; hint: string }> = {
  REGULAR: {
    label: "Mainboard",
    hint: "The main exchange board, for larger and established companies. Lots are small and the shares trade like any other.",
  },
  SME: {
    label: "SME",
    hint: "The small and medium enterprise board. Lots are large -- often a thousand shares or more -- and the shares are less liquid after listing.",
  },
};

/**
 * How many days of bidding remain, for an offering that is open.
 *
 * @param offering - The offering.
 * @param today - The day it is read on.
 * @returns The days, nought on the last day, or null when it is not open,
 *   has no closing date published, or its close has passed. The last
 *   happens when the provider's status lags the calendar; a close in the
 *   past once read as "Last day to bid" on offerings shut for days.
 */
export function daysLeft(offering: Offering, today: Date): number | null {
  if (offering.status !== "OPEN" || offering.bidding_end === null) {
    return null;
  }
  const end = Date.parse(`${offering.bidding_end}T00:00:00Z`);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end - now) / 86_400_000);
  return days < 0 ? null : days;
}

/**
 * The smallest cheque an applicant can write.
 *
 * The top of the band times a lot, because a bid below the top is not
 * allotted when an offering is oversubscribed, which the ones worth
 * applying for are.
 *
 * @param offering - The offering.
 * @returns The outlay in rupees, or null when the band or the lot is unpublished.
 */
export function minimumInvestment(offering: Offering): number | null {
  const price = toNumber(offering.maximum_price);
  return price === null || offering.lot_size === null ? null : price * offering.lot_size;
}

/**
 * The price band in rupees, or the one price when the band has no width.
 *
 * @param offering - The offering.
 * @returns The band, or a dash.
 */
export function priceBand(offering: Offering): string {
  const low = toNumber(offering.minimum_price);
  const high = toNumber(offering.maximum_price);
  if (low === null && high === null) {
    return ABSENT;
  }
  if (low === null || high === null || low === high) {
    return formatRupees(offering.maximum_price ?? offering.minimum_price);
  }
  return `${formatRupees(offering.minimum_price)} - ${formatRupees(offering.maximum_price)}`;
}

/**
 * How far a listed offering opened from the price it was sold at.
 *
 * @param offering - The offering.
 * @returns The gain in per cent, as the platform's figures are written
 *   (a string), or null until both prices are published.
 */
export function listingGain(offering: Offering): string | null {
  const sold = toNumber(offering.cut_off_price);
  const opened = toNumber(offering.listing_price);
  return sold === null || opened === null || sold === 0 ? null : String((opened / sold - 1) * 100);
}
