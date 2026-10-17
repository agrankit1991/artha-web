/**
 * The market calendar: the Indian market's important days, a month at a time.
 *
 * The owner asked for "a calendar view for the important events for Indian
 * market" from free sources (2026-10-17) and chose its groups (the
 * exchanges' days, offerings, results, India's policy and data, and events
 * abroad), a month grid with what comes next beside it, and hand-entered
 * dates kept in the platform's code. The events are the platform's
 * (`/api/calendar`); upcoming results dates and dividends are not among
 * them, since only the exchanges publish those and NSE's terms forbid
 * collecting them automatically.
 *
 * The month, the group and the day chosen are in the address (`?month=`,
 * `?group=`, `?day=`), so a view can be kept and Back works. The grid and
 * what comes next are separate requests, so paging through months never
 * disturbs the next two weeks.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";

import { type CalendarEvent, type EventGroup, fetchCalendar } from "@/api/client";
import { CalendarEventList } from "@/components/CalendarEventList";
import { CalendarMonth } from "@/components/CalendarMonth";
import { Chooser } from "@/components/Chooser";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { ReadingGuide } from "@/components/ReadingGuide";
import { ResultsSeasonPanel } from "@/components/ResultsSeasonPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { useSearchParam, useSearchParamsWriter } from "@/hooks/useSearchParam";
import {
  EVENT_GROUPS,
  addDays,
  byImportance,
  crowdOf,
  dayName,
  eventsOn,
  eventsWithin,
  isMonth,
  gridRange,
  monthName,
  monthOf,
  shiftMonth,
} from "@/lib/calendar";
import { formatDay, todayInIndia } from "@/lib/format";

/** The crowds "what's next" counts under All, and where each is listed in full. */
const CROWDS = [
  {
    key: "results",
    one: "company declaring results",
    many: "companies declaring results",
    group: "results",
    button: "Show results",
  },
  { key: "offerings", one: "IPO event", many: "IPO events", group: "ipo", button: "Show IPOs" },
] as const;

/** How many days "what's next" covers, today included. */
const NEXT_DAYS = 14;

const GROUP_OPTIONS = [
  { key: "all", label: "All" },
  ...EVENT_GROUPS.map((group) => ({ key: group.key, label: group.label })),
] as const;

type GroupChoice = EventGroup | "all";

/**
 * Keep the events of one group, or all of them.
 *
 * @param events - The events.
 * @param group - The group chosen.
 * @returns Those shown.
 */
function shownOf(events: readonly CalendarEvent[], group: GroupChoice): CalendarEvent[] {
  return group === "all" ? [...events] : events.filter((event) => event.group === group);
}

/**
 * Render the page.
 *
 * @returns The month, the day chosen, what comes next and the results season.
 */
