/**
 * Rectangles sized by value: the layout of a market heatmap.
 *
 * Squarified, after Bruls, Huizing and van Wijk (2000): values are laid in
 * rows along the shorter side of what is left, and a row takes the next
 * value only while that keeps its worst rectangle closer to square. Long
 * slivers are what make a treemap unreadable -- a symbol will not fit in
 * one and its colour is a hairline -- and this is the ordering that avoids
 * them without searching every arrangement.
 *
 * Plain arithmetic, with no charting library, so it is tested as numbers:
 * every area is its value's share of the whole, and no two overlap.
 */

/** A rectangle, in whatever unit the bounds are given in. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A value to be given room in proportion to its size. */
export interface Sized<T> {
  item: T;
  size: number;
}

/** A value and the room it was given. */
export interface Placed<T> extends Rect {
  item: T;
}

/** A group of values laid out together, with room for its name above them. */
export interface PlacedGroup<G, T> extends Rect {
  group: G;
  /** Its name's strip across the top; none where the group is too short for one. */
  heading: Rect | null;
  items: Placed<T>[];
}

/**
 * Lay values out in the bounds, each in proportion to its size.
 *
 * @param values - What to lay out; a value of nought or less gets no room.
 * @param bounds - The room there is.
 * @returns Each positive value with its rectangle, largest first.
 */
export function squarify<T>(values: readonly Sized<T>[], bounds: Rect): Placed<T>[] {
  const positive = values.filter((one) => one.size > 0).sort((a, b) => b.size - a.size);
  const total = positive.reduce((sum, one) => sum + one.size, 0);
  const area = bounds.width * bounds.height;
  if (total === 0 || area <= 0) {
    return [];
  }
  const scale = area / total;
  const queue = positive.map((one) => ({ item: one.item, area: one.size * scale }));

  const placed: Placed<T>[] = [];
  let room = { ...bounds };
  let row: { item: T; area: number }[] = [];
  for (const next of queue) {
    const side = Math.min(room.width, room.height);
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      continue;
    }
    room = lay(row, room, placed);
    row = [next];
  }
  lay(row, room, placed);
  return placed;
}

/**
 * Lay groups out by their totals, then each group's values inside it.
 *
 * @param groups - Each group and its values.
 * @param bounds - The room there is.
 * @param headingHeight - How tall a group's name strip is; a group less
 *   than twice as tall gets no strip, and its values use the whole of it.
 * @returns Each group with a positive total, largest first, with its values.
 */
export function squarifyGroups<G, T>(
  groups: readonly { group: G; values: readonly Sized<T>[] }[],
  bounds: Rect,
  headingHeight: number,
): PlacedGroup<G, T>[] {
  const totals = groups.map((one) => ({
    item: one,
    size: one.values.reduce((sum, value) => sum + Math.max(value.size, 0), 0),
  }));
  return squarify(totals, bounds).map(({ item, ...room }) => {
    const heading =
      room.height >= headingHeight * 2
        ? { x: room.x, y: room.y, width: room.width, height: headingHeight }
        : null;
    const inside =
      heading === null
        ? room
        : { ...room, y: room.y + headingHeight, height: room.height - headingHeight };
    return { ...room, group: item.group, heading, items: squarify(item.values, inside) };
  });
}

/**
 * The worst aspect ratio in a row laid along a side: how far its least
 * square rectangle is from square, one being perfect.
 *
 * @param row - The areas in the row.
 * @param side - The length they are laid along.
 * @returns The ratio, one or more.
 */
function worst(row: readonly { area: number }[], side: number): number {
  const sum = row.reduce((total, one) => total + one.area, 0);
  const largest = Math.max(...row.map((one) => one.area));
  const smallest = Math.min(...row.map((one) => one.area));
  const squared = side * side;
  const across = sum * sum;
  return Math.max((squared * largest) / across, across / (squared * smallest));
}

/**
 * Lay a finished row along the shorter side of the room, and say what is
 * left.
 *
 * @param row - The areas.
 * @param room - Where the row goes.
 * @param placed - Where each placed rectangle is added.
 * @returns The room left beside the row.
 */
function lay<T>(row: readonly { item: T; area: number }[], room: Rect, placed: Placed<T>[]): Rect {
  const sum = row.reduce((total, one) => total + one.area, 0);
  if (room.width >= room.height) {
    // A column down the left, as tall as the room.
    const width = sum / room.height;
    let y = room.y;
    for (const one of row) {
      const height = one.area / width;
      placed.push({ item: one.item, x: room.x, y, width, height });
      y += height;
    }
    return { x: room.x + width, y: room.y, width: room.width - width, height: room.height };
  }
  // A row across the top, as wide as the room.
  const height = sum / room.width;
  let x = room.x;
  for (const one of row) {
    const width = one.area / height;
    placed.push({ item: one.item, x, y: room.y, width, height });
    x += width;
  }
  return { x: room.x, y: room.y + height, width: room.width, height: room.height - height };
}
