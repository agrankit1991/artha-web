/**
 * A table's sort, kept in its page's address.
 *
 * A table sorted by the platform answers a question about every row, not
 * the page of them on screen, so its sort is part of the question and
 * belongs in the address beside the filters: `?sort=one_year&order=desc`.
 * The column and its direction are two parameters written in one change,
 * which `useSearchParam` cannot do (two of its setters in one event do not
 * compose), so they have this hook of their own.
 */

import type { SortingState, Updater } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Read and write the sort.
 *
 * @returns The sort as the table takes it (empty when the address names
 *   none; descending unless the address says `asc`), and a setter taking
 *   what the table hands its `onSortingChange`. A change replaces the
 *   history entry, as every filter's does. The setter is not stable.
 */
export function useSortParams(): [SortingState, (updater: Updater<SortingState>) => void] {
  const [params, setParams] = useSearchParams();
  const sort = params.get("sort");
  const ascending = params.get("order") === "asc";
  const sorting = useMemo<SortingState>(
    () => (sort === null ? [] : [{ id: sort, desc: !ascending }]),
    [sort, ascending],
  );
  const setSorting = useCallback(
    (updater: Updater<SortingState>) => {
      const [first] = typeof updater === "function" ? updater(sorting) : updater;
      const next = new URLSearchParams(params);
      if (first === undefined) {
        next.delete("sort");
        next.delete("order");
      } else {
        next.set("sort", first.id);
        next.set("order", first.desc ? "desc" : "asc");
      }
      setParams(next, { replace: true });
    },
    [params, setParams, sorting],
  );
  return [sorting, setSorting];
}
