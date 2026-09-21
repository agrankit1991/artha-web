/**
 * What a section of a page is about.
 *
 * An icon, a title, a line on what the section answers, and any controls
 * that change it, laid out the same way in every section of every page.
 * The controls sit at the far end so a range selector is in the same place
 * over a price chart and over a breadth chart.
 */

import type { Icon } from "@/lib/entities";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** What the section answers, in a line. */
  description?: string;
  icon?: Icon;
  /** Controls that change what the section shows. */
  actions?: React.ReactNode;
  /** The heading's id, for a section that labels itself by it. */
  id?: string;
  className?: string;
}

/**
 * Render the header.
 *
 * @param props - What the section is about and what changes it.
 * @returns The header.
 */
export function SectionHeader({
  title,
  description,
  icon: Mark,
  actions,
  id,
  className,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
          {Mark !== undefined && <Mark aria-hidden="true" className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {description !== undefined && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
