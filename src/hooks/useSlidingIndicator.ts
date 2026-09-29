/**
 * Where a highlight should sit under the chosen one of a row of options.
 *
 * A strip of tabs that moves its highlight to the choice, rather than
 * repainting one option and blanking another, shows where the choice came
 * from and went: the eye follows it instead of hunting for it. Measured
 * here, drawn by the caller as one absolutely placed element with a CSS
 * transition, so no animation library is needed for it.
 */

import { type RefObject, useLayoutEffect, useState } from "react";

/** Where and how big the highlight is, in the container's own coordinates. */
export interface Indicator {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measure the chosen option, and again whenever it or the strip changes size.
 *
 * @param strip - The container the options sit in; it must be positioned,
 *   since the measurements are relative to it.
 * @param chosen - A selector for the chosen option inside the strip.
 * @param choice - What is chosen, so a new choice is measured again.
 * @returns Where the highlight goes, or null before the first measurement
 *   (the caller then marks the chosen option by itself).
 */
export function useSlidingIndicator(
  strip: RefObject<HTMLElement | null>,
  chosen: string,
  choice: unknown,
): Indicator | null {
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  useLayoutEffect(() => {
    const holder = strip.current;
    // Unreachable once the ref is attached, which it is before a layout
    // effect runs; the compiler cannot know that.
    if (holder === null) {
      return undefined;
    }
    const measure = (): void => {
      const option = holder.querySelector<HTMLElement>(chosen);
      setIndicator(
        option === null
          ? null
          : {
              left: option.offsetLeft,
              top: option.offsetTop,
              width: option.offsetWidth,
              height: option.offsetHeight,
            },
      );
    };
    measure();
    // A label that wraps, a font that arrives late or a window that narrows
    // all move the chosen option without changing the choice.
    const observer = new ResizeObserver(measure);
    observer.observe(holder);
    return () => {
      observer.disconnect();
    };
  }, [strip, chosen, choice]);

  return indicator;
}
