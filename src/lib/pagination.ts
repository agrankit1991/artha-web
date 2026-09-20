/**
 * Working out which page numbers to offer.
 *
 * Kept apart from the control that draws them because it is arithmetic
 * with several edges -- the first pages, the last pages, and the case
 * where every page fits -- and arithmetic is far easier to be sure of when
 * it can be read as a list of inputs and outputs.
 */

/** A page to offer, or a run of pages left out. */
export type PageSlot = number | "gap";

/** The most numbered buttons to show, gaps included. */
const SLOTS = 7;

/**
 * Work out which pages a control should offer.
 *
 * The first and last are always offered, because "go to the end" is a move
 * a reader makes and counting clicks to it is not.
 *
 * @param current - The page being shown, counting from one.
 * @param pages - How many pages there are in total.
 * @returns The slots, in order. Empty when there is nothing to page.
 */
export function pageSlots(current: number, pages: number): PageSlot[] {
  if (pages <= 1) {
    return [];
  }
  if (pages <= SLOTS) {
    return Array.from({ length: pages }, (_unused, index) => index + 1);
  }

  const near = [current - 1, current, current + 1].filter((page) => page > 1 && page < pages);
  // Near the ends the window has room to spare, and spending it on more
  // pages beside the current one is more useful than a gap either side.
  if (current <= 3) {
    near.push(2, 3, 4);
  }
  if (current >= pages - 2) {
    near.push(pages - 3, pages - 2, pages - 1);
  }

  const shown = [...new Set([1, ...near.filter((page) => page > 1 && page < pages), pages])].sort(
    (one, other) => one - other,
  );

  const slots: PageSlot[] = [];
  let previous = 0;
  for (const page of shown) {
    if (previous !== 0 && page - previous > 1) {
      slots.push("gap");
    }
    slots.push(page);
    previous = page;
  }
  return slots;
}

/**
 * Describe which of a total a page is showing.
 *
 * @param offset - How many were skipped to reach it.
 * @param shown - How many this page carries.
 * @param total - How many there are altogether.
 * @returns Something like `13–24 of 92`, or a phrase for an empty result.
 */
export function pageSummary(offset: number, shown: number, total: number): string {
  if (total === 0) {
    return "Nothing found";
  }
  return `${String(offset + 1)}–${String(offset + shown)} of ${String(total)}`;
}
