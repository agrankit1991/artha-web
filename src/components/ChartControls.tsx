/**
 * Choosing how a price chart is drawn and what is drawn over it.
 *
 * Two decisions, kept apart because they are two: the shape the price
 * itself takes, and what is laid on top of it. Turning everything in the
 * second group off leaves a clean chart, which is the setting people reach
 * for most often and the reason nothing here is mandatory.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The shape the price itself is drawn in. */
export type ChartStyle = "candles" | "line" | "area";

/** Something that can be laid over or under the price. */
export type Overlay = "sma_20" | "sma_50" | "sma_200" | "volume" | "rsi";

/** Every overlay, in the order they are offered. */
export const OVERLAYS: { key: Overlay; label: string; title: string }[] = [
  { key: "sma_20", label: "SMA 20", title: "Twenty-session moving average" },
  { key: "sma_50", label: "SMA 50", title: "Fifty-session moving average" },
  { key: "sma_200", label: "SMA 200", title: "Two-hundred-session moving average" },
  { key: "volume", label: "Volume", title: "What traded each session" },
  { key: "rsi", label: "RSI", title: "Relative strength index, in a band of its own" },
];

const STYLES: { key: ChartStyle; label: string }[] = [
  { key: "candles", label: "Candles" },
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
];

interface ChartControlsProps {
  style: ChartStyle;
  overlays: Overlay[];
  onStyle: (style: ChartStyle) => void;
  onOverlays: (overlays: Overlay[]) => void;
  className?: string;
}

/**
 * Offer the shape and the overlays.
 *
 * @param props - What is chosen now, and what to call when it changes.
 * @returns The controls.
 */
export function ChartControls({
  style,
  overlays,
  onStyle,
  onOverlays,
  className,
}: ChartControlsProps): React.JSX.Element {
  const showing = new Set(overlays);
  const toggle = (overlay: Overlay): void => {
    const next = new Set(showing);
    if (next.has(overlay)) {
      next.delete(overlay);
    } else {
      next.add(overlay);
    }
    // Reported in the offered order rather than the order they were
    // pressed, so the same set always draws the same way round.
    onOverlays(OVERLAYS.map((one) => one.key).filter((key) => next.has(key)));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex gap-1" role="group" aria-label="Chart style">
        {STYLES.map((option) => (
          <Button
            key={option.key}
            size="sm"
            variant={option.key === style ? "secondary" : "ghost"}
            aria-pressed={option.key === style}
            onClick={() => {
              onStyle(option.key);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Indicators">
        {OVERLAYS.map((overlay) => (
          <Button
            key={overlay.key}
            size="sm"
            variant={showing.has(overlay.key) ? "secondary" : "ghost"}
            aria-pressed={showing.has(overlay.key)}
            title={overlay.title}
            onClick={() => {
              toggle(overlay.key);
            }}
          >
            {overlay.label}
          </Button>
        ))}
        {overlays.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            title="Clear everything drawn over the price"
            onClick={() => {
              onOverlays([]);
            }}
          >
            Clean
          </Button>
        )}
      </div>
    </div>
  );
}
