/**
 * Which of a long run of equal-width columns are in view.
 *
 * So a grid thousands of columns wide draws only the few dozen a reader can
 * see, and the rest stand in as empty space of the same width: twenty years
 * of sessions across seven rows is thirty-five thousand cells, and a page
 * that built every one of them would scroll like one that had.
 */

/** The first and last column to draw, both inclusive; `last` below `first` for none. */
export interface ColumnRange {
  first: number;
  last: number;
}

/**
 * Find the columns to draw.
 *
 * Anything fixed at the left of the view, such as a pinned name column,
 * can be left out of the arithmetic: it hides columns the range already
 * counts as in view, so the range is only ever a little generous.
 *
 * @param scrollLeft - How far the columns are scrolled, in pixels.
 * @param viewWidth - How wide the view is, in pixels.
 * @param count - How many columns there are.
 * @param pitch - One column's width together with the gap after it.
 * @param spare - Columns drawn past each edge of the view, so a quick
 *   scroll shows cells rather than blanks before the next draw.
 * @returns The range to draw, within the columns there are.
 */
export function visibleRange(
  scrollLeft: number,
  viewWidth: number,
  count: number,
  pitch: number,
  spare: number,
): ColumnRange {
  return {
    first: Math.max(0, Math.floor(scrollLeft / pitch) - spare),
    last: Math.min(count - 1, Math.ceil((scrollLeft + viewWidth) / pitch) + spare),
  };
}
