/**
 * Calendar events in full: what each is, how sure its date is, and who says so.
 *
 * Used for the day chosen on the grid and for what comes next. An event
 * whose date is not yet announced says "Expected", with why on its mark,
 * and every event names its source and links to where its date is
 * published, so a reader can check a date against its publisher.
 */

import { Link } from "react-router-dom";

import type { CalendarEvent } from "@/api/client";
import { Hint } from "@/components/Hint";
import { Badge } from "@/components/ui/badge";
import { EXPECTED_HINT, eventDays, groupLabel, timeInIndia } from "@/lib/calendar";
import { EVENT_COLOURS } from "@/lib/chartPalette";
import { MARKS } from "@/lib/entities";
import { ipoPath } from "@/lib/paths";

interface CalendarEventListProps {
  /** The events, in the order they fall. */
  events: readonly CalendarEvent[];
  /** Say each event's day, for a list spanning several. */
  showDays?: boolean;
  /** What to say when there are none. */
  empty: string;
}

/**
 * Draw the events.
 *
 * @param props - The events, whether to say their days, and what to say when there are none.
 * @returns The list, or the empty message.
 */
export function CalendarEventList({
  events,
  showDays = false,
  empty,
}: CalendarEventListProps): React.JSX.Element {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {events.map((event, index) => (
        <li key={`${event.day}-${event.title}-${String(index)}`} className="space-y-1 p-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {showDays && (
              <span className="tabular font-medium text-foreground">{eventDays(event)}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: EVENT_COLOURS[event.group] }}
              />
              {groupLabel(event.group)}
            </span>
            {!showDays && event.last_day !== null && <span>{eventDays(event)}</span>}
            {event.at !== null && <span className="tabular">{timeInIndia(event.at)}</span>}
            {event.certainty === "expected" && (
              <Hint text={EXPECTED_HINT} term="Expected">
                <Badge variant="outline">Expected</Badge>
              </Hint>
            )}
          </div>
          <p className="text-sm font-medium">
            {event.subject !== null && event.group === "ipo" ? (
              <Link to={ipoPath(event.subject)} className="text-primary hover:underline">
                {event.title}
              </Link>
            ) : (
              event.title
            )}
          </p>
          <p className="text-sm text-muted-foreground">{event.detail}</p>
          {event.source !== null && (
            <p className="text-xs text-muted-foreground">
              {event.link === null ? (
                `Source: ${event.source}`
              ) : (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  Source: {event.source}
                  <MARKS.external aria-hidden="true" className="size-3" />
                </a>
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
