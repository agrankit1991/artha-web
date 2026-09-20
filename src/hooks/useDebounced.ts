/**
 * Letting a value settle before acting on it.
 *
 * A search box that requests on every keystroke sends a request per letter
 * and races its own answers: the reply for "rel" can arrive after the reply
 * for "relian" and leave the wrong results on screen. Waiting for typing to
 * stop avoids both, and is the difference between a search that feels
 * responsive and one that flickers.
 */

import { useEffect, useState } from "react";

/** How long typing must stop for, in milliseconds. */
const SETTLE = 300;

/**
 * Follow a value, but only once it has stopped changing.
 *
 * @param value - The value to follow.
 * @param delay - How long it must hold still first.
 * @returns The value as it was when it last settled.
 */
export function useDebounced<T>(value: T, delay: number = SETTLE): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return settled;
}
