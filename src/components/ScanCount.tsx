/**
 * How many companies a scan finds on the latest session.
 *
 * Asked of the screener itself, over the whole market, so the count on a
 * card and the rows the screener then shows can never disagree. Only the
 * total is wanted, so only one row is asked for.
 */

import { useCallback } from "react";

import { fetchScreen } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/useResource";
import { ABSENT } from "@/lib/format";
import type { Scan } from "@/lib/scans";

interface ScanCountProps {
  scan: Scan;
  /** What a match is called: `stocks`, `candidates`. */
  noun: string;
}

/**
 * Render the count as a badge.
 *
 * @param props - The scan, and what its matches are called.
 * @returns A placeholder while counting, the count, or a dash when the
 *   screener could not be asked.
 */
export function ScanCount({ scan, noun }: ScanCountProps): React.JSX.Element {
  const loadCount = useCallback(
    () =>
      fetchScreen({
        conditions: scan.conditions,
        scope_kind: "companies",
        scope_key: "all",
        sort: null,
        order: "desc",
        limit: 1,
        offset: 0,
      }).then((page) => page.total),
    [scan],
  );
  const found = useResource(loadCount);
  if (found.loading) {
    return <Skeleton className="h-5 w-12" />;
  }
  return (
    <Badge variant="secondary" className="shrink-0 tabular">
      {found.data === null ? ABSENT : `${String(found.data)} ${noun}`}
    </Badge>
  );
}
