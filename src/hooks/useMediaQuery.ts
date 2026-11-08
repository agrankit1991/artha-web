/**
 * Whether a media query matches, kept current as the window changes.
 *
 * For layout worked out in script that must agree with the stylesheet's
 * breakpoints: the watchlist's charts fill the window only where the list
 * stands beside them, which is Tailwind's `xl`.
 */

import { useCallback, useSyncExternalStore } from "react";

/**
 * Follow a media query.
 *
 * @param query - The query, as CSS writes it: `(min-width: 1280px)`.
 * @returns Whether it matches now.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (changed: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", changed);
      return () => {
        list.removeEventListener("change", changed);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
