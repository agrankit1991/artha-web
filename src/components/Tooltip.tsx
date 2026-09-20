/**
 * The rest of something that has been cut short.
 *
 * A news summary is clamped to two lines so every card is the same height;
 * this is how the other three lines are read without the card growing and
 * shoving the grid around. It floats above the layout rather than taking
 * part in it, so nothing moves when it appears.
 *
 * This application's own rather than Radix's, for the reason recorded in
 * the repository notes: Radix's popovers open on pointer events jsdom does
 * not implement, and a tooltip nobody can write a test for is a tooltip
 * nobody notices breaking.
 */

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

interface TooltipProps {
  /** The full text, shown on hover. */
  content: string;
  /** What is shown in the layout, cut short. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Show the whole of something on hover, without disturbing the page.
 *
 * @param props - The full text and the shortened form of it.
 * @returns The wrapped content.
 */
export function Tooltip({ content, children, className }: TooltipProps): React.JSX.Element {
  const [showing, setShowing] = useState(false);
  const bubbleId = useId();

  const show = (): void => {
    setShowing(true);
  };
  const hide = (): void => {
    setShowing(false);
  };

  return (
    <span
      className={cn("relative block", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      // Reachable from the keyboard as well as the pointer: a summary that
      // can only be read by hovering cannot be read at all by somebody
      // tabbing through the page.
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-describedby={showing ? bubbleId : undefined}
    >
      {children}
      {showing && (
        <span
          id={bubbleId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 block w-full rounded-md border bg-popover p-2 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}
