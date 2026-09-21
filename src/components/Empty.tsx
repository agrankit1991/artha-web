/**
 * Nothing to show, and why.
 *
 * Said once, the same way everywhere: what would be here, and the reason
 * it is not. "No data" tells a reader nothing; "no five-year record --
 * this scheme launched in 2023" tells them everything.
 */

import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyProps {
  /** What would be here. */
  title: string;
  /** Why it is not. */
  reason?: string;
  className?: string;
}

/**
 * Render the state.
 *
 * @param props - What is missing and why.
 * @returns The state.
 */
export function Empty({ title, reason, className }: EmptyProps): React.JSX.Element {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center",
        className,
      )}
    >
      <Inbox aria-hidden="true" className="mb-1 h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {reason !== undefined && <p className="text-xs text-muted-foreground">{reason}</p>}
    </div>
  );
}
