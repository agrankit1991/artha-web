/**
 * One session drawn as a candle.
 *
 * A price and a percentage say where the session ended; they say nothing
 * about how it got there. A session that opened at its low and closed at
 * its high is a different event from one that opened at its high, fell all
 * day and closed level -- and both print the same change.
 *
 * Inline SVG for the same reason as the sparkline: this is a line and a
 * rectangle.
 */

import { toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MiniCandlestickProps {
  open: string | null | undefined;
  high: string | null | undefined;
  low: string | null | undefined;
  close: string | null | undefined;
  className?: string;
}

const WIDTH = 16;
const HEIGHT = 34;
const BODY_WIDTH = 10;
const MINIMUM_BODY = 1.5;

/**
 * Draw one session's range and its body.
 *
 * @param props - The four prices of the session.
 * @returns The candle, or nothing drawn when a price is missing.
 */
export function MiniCandlestick({
  open,
  high,
  low,
  close,
  className,
}: MiniCandlestickProps): React.JSX.Element {
  const sessionOpen = toNumber(open);
  const sessionHigh = toNumber(high);
  const sessionLow = toNumber(low);
  const sessionClose = toNumber(close);

  if (
    sessionOpen === null ||
    sessionHigh === null ||
    sessionLow === null ||
    sessionClose === null
  ) {
    return (
      <div
        className={cn("h-[34px] w-4 rounded bg-muted/40", className)}
        role="img"
        aria-label="Session shape unavailable"
      />
    );
  }

  // A session that never moved would divide by nought; drawn as a flat line
  // across the middle, which is what such a session looks like.
  const span = sessionHigh - sessionLow || 1;
  const y = (price: number): number => HEIGHT - ((price - sessionLow) / span) * HEIGHT;

  const bodyTop = Math.min(y(sessionOpen), y(sessionClose));
  const bodyHeight = Math.max(Math.abs(y(sessionOpen) - y(sessionClose)), MINIMUM_BODY);
  const rising = sessionClose >= sessionOpen;

  return (
    <svg
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      className={cn("h-[34px] w-4 shrink-0", className)}
      role="img"
      aria-label={rising ? "Session closed at or above its open" : "Session closed below its open"}
    >
      <line
        x1={WIDTH / 2}
        x2={WIDTH / 2}
        y1={y(sessionHigh)}
        y2={y(sessionLow)}
        className={cn(rising ? "stroke-gain" : "stroke-loss")}
        strokeWidth={1.5}
      />
      <rect
        x={(WIDTH - BODY_WIDTH) / 2}
        y={bodyTop}
        width={BODY_WIDTH}
        height={bodyHeight}
        className={cn(rising ? "fill-gain" : "fill-loss")}
        rx={1}
      />
    </svg>
  );
}
