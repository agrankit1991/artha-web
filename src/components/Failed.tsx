/**
 * Something went wrong, said plainly.
 *
 * The platform's own words for what failed, in a box that cannot be
 * mistaken for an empty result. An empty list and a failed request look
 * alike if both are rendered as nothing.
 */

import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface FailedProps {
  /** What the platform said. */
  message: string;
  className?: string;
}

/**
 * Render the failure.
 *
 * @param props - What failed.
 * @returns The state.
 */
export function Failed({ message, className }: FailedProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
