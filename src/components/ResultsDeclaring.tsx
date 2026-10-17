/**
 * Which companies declare their results on which day, over the next two weeks.
 *
 * From the board meetings companies notify to NSE, days before they meet:
 * the owner asked to see results being declared in the coming days
 * (2026-10-17). A busy day in season has a hundred, so each day names its
 * first dozen and counts the rest; the calendar's day lists them all. The
 * notices are known only from the day the platform began reading them, and
 * the list says so.
 */

import { Link } from "react-router-dom";

import type { CalendarEvent } from "@/api/client";
import { companyOf, eventDays } from "@/lib/calendar";
import { formatCount, formatDay } from "@/lib/format";
import { companyPath } from "@/lib/paths";

/** How many companies a day names before counting the rest. */
const NAMED = 12;

interface ResultsDeclaringProps {
  /** The coming days' results meetings, in the order they fall; null while they load. */
  meetings: readonly CalendarEvent[] | null;
  /** India's date of the earliest notice read; null before any. */
  noticesSince: string | null;
}

/**
 * Draw the coming results days.
 *
 * @param props - The meetings and since when notices are known.
 * @returns The list.
 */
export function ResultsDeclaring({
  meetings,
  noticesSince,
}: ResultsDeclaringProps): React.JSX.Element {
  // The meetings come in the order they fall, so each day opens a group of its own.
  const days: { day: string; label: string; declaring: CalendarEvent[] }[] = [];
  for (const meeting of meetings ?? []) {
    const last = days.at(-1);
    if (last?.day === meeting.day) {
      last.declaring.push(meeting);
    } else {
      days.push({ day: meeting.day, label: eventDays(meeting), declaring: [meeting] });
    }
  }
  return (
    <div className="space-y-2">
      {meetings === null ? (
        <p className="text-sm text-muted-foreground">Reading the notices...</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No company has notified a results meeting for the next two weeks yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {days.map(({ day, label, declaring }) => (
            <li key={day} className="flex flex-col gap-1 p-2 sm:flex-row sm:gap-3">
              <span className="tabular w-32 shrink-0 text-sm font-medium">
                {label}
                <span className="block text-xs font-normal text-muted-foreground">
                  {formatCount(declaring.length)} {declaring.length === 1 ? "company" : "companies"}
                </span>
              </span>
              <span className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
                {declaring.slice(0, NAMED).map((meeting) => (
                  <Company key={meeting.link ?? meeting.title} meeting={meeting} />
                ))}
                {declaring.length > NAMED && (
                  <span className="text-muted-foreground">
                    +{formatCount(declaring.length - NAMED)} more: choose the day on the calendar
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {noticesSince === null
          ? "From companies' notices of board meetings to NSE, read every hour; none is read yet."
          : `From companies' notices of board meetings to NSE, read every hour since ${formatDay(noticesSince)}: a meeting notified before then is missing.`}
      </p>
    </div>
  );
}

/**
 * One company, leading to its page when it has one.
 *
 * @param props - Its results meeting.
 * @returns Its symbol or name.
 */
function Company({ meeting }: { meeting: CalendarEvent }): React.JSX.Element {
  const name = companyOf(meeting);
  return meeting.subject === null || meeting.symbol === null ? (
    <span>{name}</span>
  ) : (
    <Link
      to={companyPath(meeting.subject, meeting.symbol)}
      className="text-primary hover:underline"
    >
      {name}
    </Link>
  );
}
