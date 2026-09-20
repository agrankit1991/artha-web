/** One index, as a card: where it closed and how it moved. */

import type { InstrumentOverview } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";

interface IndexCardProps {
  name: string;
  overview: InstrumentOverview | undefined;
}

/**
 * Render one index's latest close.
 *
 * @param props - What to call it and what it did.
 * @returns The card.
 */
export function IndexCard({ name, overview }: IndexCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {name}
        </div>
        {overview === undefined ? (
          <div className="h-12 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className="text-2xl font-semibold tabular">{formatPrice(overview.day.close)}</div>
            <Delta value={overview.day.change_percent} arrow />
          </>
        )}
      </CardContent>
    </Card>
  );
}
