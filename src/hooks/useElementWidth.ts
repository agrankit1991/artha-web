/**
 * How wide an element is drawn, kept current as it resizes.
 *
 * For layouts worked out in script rather than by the browser -- a treemap
 * whose rectangles depend on the room's proportions -- which must be
 * worked out again when a sidebar folds or a phone turns.
 */

import { useLayoutEffect, useState } from "react";

/**
 * Measure an element's width.
 *
 * @param element - The element, once it is mounted; the ref's current value.
 * @returns Its width in pixels; nought before it is measured, and under
 *   test, where nothing is laid out.
 */
export function useElementWidth(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (element === null) {
      return undefined;
    }
    const measure = (): void => {
      setWidth(element.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return width;
}
