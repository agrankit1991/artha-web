/**
 * A word of explanation beside a term, for the reader who needs it.
 *
 * "SME", "ISIN", "cut-off price": each is obvious to one reader and opaque
 * to the next, and a page cannot tell which it has. So the term stays
 * short and the explanation waits behind a small mark, shown on hover or
 * focus. The previous project did this well and it is kept.
 *
 * The application's own rather than Radix's, for the reason recorded in
 * the repository notes: a tooltip nobody can write a test for is a tooltip
 * nobody notices breaking.
 */

import { Info } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { Floating } from "@/components/Floating";

import { cn } from "@/lib/utils";

interface HintProps {
  /** The explanation. */
  text: string;
  /** What is being explained; the mark follows it. Optional, for a bare mark. */
  children?: React.ReactNode;
  /**
   * What the mark explains, named for a screen reader, when the children
   * are not plain words. Eight marks on a panel all called "What this
   * means" are eight buttons nobody can tell apart.
   */
  term?: string;
  className?: string;
  /**
   * Which way the explanation opens from the mark: towards the end of the
   * line by default, towards its start for a mark near the right edge (a
   * right-aligned column's header). Either way it floats above the page,
   * so no table or scrolling box can cut it off (`Floating`).
   */
  side?: "start" | "end";
}

/**
 * Render the term and its explanation.
 *
 * @param props - The term and what it means.
 * @returns The term with a mark, and the explanation while shown.
 */
export function Hint({
  text,
  children,
  term,
  className,
  side = "end",
}: HintProps): React.JSX.Element {
  const [showing, setShowing] = useState(false);
  const id = useId();
  const mark = useRef<HTMLButtonElement>(null);
  const show = (): void => {
    setShowing(true);
  };
  // Stable, since the floating bubble listens for scrolls with it while open.
  const hide = useCallback((): void => {
    setShowing(false);
  }, []);
  return (
    <span className={cn("relative inline-flex items-center gap-1", className)}>
      {children}
      <button
        ref={mark}
        type="button"
        aria-label={`What ${term ?? (typeof children === "string" ? children : "this")} means`}
        aria-describedby={showing ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {showing && (
        <Floating
          anchor={mark}
          side={side}
          onDismiss={hide}
          id={id}
          className="z-50 w-64 max-w-[calc(100vw-16px)] rounded-md border bg-popover p-2 text-left text-xs font-normal normal-case leading-relaxed text-popover-foreground shadow-lg"
        >
          {text}
        </Floating>
      )}
    </span>
  );
}
