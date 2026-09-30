/**
 * Where an offering stands: upcoming, open, closed or listed.
 *
 * Drawn in the brand's teal and neutrals only. Open was once the colour of
 * a rise and closed the colour of caution, which said an open offering was
 * good news and a closed one a warning; neither is. Open is the solid one
 * because it is the one with a deadline. Every badge carries its word and
 * an icon, so the colour says nothing on its own.
 */

import { CheckCircle2, Clock, DoorOpen, Lock } from "lucide-react";

import type { IpoStatus } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import type { Icon } from "@/lib/entities";
import { cn } from "@/lib/utils";

/** What each status is called, drawn as, and tinted. */
export const STATUSES: Record<IpoStatus, { label: string; icon: Icon; tint: string }> = {
  UPCOMING: {
    label: "Upcoming",
    icon: Clock,
    tint: "border-primary/40 bg-primary/10 text-primary",
  },
  OPEN: {
    label: "Open",
    icon: DoorOpen,
    tint: "border-primary bg-primary text-primary-foreground",
  },
  CLOSED: { label: "Closed", icon: Lock, tint: "border-border bg-muted text-foreground" },
  LISTED: { label: "Listed", icon: CheckCircle2, tint: "border-border text-muted-foreground" },
};

/**
 * Render the badge.
 *
 * @param props - The status.
 * @returns The badge: an icon and the status's name.
 */
export function OfferingStatus({ status }: { status: IpoStatus }): React.JSX.Element {
  const { label, icon: Mark, tint } = STATUSES[status];
  return (
    <Badge variant="outline" className={cn("gap-1", tint)}>
      <Mark aria-hidden="true" className="h-3 w-3" />
      {label}
    </Badge>
  );
}
