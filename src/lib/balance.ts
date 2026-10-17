/**
 * Every list of strategies opens on the best balanced: return and drawdown together.
 *
 * The owner asked for the best on top, "good CAGR and less drawdown,
 * balanced" (2026-10-17), and chose the platform's measure: a return per
 * point of its deepest fall, for a whole backtest the weaker of its two
 * periods (`artha.domain.balance`). The figure comes from the platform;
 * this only orders by it (`ratio` in `backtestFigures` writes it). Any column
 * still sorts on a click.
 */

/**
 * Rows best balanced first; rows without a balance after them, in the order they came.
 *
 * @param rows - The rows.
 * @param balanceOf - A row's balance, or null when it has none (not yet run).
 * @returns A new array, ordered.
 */
export function byBalance<Row>(
  rows: readonly Row[],
  balanceOf: (row: Row) => number | null | undefined,
): Row[] {
  return rows
    .map((row, position) => ({ row, position, value: balanceOf(row) }))
    .sort((a, b) => {
      if (known(a.value) && known(b.value)) {
        return b.value - a.value || a.position - b.position;
      }
      if (known(a.value) !== known(b.value)) {
        return known(a.value) ? -1 : 1;
      }
      return a.position - b.position;
    })
    .map(({ row }) => row);
}

/** Whether a figure is there. */
function known(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}
