/**
 * Choosing how a price chart is drawn and what is drawn over it.
 *
 * Two decisions, and two menus, because as a row of buttons they were
 * eight controls competing with the chart for attention. A menu shows the
 * choice made and hides the rest until somebody wants them, which is the
 * right trade for settings that are changed occasionally and read
 * constantly.
 *
 * Turning everything in the second menu off leaves a clean chart. That is
 * the setting people reach for most often, and the reason nothing here is
 * mandatory.
 */

import { CandlestickChart, Check, ChevronDown, LineChart, Layers } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/Menu";
import { cn } from "@/lib/utils";

/** The shape the price itself is drawn in. */
export type ChartStyle = "candles" | "line" | "area";

/** Something that can be laid over or under the price. */
export type Overlay = "sma_20" | "sma_50" | "sma_200" | "volume" | "rsi";

/** Every overlay, in the order they are offered. */
export const OVERLAYS: { key: Overlay; label: string; hint: string }[] = [
  { key: "sma_20", label: "SMA 20", hint: "Twenty-session average" },
  { key: "sma_50", label: "SMA 50", hint: "Fifty-session average" },
  { key: "sma_200", label: "SMA 200", hint: "Two-hundred-session average" },
  { key: "volume", label: "Volume", hint: "What traded each session" },
  { key: "rsi", label: "RSI", hint: "Relative strength, in a band of its own" },
];

/** Keyed rather than a list, so looking one up cannot come back empty. */
const STYLES: Record<ChartStyle, { label: string; icon: typeof LineChart }> = {
  candles: { label: "Candles", icon: CandlestickChart },
  line: { label: "Line", icon: LineChart },
  area: { label: "Area", icon: Layers },
};

/** The shapes, in the order they are offered. */
const SHAPES: ChartStyle[] = ["candles", "line", "area"];

interface ChartControlsProps {
  style: ChartStyle;
  overlays: Overlay[];
  onStyle: (style: ChartStyle) => void;
  onOverlays: (overlays: Overlay[]) => void;
  className?: string;
}

const TRIGGER = "h-9 gap-2 rounded-md border px-3 hover:bg-accent";

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
  const chosen = STYLES[style];

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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Menu
        label="Chart style"
        triggerClassName={TRIGGER}
        trigger={
          <>
            <chosen.icon className="h-4 w-4" />
            <span>{chosen.label}</span>
            <ChevronDown className="h-3 w-3" />
          </>
        }
      >
        {(close) => (
          <>
            <MenuLabel>Draw the price as</MenuLabel>
            {SHAPES.map((shape) => {
              const Icon = STYLES[shape].icon;
              return (
                <MenuItem
                  key={shape}
                  selected={shape === style}
                  onSelect={() => {
                    onStyle(shape);
                    close();
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{STYLES[shape].label}</span>
                  <Check className={cn("h-4 w-4", shape === style ? "opacity-100" : "opacity-0")} />
                </MenuItem>
              );
            })}
          </>
        )}
      </Menu>

      <Menu
        label="Indicators"
        triggerClassName={TRIGGER}
        trigger={
          <>
            <Layers className="h-4 w-4" />
            <span>
              Indicators
              {overlays.length > 0 && (
                <span className="ml-1 text-muted-foreground">({overlays.length})</span>
              )}
            </span>
            <ChevronDown className="h-3 w-3" />
          </>
        }
      >
        {() => (
          <>
            <MenuLabel>Draw over the price</MenuLabel>
            {OVERLAYS.map((overlay) => (
              <MenuItem
                key={overlay.key}
                selected={showing.has(overlay.key)}
                // The menu stays open: choosing indicators is usually
                // choosing several, and a menu that shuts after each one
                // has to be opened once per choice.
                onSelect={() => {
                  toggle(overlay.key);
                }}
              >
                <span className="flex-1">
                  <span className="block">{overlay.label}</span>
                  <span className="block text-xs text-muted-foreground">{overlay.hint}</span>
                </span>
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    showing.has(overlay.key) ? "opacity-100" : "opacity-0",
                  )}
                />
              </MenuItem>
            ))}
            {overlays.length > 0 && (
              <>
                <MenuSeparator />
                <MenuItem
                  onSelect={() => {
                    onOverlays([]);
                  }}
                >
                  Clear all
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
    </div>
  );
}
