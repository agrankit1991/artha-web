/**
 * One piece of a page's state, kept in its address.
 *
 * A filtered list is a question, and a question belongs in the address: it
 * can be bookmarked, shared and returned to. Five pages wrote the same few
 * lines to do it, each a little differently; this is them once. A value at
 * its default is left out of the address rather than written, so the plain
 * page keeps its plain address, and a change replaces the history entry
 * rather than adding one, so Back leaves the page instead of undoing a
 * filter one keystroke at a time.
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Read and write one parameter of the address.
 *
 * @param name - The parameter.
 * @param fallback - Its value when the address does not name one; setting
 *   it back to this removes the parameter.
 * @returns The current value, and a setter. The setter is not stable
 *   (react-router's own changes with every address), so an effect that
 *   calls it must compare before writing, or it writes, gets a new setter,
 *   and writes again. Nor do two setters compose within one event: the
 *   router hands each the address as rendered, and the second write
 *   replaces the first. Set one parameter per event, or navigate once.
 */
export function useSearchParam(name: string, fallback = ""): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params);
      if (value === fallback) {
        next.delete(name);
      } else {
        next.set(name, value);
      }
      setParams(next, { replace: true });
    },
    [name, fallback, params, setParams],
  );
  return [params.get(name) ?? fallback, set];
}
