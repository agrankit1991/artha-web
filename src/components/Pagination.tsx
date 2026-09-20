/**
 * Moving between pages.
 *
 * One control, so every paged list in this application counts, labels and
 * behaves the same way. The page numbers are worked out in `lib/pagination`
 * and only drawn here.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type PageSlot, pageSlots, pageSummary } from "@/lib/pagination";

interface PaginationProps {
  /** How many were skipped to reach the page being shown. */
  offset: number;
  /** How many a page carries at most. */
  limit: number;
  /** How many there are altogether. */
  total: number;
  /** Called with the offset of the page to move to. */
  onChange: (offset: number) => void;
}

/**
 * Draw the control.
 *
 * @param props - Where the reader is, how much there is, and where to go.
 * @returns The control, or nothing when there is only one page.
 */
export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: PaginationProps): React.JSX.Element | null {
  const pages = Math.ceil(total / limit);
  const current = Math.floor(offset / limit) + 1;
  const slots = pageSlots(current, pages);

  if (slots.length === 0) {
    return null;
  }

  const shown = Math.min(limit, total - offset);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pages">
      <span className="text-sm text-muted-foreground">{pageSummary(offset, shown, total)}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={current === 1}
          aria-label="Previous page"
          onClick={() => {
            onChange((current - 2) * limit);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {slots.map((slot, index) => (
          <PageButton
            key={slot === "gap" ? `gap-${String(index)}` : slot}
            slot={slot}
            current={current}
            onChoose={(page) => {
              onChange((page - 1) * limit);
            }}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={current === pages}
          aria-label="Next page"
          onClick={() => {
            onChange(current * limit);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

/** One page number, or the mark for the pages left out. */
function PageButton({
  slot,
  current,
  onChoose,
}: {
  slot: PageSlot;
  current: number;
  onChoose: (page: number) => void;
}): React.JSX.Element {
  if (slot === "gap") {
    return (
      <span className="px-1 text-muted-foreground" aria-hidden="true">
        …
      </span>
    );
  }
  return (
    <Button
      variant={slot === current ? "secondary" : "ghost"}
      size="sm"
      aria-label={`Page ${String(slot)}`}
      aria-current={slot === current ? "page" : undefined}
      onClick={() => {
        onChoose(slot);
      }}
    >
      {slot}
    </Button>
  );
}
