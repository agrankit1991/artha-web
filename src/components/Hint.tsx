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
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

interface HintProps {
  /** The explanation. */
  text: string;
  /** What is being explained; the mark follows it. Optional, for a bare mark. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Render the term and its explanation.
 *
 * @param props - The term and what it means.
 * @returns The term with a mark, and the explanation while shown.
 */
export function Hint({ text, children, className }: HintProps): React.JSX.Element {
  const [showing, setShowing] = useState(false);
  const id = useId();
  const show = (): void => {
    setShowing(true);
  };
  const hide = (): void => {
    setShowing(false);
  };
  return (
    <span className={cn("relative inline-flex items-center gap-1", className)}>
      {children}
      <button
        type="button"
        aria-label="What this means"
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
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover p-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
