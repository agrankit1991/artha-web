/**
 * A note set apart from the page: something to know, to watch, or that went
 * wrong.
 *
 * One component, so a note looks the same wherever it is and its colour
 * says one thing: teal is information, amber is worth a look (caution is
 * never used for plain information), red is a failure, and a spinner says
 * something is under way. Each tone carries its icon, so none is said by
 * colour alone.
 */

import { CircleAlert, Info, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** What kind of note it is. */
export type CalloutTone = "info" | "caution" | "danger" | "progress";

const LOOKS: Record<
  CalloutTone,
  { box: string; icon: typeof Info; mark: string; role: "note" | "status" | "alert" }
> = {
  info: { box: "border-primary/25 bg-primary/5", icon: Info, mark: "text-primary", role: "note" },
  caution: {
    box: "border-caution/40 bg-caution/10",
    icon: TriangleAlert,
    mark: "text-caution",
    role: "note",
  },
  danger: {
    box: "border-destructive/40 bg-destructive/5 text-destructive",
    icon: CircleAlert,
    mark: "",
    role: "alert",
  },
  progress: {
    box: "border-border bg-muted/50",
    icon: Loader2,
    mark: "animate-spin text-muted-foreground",
    role: "status",
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  /**
   * How a screen reader treats it; by default a failure is an alert, work
   * under way is a status, and anything else is a note.
   */
  role?: "note" | "status" | "alert";
  /** Something to do about it, at the far end. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Render the note.
 *
 * @param props - Its tone, what it says, and what can be done about it.
 * @returns The note.
 */
export function Callout({
  tone = "info",
  role,
  action,
  children,
  className,
}: CalloutProps): React.JSX.Element {
  const look = LOOKS[tone];
  return (
    <div
      role={role ?? look.role}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm",
        look.box,
        className,
      )}
    >
      <look.icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", look.mark)} />
      <div className="min-w-0 flex-1">{children}</div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
