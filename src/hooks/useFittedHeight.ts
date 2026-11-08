/**
 * The height to draw one thing at so that the element holding it comes to
 * a target height.
 *
 * For a chart in a cell of the watchlist's Chart view: the cell should be
 * its row's share of the window, and the chart takes whatever its toolbars,
 * legend and notes leave. Those wrap differently at every width, so what
 * they take is measured rather than assumed: the slack between the target
 * and the element is added to the height, after which the element is the
 * target's height and the slack is nought.
 *
 * The element is sized by what it holds, never by the target, so a chart
 * held at its least simply leaves the element taller than its share (and
 * the page scrolls) rather than spilling out of a box over its neighbour,
 * which a fixed-height grid row did on a laptop's four charts.
 */

import { useLayoutEffect, useState } from "react";

/**
 * Fit a height to a target.
 *
 * @param element - The element to bring to the target, the thing drawn at
 *   the height inside it; the ref's current value.
 * @param target - The height the element should come to, or null to leave
 *   the height as it started.
 * @param initial - The height before anything is measured, and while there
 *   is no target. A new one, or a target arriving or going, starts again
 *   from it.
 * @param least - The height never to go under, however little room there is.
 * @returns The height in pixels.
 */
export function useFittedHeight(
  element: HTMLElement | null,
  target: number | null,
  initial: number,
  least: number,
): number {
  const [height, setHeight] = useState(initial);
  // Starting again, adjusted while rendering rather than in an effect, so a
  // stale height is never drawn.
  const aimed = target !== null;
  const [startedFrom, setStartedFrom] = useState({ initial, aimed });
  if (startedFrom.initial !== initial || startedFrom.aimed !== aimed) {
    setStartedFrom({ initial, aimed });
    setHeight(initial);
  }

  useLayoutEffect(() => {
    if (element === null || target === null) {
      return undefined;
    }
    const fit = (): void => {
      const slack = target - element.offsetHeight;
      if (slack !== 0) {
        setHeight((now) => Math.max(least, now + slack));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element, target, least]);
  return height;
}
