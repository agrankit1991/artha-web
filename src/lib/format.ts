/**
 * Turning the platform's figures into something readable.
 *
 * Figures arrive as strings because the platform computes in decimal. They
 * are parsed here, at the point of display, and nowhere else -- so the
 * precision survives everything except the last step, where a screen can
 * only show so many digits anyway.
 *
 * An absent figure is not nought. A company listed last month has no yearly
 * return, and showing one of `0.00%` would rank it in the middle of a sorted
 * column rather than out of it. Every formatter here renders absence as a
 * dash.
 */

/** What a missing figure looks like. One character, so a column stays aligned. */
export const ABSENT = "—";

/**
 * Parse a figure for arithmetic or sorting.
 *
 * @param value - The figure as the platform sent it.
 * @returns The number, or null when there was no figure.
 */
export function toNumber(value: string | null | undefined): number | null {
  // An empty string is not a figure, but `Number("")` is nought -- which is
  // precisely the confusion between absence and nought this module exists
  // to prevent, arriving through the back door.
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Render a price.
 *
 * @param value - The figure.
 * @returns Two decimal places, grouped, or a dash.
 */
export function formatPrice(value: string | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null
    ? ABSENT
    : parsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Render a percentage, signed.
 *
 * The sign is always shown, including for a rise: a column of percentages
 * where only the falls carry a mark reads as though the rises were absolute.
 *
 * @param value - The figure.
 * @returns The percentage, or a dash.
 */
export function formatPercent(value: string | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(2)}%`;
}

/**
 * Render a ratio, as a multiple.
 *
 * @param value - The figure.
 * @returns Something like `4.2×`, or a dash.
 */
export function formatMultiple(value: string | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : `${parsed.toFixed(1)}×`;
}

/**
 * Render a traded volume.
 *
 * Abbreviated in the Indian convention -- lakh and crore -- because a
 * column of nine-digit numbers is unreadable and this is an Indian market.
 *
 * @param value - The volume, as a number or a figure.
 * @returns Something like `1.2 Cr`, or a dash.
 */
export function formatVolume(value: number | string | null | undefined): string {
  const parsed = typeof value === "number" ? value : toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  if (Math.abs(parsed) >= 10_000_000) {
    return `${(parsed / 10_000_000).toFixed(2)} Cr`;
  }
  if (Math.abs(parsed) >= 100_000) {
    return `${(parsed / 100_000).toFixed(2)} L`;
  }
  return parsed.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/**
 * Render a plain count.
 *
 * @param value - The count.
 * @returns The number, or a dash.
 */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? ABSENT : String(value);
}

/**
 * Render a session date.
 *
 * @param value - An ISO date, or null.
 * @returns Something like `18 Sep 2026`, or a dash.
 */
export function formatDay(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ABSENT;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? ABSENT
    : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Describe how long something has been in a list.
 *
 * @param streak - Sessions in a row, counting this one.
 * @returns `1d`, `6d`, and so on.
 */
export function formatStreak(streak: number): string {
  return `${String(streak)}d`;
}

/**
 * Decide whether a figure reads as a rise, a fall, or neither.
 *
 * @param value - The figure.
 * @returns Its direction, with `flat` covering both nought and absence --
 *   neither of which should be coloured as a move.
 */
export function direction(value: string | number | null | undefined): "up" | "down" | "flat" {
  const parsed = typeof value === "number" ? value : toNumber(value);
  if (parsed === null || parsed === 0) {
    return "flat";
  }
  return parsed > 0 ? "up" : "down";
}
