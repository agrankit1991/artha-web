/**
 * A handle on a panel's left edge that drags its width, as TradingView's
 * watchlist is widened beside its chart (the owner, 2026-11-08: "the company
 * list component should be expandable like i can increase the size of it").
 *
 * Dragged left the panel widens, right it narrows; from the keyboard, Left
 * and Right do the same a step at a time. It is a separator in ARIA's sense,
 * its value the width, so a screen reader says how wide the panel is. The
 * drag is followed on the window, not the handle, so it keeps up with a
 * pointer that outruns an eight-pixel strip.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface WidthHandleProps {
  /** What it resizes, for a reader who cannot see it. */
  label: string;
  /** The panel's width now, in pixels. */
  width: number;
  least: number;
  most: number;
  /** Called as it is dragged (`done` false), and once more when let go or keyed (`done` true). */
  onResize: (width: number, done: boolean) => void;
  className?: string;
}

/** How far a key press moves it, in pixels. */
const STEP = 16;

/**
 * Render the handle.
 *
 * @param props - The width, its bounds, and what to call as it changes.
 * @returns The handle.
 */
export function WidthHandle({
  label,
  width,
  least,
  most,
  onResize,
  className,
}: WidthHandleProps): React.JSX.Element {
  // Where the drag began: the pointer's place and the width then.
  const [from, setFrom] = useState<{ x: number; width: number } | null>(null);

  useEffect(() => {
    if (from === null) {
      return undefined;
    }
    // Leftwards is wider: the handle is on the panel's left edge.
    const at = (event: MouseEvent): number =>
      Math.min(most, Math.max(least, Math.round(from.width + from.x - event.clientX)));
    const move = (event: MouseEvent): void => {
      onResize(at(event), false);
    };
    const release = (event: MouseEvent): void => {
      onResize(at(event), true);
      setFrom(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
    };
  }, [from, least, most, onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={least}
      aria-valuemax={most}
      tabIndex={0}
      title="Drag to widen or narrow"
      onPointerDown={(event) => {
        // No text is selected as the pointer sweeps across the page.
        event.preventDefault();
        setFrom({ x: event.clientX, width });
      }}
      onKeyDown={(event) => {
        const step = event.key === "ArrowLeft" ? STEP : event.key === "ArrowRight" ? -STEP : 0;
        if (step !== 0) {
          event.preventDefault();
          onResize(Math.min(most, Math.max(least, width + step)), true);
        }
      }}
      className={cn(
        "group flex w-2 cursor-col-resize touch-none justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-full w-px bg-border transition-colors group-hover:bg-primary",
          from !== null && "bg-primary",
        )}
      />
    </div>
  );
}
