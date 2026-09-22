/**
 * What a page is about, said the same way on every page.
 *
 * The name, then what identifies it, then how it is classified, then what
 * can be done with it. A reader who has learnt the shape on one entity
 * page can find the ISIN on another without looking for it.
 *
 * The actions sit at the far end rather than under the title, so that a
 * long name and a short one put the buttons in the same place.
 */

import type { EntityKind } from "@/lib/entities";
import { ENTITIES } from "@/lib/entities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /**
   * What kind of thing the page is about. Given one, its icon leads the
   * title -- which is how a reader arriving from a search result knows
   * they landed on the kind of page they asked for.
   */
  kind?: EntityKind;
  /** What identifies it: an ISIN, a scheme code, a count of members. */
  identifiers?: React.ReactNode;
  /** How it is classified: exchanges, sector, plan, board. */
  badges?: React.ReactNode;
  /** What can be done with it, at the far end of the line. */
  actions?: React.ReactNode;
  /** What it is, in the publisher's own words. */
  description?: string | null | undefined;
  /** How many things the page lists, as the previous project's badge said, e.g. `217 indices`. */
  count?: string | undefined;
  className?: string;
}

/**
 * Render the header.
 *
 * @param props - What the page is about and what can be done with it.
 * @returns The header.
 */
export function PageHeader({
  title,
  kind,
  identifiers,
  badges,
  actions,
  description,
  count,
  className,
}: PageHeaderProps): React.JSX.Element {
  const Mark = kind === undefined ? null : ENTITIES[kind].icon;
  return (
    <header className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {Mark !== null && (
              <Mark aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            {/* The previous project's title treatment: the accent fading to a
                lighter tint of itself, so each page's name carries the theme. */}
            <h1 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {title}
            </h1>
            {count !== undefined && (
              <Badge variant="secondary" className="text-sm">
                {count}
              </Badge>
            )}
            {badges}
          </div>
          {identifiers !== undefined && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {identifiers}
            </div>
          )}
        </div>
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description != null && description !== "" && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
