/**
 * Who joined and left an index.
 *
 * Membership has been recorded only since the constituents job began, so
 * this lists changes since then; an index that has not been reconstituted
 * since has nothing to show and the card is left out.
 */

import { Link } from "react-router-dom";

import type { IndexChange } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/format";
import { companyPath } from "@/lib/paths";

/**
 * Draw the card.
 *
 * @param props - The changes, newest first.
 * @returns The card, or nothing when there are none.
 */
export function IndexChanges({ changes }: { changes: IndexChange[] }): React.JSX.Element | null {
  if (changes.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Index Changes</CardTitle>
        <CardDescription>Companies added and removed since the record began.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {changes.map((change) => (
            <li
              key={`${change.kind}:${change.isin}:${change.day}`}
              className="flex items-center gap-3 py-2 text-sm"
            >
              <span className="w-24 shrink-0 text-muted-foreground">{formatDay(change.day)}</span>
              <Badge
                variant="outline"
                className={
                  change.kind === "ADDED"
                    ? "border-gain/30 bg-gain/10 text-gain"
                    : "border-loss/30 bg-loss/10 text-loss"
                }
              >
                {change.kind === "ADDED" ? "Added" : "Removed"}
              </Badge>
              {change.instrument_key === null ? (
                <span className="font-medium">{change.symbol}</span>
              ) : (
                <Link
                  to={companyPath(change.instrument_key, change.symbol)}
                  className="font-medium text-primary hover:underline"
                >
                  {change.symbol}
                </Link>
              )}
              <span className="min-w-0 truncate text-muted-foreground">{change.name}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
