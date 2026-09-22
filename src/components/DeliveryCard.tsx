/**
 * How much of what traded changed hands for good.
 *
 * StockEdge's Deliveries section: a delivery share well above its own
 * average is buying being carried home rather than turned over within the
 * day, which is why the latest session is set beside the recent average.
 * The bars are in the accent, not green or red: a share delivered is
 * neither a gain nor a loss.
 */

import type { DeliveryDay } from "@/api/client";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ABSENT, formatDay, formatVolume, toNumber } from "@/lib/format";

/** How many sessions the average is taken over. */
const AVERAGE_SESSIONS = 20;

/**
 * Draw the card.
 *
 * @param props - The company's sessions, newest first.
 * @returns The card, or nothing when NSE has published none.
 */
export function DeliveryCard({ days }: { days: DeliveryDay[] }): React.JSX.Element | null {
  const known = days.flatMap((one) => {
    const share = toNumber(one.delivery_percent);
    return share === null ? [] : [{ ...one, share }];
  });
  const latest = known[0];
  if (latest === undefined) {
    return null;
  }
  const recent = known.slice(0, AVERAGE_SESSIONS);
  const average = recent.reduce((sum, one) => sum + one.share, 0) / recent.length;
  const drawn = [...known].reverse();
  const width = drawn.length * 10;
  const height = 48;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatGrid className="lg:grid-cols-3">
          <StatTile
            label={`Delivered, ${formatDay(latest.session_date)}`}
            value={`${latest.share.toFixed(2)}%`}
            hint={`${formatVolume(latest.delivered_quantity)} of ${formatVolume(latest.traded_quantity)}`}
          />
          <StatTile
            label={`Average, last ${String(recent.length)} sessions`}
            value={`${average.toFixed(2)}%`}
          />
          <StatTile
            label="Latest against average"
            value={average === 0 ? ABSENT : `${(latest.share / average).toFixed(2)}×`}
          />
        </StatGrid>
        <svg
          role="img"
          aria-label={`Delivered share, last ${String(drawn.length)} sessions`}
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          preserveAspectRatio="none"
          className="h-12 w-full"
        >
          {drawn.map((one, position) => {
            const size = (one.share / 100) * height;
            return (
              <rect
                key={one.session_date}
                x={position * 10 + 1.5}
                width={7}
                y={height - size}
                height={Math.max(size, 0.5)}
                className={position === drawn.length - 1 ? "fill-primary" : "fill-primary/40"}
              >
                <title>{`${formatDay(one.session_date)}: ${one.share.toFixed(2)}% delivered`}</title>
              </rect>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
