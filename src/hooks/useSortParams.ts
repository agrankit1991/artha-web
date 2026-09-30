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

import type { ColumnSort, SortingState, Updater } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Read and write the sort.
 *
 * @param fallback - The sort when the address names none, as the table
 *   shows it; choosing it again leaves the address plain. None by default.
 * @returns The sort as the table takes it (the fallback when the address
 *   names none; descending unless the address says `asc`), and a setter
 *   taking what the table hands its `onSortingChange`. A change replaces
 *   the history entry, as every filter's does. The setter is not stable.
 */
export function useSortParams(
  fallback?: ColumnSort,
): [SortingState, (updater: Updater<SortingState>) => void] {
  const [params, setParams] = useSearchParams();
  const sort = params.get("sort");
  const ascending = params.get("order") === "asc";
  const sorting = useMemo<SortingState>(() => {
    if (sort !== null) {
      return [{ id: sort, desc: !ascending }];
    }
    return fallback === undefined ? [] : [fallback];
  }, [sort, ascending, fallback]);
  const setSorting = useCallback(
    (updater: Updater<SortingState>) => {
      const [first] = typeof updater === "function" ? updater(sorting) : updater;
      const next = new URLSearchParams(params);
      const plain =
        first === undefined ||
        (fallback !== undefined && first.id === fallback.id && first.desc === fallback.desc);
      if (plain) {
        next.delete("sort");
        next.delete("order");
      } else {
        next.set("sort", first.id);
        next.set("order", first.desc ? "desc" : "asc");
      }
      setParams(next, { replace: true });
    },
    [params, setParams, sorting, fallback],
  );
  return [sorting, setSorting];
}