export function MarketCalendar(): React.JSX.Element {
  const today = todayInIndia();
  const [monthParam] = useSearchParam("month");
  const [groupParam] = useSearchParam("group", "all");
  const [dayParam] = useSearchParam("day");
  const write = useSearchParamsWriter();

  const current = monthOf(today);
  const month = isMonth(monthParam) ? monthParam : current;
  const group: GroupChoice = GROUP_OPTIONS.some((option) => option.key === groupParam)
    ? (groupParam as GroupChoice)
    : "all";
  const { start, end } = gridRange(month);
  const selected =
    dayParam >= start && dayParam <= end ? dayParam : monthOf(today) === month ? today : null;

  const loadMonth = useCallback(() => fetchCalendar(start, end), [start, end]);
  const loadNext = useCallback(() => fetchCalendar(today, addDays(today, NEXT_DAYS - 1)), [today]);
  const grid = useResource(loadMonth);
  const next = useResource(loadNext);

  const goTo = (target: string): void => {
    write({ month: target === current ? null : target, day: null });
  };
  const shown = grid.data === null ? null : shownOf(grid.data.events, group);
  const coming =
    next.data === null ? null : eventsWithin(shownOf(next.data.events, group), today, NEXT_DAYS);
  // Under All the crowds are counted, not listed: two weeks in season hold
  // hundreds of results days and dozens of offerings, which would bury the rest.
  const comingListed =
    coming === null || group !== "all" ? coming : coming.filter((one) => crowdOf(one) === null);
  const comingCrowds = CROWDS.map((crowd) => ({
    ...crowd,
    count: (coming ?? []).filter((one) => crowdOf(one) === crowd.key).length,
  })).filter((crowd) => group === "all" && crowd.count > 0);
  const declaring =
    next.data === null
      ? null
      : eventsWithin(next.data.events, today, NEXT_DAYS).filter(
          (one) => one.kind === "results_meeting",
        );
  const seasons = group === "all" || group === "results" ? (grid.data?.seasons ?? []) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Market calendar"
        description="Holidays, expiries, public offerings, results deadlines, and the policy and data days that move the market, in India and abroad. Choose a day to read its events in full."
      />

      <section aria-label="Month" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => {
                goTo(shiftMonth(month, -1));
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <h2 className="min-w-40 text-center text-section font-semibold">{monthName(month)}</h2>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => {
                goTo(shiftMonth(month, 1));
              }}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {month !== current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  goTo(current);
                }}
              >
                This month
              </Button>
            )}
          </div>
          <Chooser
            label="Show"
            showLabel
            hint="Which events the grid and the lists show. Each group is explained under How to read this."
            options={GROUP_OPTIONS}
            chosen={group}
            onChange={(key) => {
              write({ group: key === "all" ? null : key });
            }}
          />
        </div>
        {grid.error !== null ? (
          <Failed message={grid.error} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <CalendarMonth
              month={month}
              events={shown}
              today={today}
              selected={selected}
              onSelect={(day) => {
                write({ day: day === today ? null : day });
              }}
            />
            {/* On a wide screen the day's events fill the calendar's height and scroll within
                it, so a busy day never stretches the grid; on a phone, below the grid, they
                scroll within a fixed height. */}
            <div className="lg:relative">
              <div
                className="flex max-h-[28rem] flex-col gap-2 lg:absolute lg:inset-0 lg:max-h-none"
                aria-live="polite"
              >
                <h3 className="shrink-0 text-panel font-semibold">
                  {selected === null ? "Choose a day" : dayName(selected)}
                </h3>
                {selected !== null && shown !== null && (
                  <div
                    role="region"
                    aria-label={`Events on ${dayName(selected)}`}
                    tabIndex={0}
                    className="min-h-0 flex-1 overflow-y-auto rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <CalendarEventList
                      events={byImportance(eventsOn(shown, selected))}
                      empty="Nothing on this day."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section aria-label="What's next" className="space-y-3">
        <SectionHeader
          title="What's next"
          description={`The next ${String(NEXT_DAYS)} days, from today, whatever month the grid shows.`}
        />
        {next.error !== null ? (
          <Failed message={next.error} />
        ) : comingListed === null ? (
          <p className="text-sm text-muted-foreground">Reading the calendar...</p>
        ) : (
          <>
            {/* Its own scrolling box (the owner asked, 2026-10-17): two weeks of
                events would otherwise push the results season far down the page. */}
            <div
              role="region"
              aria-label="Events in the next two weeks"
              tabIndex={0}
              className="max-h-[32rem] overflow-y-auto rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <CalendarEventList
                events={comingListed}
                showDays
                empty="Nothing in the next two weeks."
              />
            </div>
            {comingCrowds.map((crowd) => (
              <p
                key={crowd.key}
                className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
              >
                {`${String(crowd.count)} ${crowd.count === 1 ? crowd.one : crowd.many} in these two weeks: counted here, not listed.`}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    write({ group: crowd.group });
                  }}
                >
                  {crowd.button}
                </Button>
              </p>
            ))}
          </>
        )}
      </section>

      {seasons.length > 0 && (
        <section aria-label="Results season" className="space-y-3">
          <SectionHeader
            title="Results season"
            description="SEBI's deadline for the quarter's results, and how many companies' results the platform holds so far."
          />
          {seasons.map((season) => (
            <ResultsSeasonPanel
              key={season.quarter_end}
              season={season}
              today={today}
              fetchedOn={grid.data?.results_fetched_on ?? null}
              declaring={declaring}
              noticesSince={next.data?.notices_read_since ?? null}
            />
          ))}
        </section>
      )}

      <ReadingGuide>
        <p>
          <strong>Confirmed or expected.</strong> A confirmed date is on its publisher's own
          calendar or in the exchange's own data. An expected one follows a convention or a
          published rule and is not yet announced: the Budget on 1 February, a release moved off a
          weekend, next year's Fed meetings, an offering's provisional dates. Expected events are in
          italics on the grid and marked in the lists.
        </p>
        {EVENT_GROUPS.map((one) => (
          <p key={one.key}>
            <strong>{one.label}.</strong> {one.description}
          </p>
        ))}
        <p>
          <strong>Expiries.</strong> NSE's index options expire on Tuesdays and BSE's on Thursdays,
          the month's on its last; a holiday moves an expiry to the trading day before. The days
          come from the contracts listed, so a change of rule arrives with them.
        </p>
        <p>
          <strong>Not here yet.</strong> The day each company announces its results, and upcoming
          dividends, bonuses and splits: only NSE and BSE publish them, NSE's terms forbid
          collecting them automatically, and BSE refuses the platform's requests.
        </p>
        <p>
          <strong>Times</strong> are India's. The policy and data dates are typed in from the RBI,
          MoSPI, the Office of the Economic Adviser, the US Fed and the US Bureau of Labor
          Statistics; each event links to where its date is published.
        </p>
      </ReadingGuide>
      {grid.data !== null && (
        <p className="text-xs text-muted-foreground">
          Hand-entered dates last checked against their publishers on{" "}
          {formatDay(grid.data.announced_checked_on)}.
        </p>
      )}
    </div>
  );
}
