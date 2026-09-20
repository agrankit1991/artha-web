/**
 * Asking for the next batch of a list.
 *
 * Numbered pages suit a table somebody is looking something up in. A feed
 * is read downwards, and a reader who wants more of it wants the next few
 * under the ones they have -- not the same page replaced by a different
 * one, which loses their place every time.
 *
 * One control, so every growing list in this application counts and labels
 * itself the same way.
 */

import { Button } from "@/components/ui/button";

interface LoadMoreProps {
  /** How many are on screen. */
  shown: number;
  /** How many there are altogether. */
  total: number;
  /** Whether the next batch is on its way. */
  loading?: boolean;
  /** What to call the things being counted, plural. */
  noun?: string;
  onMore: () => void;
}

/**
 * Draw the control.
 *
 * @param props - How much is shown, how much there is, and how to ask for more.
 * @returns The control, or nothing when there is nothing to count.
 */
export function LoadMore({
  shown,
  total,
  loading = false,
  noun = "articles",
  onMore,
}: LoadMoreProps): React.JSX.Element | null {
  if (total === 0) {
    return null;
  }

  const remaining = total - shown;

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {remaining > 0
          ? `Showing ${String(shown)} of ${String(total)} ${noun}`
          : `All ${String(total)} ${noun} shown`}
      </p>
      {remaining > 0 && (
        <Button variant="outline" disabled={loading} onClick={onMore}>
          {loading ? "Loading…" : `Load more (${String(remaining)} left)`}
        </Button>
      )}
    </div>
  );
}
