/**
 * How tall an element can be and still end at the bottom of the window.
 *
 * For a view meant to fill the screen under whatever the page puts above
 * it, as TradingView's chart does: the watchlist's Chart view. Measured
 * from where the element starts on the page, not from where the page is
 * scrolled to, so the view fits the window with the page at its top and
 * does not grow or shrink as the reader scrolls.
 */

import { useLayoutEffect, useState } from "react";

/**
 * Measure the room from an element's top to the bottom of the window.
 *
 * Measured again when the window changes size, and when the page does
 * (something above the element arriving moves it down).
 *
 * @param element - The element, once it is mounted; the ref's current value.
 * @param margin - Room to leave free under it, in pixels.
 * @returns The height in pixels, never under nought; nought before it is
 *   measured.
 */
export function useHeightToViewportBottom(element: HTMLElement | null, margin: number): number {
  const [room, setRoom] = useState(0);
  useLayoutEffect(() => {
    if (element === null) {
      return undefined;
    }
    const measure = (): void => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      setRoom(Math.max(0, Math.round(window.innerHeight - top - margin)));
    };
    measure();
    window.addEventListener("resize", measure);
    // The element's own growth changes the page's height too; measuring
    // again then finds the same room, and an unchanged state renders nothing.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [element, margin]);
  return room;
}
