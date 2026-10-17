/**
 * A month of the market calendar as a grid: weeks down, Monday to Sunday across.
 *
 * Each day is a button, so a keyboard reader moves through the month as a
 * pointer does, and choosing one shows its events in full beside the grid.
 * A day names its first few events, the most telling first, counts its
 * offerings as one line (there can be dozens, most on the SME board) and
 * counts the rest; a phone's narrow cell shows only their colours, which
 * is all seven columns can hold at that width. A day the equity market is shut is shaded and says so, since
 * "is the market open" is the first thing a calendar is opened for.
 */

import type { CalendarEvent } from "@/api/client";
import { EVENT_COLOURS } from "@/lib/chartPalette";
import { daySummary, eventsOn, isHoliday, isWeekend, monthGrid, monthOf } from "@/lib/calendar";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How many events a day names before counting the rest. */
const SHOWN = 3;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface CalendarMonthProps {
  /** The month, as `YYYY-MM`. */
  month: string;
  /** Its events, in the order they fall; null while they load. */
  events: readonly CalendarEvent[] | null;
  /** India's date today, marked on the grid. */
  today: string;
  /** The day chosen, if any. */
  selected: string | null;
  /** Told which day was chosen. */
  onSelect: (day: string) => void;
}

/**
 * Draw the month.
 *
 * @param props - The month, its events, today, the chosen day and what to tell on a choice.
 * @returns The grid.
 */
export function CalendarMonth({
  month,
  events,
  today,
  selected,
  onSelect,
}: CalendarMonthProps): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(month)
          .flat()
          .map((day) => (
            <Day
              key={day}
              day={day}
              events={events === null ? null : eventsOn(events, day)}
              inMonth={monthOf(day) === month}
              isToday={day === today}
              isSelected={day === selected}
              onSelect={onSelect}
            />
          ))}
      </div>
    </div>
  );
}

interface DayProps {
  day: string;
  events: CalendarEvent[] | null;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (day: string) => void;
}

/**
 * One day's cell.
 *
 * @param props - The day, its events and how it stands.
 * @returns The cell, a button.
 */
function Day({ day, events, inMonth, isToday, isSelected, onSelect }: DayProps): React.JSX.Element {
  const listed = events ?? [];
  const shut = isHoliday(listed);
  const { named, offerings, more } = daySummary(listed, SHOWN);
  const ipos = offerings === 0 ? null : `${String(offerings)} ${offerings === 1 ? "IPO" : "IPOs"}`;
  const said = [
    ...named.map((event) => event.title),
    ...(ipos === null ? [] : [ipos]),
    ...(more > 0 ? [`${String(more)} more`] : []),
  ];
  const label = [formatDay(day), shut ? "market closed" : null, said.join("; ") || "no events"]
    .filter((part) => part !== null)
    .join(": ");
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => {
        onSelect(day);
      }}
      className={cn(
        "flex min-h-16 min-w-0 flex-col gap-1 border-b border-r p-1 text-left align-top transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
        !inMonth && "text-muted-foreground/60",
        (isWeekend(day) || shut) && "bg-muted/40",
        isSelected && "bg-accent",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "tabular inline-flex size-6 items-center justify-center rounded-full text-xs",
            isToday && "bg-primary font-semibold text-primary-foreground",
          )}
        >
          {Number(day.slice(8))}
        </span>
        {shut && (
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            Closed
          </span>
        )}
      </span>
      <span aria-hidden className="flex flex-wrap gap-1 sm:hidden">
        {named.map((event, index) => (
          <span
            key={`${event.title}-${String(index)}`}
            className="size-1.5 rounded-full"
            style={{ backgroundColor: EVENT_COLOURS[event.group] }}
          />
        ))}
        {ipos !== null && (
          <span className="size-1.5 rounded-full" style={{ backgroundColor: EVENT_COLOURS.ipo }} />
        )}
      </span>
      <span aria-hidden className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        {named.map((event, index) => (
          <span
            key={`${event.title}-${String(index)}`}
            className={cn(
              "flex min-w-0 items-center gap-1 text-[11px] leading-tight",
              event.certainty === "expected" && "italic text-muted-foreground",
            )}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: EVENT_COLOURS[event.group] }}
            />
            <span className="truncate">{event.title}</span>
          </span>
        ))}
        {ipos !== null && (
          <span className="flex min-w-0 items-center gap-1 text-[11px] leading-tight">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: EVENT_COLOURS.ipo }}
            />
            <span className="truncate">{ipos}</span>
          </span>
        )}
        {more > 0 && <span className="text-[11px] text-muted-foreground">+{more} more</span>}
      </span>
    </button>
  );
}
