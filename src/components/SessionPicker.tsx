/**
 * Reading a page as it stood on a past session.
 *
 * A date box bounded to the sessions the platform holds, with the day it
 * is set to said plainly beside it and a way back to today. A date that
 * was not a session -- a Sunday, a holiday -- is moved to the last
 * session before it, because the reader means "the market as of then",
 * not "a day nothing happened".
 */

import { CalendarDays, X } from "lucide-react";
import { useCallback } from "react";

import type { SessionSummary } from "@/api/client";
import { fetchSessions } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { formatDay } from "@/lib/format";

interface SessionPickerProps {
  /** The session the page is read as of, or null for the latest. */
  asOf: string | null;
  onChange: (asOf: string | null) => void;
  className?: string;
}

/**
 * Render the picker.
 *
 * @param props - The session chosen and how to change it.
 * @returns The picker.
 */
export function SessionPicker({
  asOf,
  onChange,
  className,
}: SessionPickerProps): React.JSX.Element {
  const load = useCallback(() => fetchSessions(), []);
  const sessions = useResource(load);
  const held = sessions.data ?? [];
  const newest = held[0]?.day;
  const oldest = held.at(-1)?.day;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <CalendarDays aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">As of</span>
          <input
            type="date"
            aria-label="As of"
            value={asOf ?? ""}
            min={oldest}
            max={newest}
            onChange={(event) => {
              const chosen = event.target.value;
              onChange(chosen === "" ? null : nearestSession(chosen, held));
            }}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          />
        </label>
        {asOf !== null && (
          <>
            <span className="text-xs text-muted-foreground">
              Read as it stood on {formatDay(asOf)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Back to today"
              onClick={() => {
                onChange(null);
              }}
            >
              <X aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
              Today
            </Button>
          </>
        )}
        {sessions.error !== null && <span className="text-xs text-loss">{sessions.error}</span>}
      </div>
    </div>
  );
}

/**
 * The last session on or before a date.
 *
 * @param chosen - The date, as the box gives it.
 * @param sessions - The sessions held, newest first.
 * @returns The session, or the date itself when no sessions are known.
 */
export function nearestSession(chosen: string, sessions: SessionSummary[]): string {
  const found = sessions.find((one) => one.day <= chosen) ?? sessions.at(-1);
  return found === undefined ? chosen : found.day;
}
